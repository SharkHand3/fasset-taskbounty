// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FAsset TaskBounty
/// @notice Escrows one ERC-20 compatible FAsset as payment for off-chain work.
/// @dev V2 binds task and result URIs to Keccak-256 content hashes. The first
/// network target is FTestXRP on Flare Testnet Coston2.
/// @custom:version 2.0.0
contract TaskBounty is ReentrancyGuard {
    using SafeERC20 for IERC20;

    string public constant VERSION = "2.0.0";

    /// @notice The lifecycle status of a task.
    enum TaskStatus {
        Open,
        InProgress,
        Submitted,
        Completed,
        Cancelled
    }

    /// @notice All on-chain information associated with one task.
    struct Task {
        address creator;
        address worker;
        uint256 reward;
        string metadataURI;
        bytes32 metadataHash;
        string resultURI;
        bytes32 resultHash;
        TaskStatus status;
        bool exists;
    }

    error ZeroTokenAddress();
    error InvalidReward();
    error EmptyURI();
    error EmptyContentHash();
    error UnexpectedEscrowAmount(uint256 expected, uint256 received);
    error TaskNotFound(uint256 taskId);
    error Unauthorized(address caller);
    error CreatorCannotAcceptOwnTask();
    error InvalidTaskStatus(uint256 taskId, TaskStatus expected, TaskStatus actual);

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        bytes32 indexed metadataHash,
        uint256 reward,
        string metadataURI
    );
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event WorkSubmitted(uint256 indexed taskId, address indexed worker, bytes32 indexed resultHash, string resultURI);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward);
    event TaskCancelled(uint256 indexed taskId, address indexed creator, uint256 refund);

    /// @notice The FAsset/ERC-20 token held in escrow by this deployment.
    IERC20 public immutable rewardToken;

    /// @notice The identifier that will be assigned to the next task.
    uint256 public nextTaskId = 1;

    /// @notice Total reward-token amount owed to all non-finalized tasks.
    uint256 public totalEscrowed;

    mapping(uint256 => Task) private tasks;

    /// @param rewardToken_ The token accepted as the reward for every task.
    constructor(IERC20 rewardToken_) {
        if (address(rewardToken_) == address(0)) revert ZeroTokenAddress();
        rewardToken = rewardToken_;
    }

    /// @notice Creates a task and transfers its full reward into escrow.
    /// @param reward Amount of reward tokens deposited into the contract.
    /// @param metadataURI URI of a document describing the task.
    /// @param metadataHash Keccak-256 hash of the exact document bytes.
    /// @return taskId Identifier assigned to the new task.
    function createTask(uint256 reward, string calldata metadataURI, bytes32 metadataHash)
        external
        nonReentrant
        returns (uint256 taskId)
    {
        if (reward == 0) revert InvalidReward();
        _validateArtifact(metadataURI, metadataHash);

        // Only tokens that deliver the exact requested amount are supported.
        // This prevents fee-on-transfer tokens from underfunding the escrow.
        uint256 balanceBefore = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), reward);
        uint256 balanceAfter = rewardToken.balanceOf(address(this));
        uint256 received = balanceAfter >= balanceBefore ? balanceAfter - balanceBefore : 0;
        if (received != reward) revert UnexpectedEscrowAmount(reward, received);

        taskId = nextTaskId;
        nextTaskId = taskId + 1;

        tasks[taskId] = Task({
            creator: msg.sender,
            worker: address(0),
            reward: reward,
            metadataURI: metadataURI,
            metadataHash: metadataHash,
            resultURI: "",
            resultHash: bytes32(0),
            status: TaskStatus.Open,
            exists: true
        });

        totalEscrowed += reward;

        emit TaskCreated(taskId, msg.sender, metadataHash, reward, metadataURI);
    }

    /// @notice Accepts an open task on behalf of the caller.
    function acceptTask(uint256 taskId) external {
        Task storage task = _getTask(taskId);
        _requireStatus(taskId, task, TaskStatus.Open);
        if (msg.sender == task.creator) revert CreatorCannotAcceptOwnTask();

        task.worker = msg.sender;
        task.status = TaskStatus.InProgress;

        emit TaskAccepted(taskId, msg.sender);
    }

    /// @notice Submits an immutable commitment to the completed work.
    /// @param taskId Identifier of the accepted task.
    /// @param resultURI Content-addressed or version-pinned result document URI.
    /// @param resultHash Keccak-256 hash of the exact result document bytes.
    function submitWork(uint256 taskId, string calldata resultURI, bytes32 resultHash) external {
        Task storage task = _getTask(taskId);
        _requireStatus(taskId, task, TaskStatus.InProgress);
        if (msg.sender != task.worker) revert Unauthorized(msg.sender);
        _validateArtifact(resultURI, resultHash);

        task.resultURI = resultURI;
        task.resultHash = resultHash;
        task.status = TaskStatus.Submitted;

        emit WorkSubmitted(taskId, msg.sender, resultHash, resultURI);
    }

    /// @notice Approves submitted work and pays the escrowed reward.
    function approveTask(uint256 taskId) external nonReentrant {
        Task storage task = _getTask(taskId);
        _requireStatus(taskId, task, TaskStatus.Submitted);
        if (msg.sender != task.creator) revert Unauthorized(msg.sender);

        address worker = task.worker;
        uint256 reward = task.reward;

        // Checks and effects are completed before the external token transfer.
        task.status = TaskStatus.Completed;
        totalEscrowed -= reward;

        rewardToken.safeTransfer(worker, reward);

        emit TaskCompleted(taskId, worker, reward);
    }

    /// @notice Cancels an unaccepted task and refunds its creator.
    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage task = _getTask(taskId);
        _requireStatus(taskId, task, TaskStatus.Open);
        if (msg.sender != task.creator) revert Unauthorized(msg.sender);

        uint256 refund = task.reward;
        task.status = TaskStatus.Cancelled;
        totalEscrowed -= refund;

        rewardToken.safeTransfer(task.creator, refund);

        emit TaskCancelled(taskId, task.creator, refund);
    }

    /// @notice Returns a task or reverts when the ID does not exist.
    function getTask(uint256 taskId) external view returns (Task memory) {
        Task storage task = _getTask(taskId);
        return task;
    }

    function _getTask(uint256 taskId) internal view returns (Task storage task) {
        task = tasks[taskId];
        if (!task.exists) revert TaskNotFound(taskId);
    }

    function _requireStatus(uint256 taskId, Task storage task, TaskStatus expected) internal view {
        if (task.status != expected) {
            revert InvalidTaskStatus(taskId, expected, task.status);
        }
    }

    function _validateArtifact(string calldata uri, bytes32 contentHash) internal pure {
        if (bytes(uri).length == 0) revert EmptyURI();
        if (contentHash == bytes32(0)) revert EmptyContentHash();
    }
}
