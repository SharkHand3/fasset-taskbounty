// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FAsset TaskBounty
/// @notice Escrows one ERC-20 compatible FAsset as payment for off-chain work.
/// @dev The first network target is FTestXRP on Flare Testnet Coston2.
contract TaskBounty is ReentrancyGuard {
    using SafeERC20 for IERC20;

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
        string resultURI;
        TaskStatus status;
        bool exists;
    }

    error ZeroTokenAddress();
    error InvalidReward();
    error EmptyURI();
    error TaskNotFound(uint256 taskId);
    error Unauthorized(address caller);
    error CreatorCannotAcceptOwnTask();
    error InvalidTaskStatus(uint256 taskId, TaskStatus expected, TaskStatus actual);

    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward, string metadataURI);
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event WorkSubmitted(uint256 indexed taskId, address indexed worker, string resultURI);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward);
    event TaskCancelled(uint256 indexed taskId, address indexed creator, uint256 refund);

    /// @notice The FAsset/ERC-20 token held in escrow by this deployment.
    IERC20 public immutable rewardToken;

    /// @notice The identifier that will be assigned to the next task.
    uint256 public nextTaskId = 1;

    mapping(uint256 => Task) private tasks;

    /// @param rewardToken_ The token accepted as the reward for every task.
    constructor(IERC20 rewardToken_) {
        if (address(rewardToken_) == address(0)) revert ZeroTokenAddress();
        rewardToken = rewardToken_;
    }

    /// @notice Creates a task and transfers its full reward into escrow.
    /// @param reward Amount of reward tokens deposited into the contract.
    /// @param metadataURI URI of a JSON document describing the task.
    /// @return taskId Identifier assigned to the new task.
    function createTask(uint256 reward, string calldata metadataURI) external nonReentrant returns (uint256 taskId) {
        if (reward == 0) revert InvalidReward();
        if (bytes(metadataURI).length == 0) revert EmptyURI();

        taskId = nextTaskId;
        nextTaskId = taskId + 1;

        tasks[taskId] = Task({
            creator: msg.sender,
            worker: address(0),
            reward: reward,
            metadataURI: metadataURI,
            resultURI: "",
            status: TaskStatus.Open,
            exists: true
        });

        // The token contract is an external call. If it fails, the complete
        // transaction reverts, including the task state written above.
        rewardToken.safeTransferFrom(msg.sender, address(this), reward);

        emit TaskCreated(taskId, msg.sender, reward, metadataURI);
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

    /// @notice Submits the URI of the completed work.
    function submitWork(uint256 taskId, string calldata resultURI) external {
        Task storage task = _getTask(taskId);
        _requireStatus(taskId, task, TaskStatus.InProgress);
        if (msg.sender != task.worker) revert Unauthorized(msg.sender);
        if (bytes(resultURI).length == 0) revert EmptyURI();

        task.resultURI = resultURI;
        task.status = TaskStatus.Submitted;

        emit WorkSubmitted(taskId, msg.sender, resultURI);
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
}

