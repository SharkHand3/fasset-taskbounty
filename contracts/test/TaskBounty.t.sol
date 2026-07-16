// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TaskBounty} from "../src/TaskBounty.sol";
import {FeeOnTransferMockERC20} from "./mocks/FeeOnTransferMockERC20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TaskBountyTest is Test {
    MockERC20 internal token;
    TaskBounty internal bounty;

    address internal creator = makeAddr("creator");
    address internal worker = makeAddr("worker");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant INITIAL_BALANCE = 1_000 ether;
    uint256 internal constant REWARD = 100 ether;
    string internal constant TASK_URI = "ipfs://task-metadata";
    string internal constant RESULT_URI = "ipfs://work-result";
    bytes32 internal taskHash;
    bytes32 internal resultHash;

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

    function setUp() public {
        token = new MockERC20();
        bounty = new TaskBounty(token);
        taskHash = keccak256(bytes("task-metadata-bytes"));
        resultHash = keccak256(bytes("work-result-bytes"));

        token.mint(creator, INITIAL_BALANCE);

        vm.prank(creator);
        token.approve(address(bounty), type(uint256).max);
    }

    function test_CreateTaskEscrowsReward() public {
        vm.expectEmit(true, true, true, true);
        emit TaskCreated(1, creator, taskHash, REWARD, TASK_URI);

        vm.prank(creator);
        uint256 taskId = bounty.createTask(REWARD, TASK_URI, taskHash);

        TaskBounty.Task memory task = bounty.getTask(taskId);

        assertEq(taskId, 1);
        assertEq(task.creator, creator);
        assertEq(task.worker, address(0));
        assertEq(task.reward, REWARD);
        assertEq(task.metadataURI, TASK_URI);
        assertEq(task.metadataHash, taskHash);
        assertEq(task.resultHash, bytes32(0));
        assertEq(uint256(task.status), uint256(TaskBounty.TaskStatus.Open));
        assertEq(token.balanceOf(address(bounty)), REWARD);
        assertEq(token.balanceOf(creator), INITIAL_BALANCE - REWARD);
        assertEq(bounty.nextTaskId(), 2);
        assertEq(bounty.totalEscrowed(), REWARD);
    }

    function test_AcceptSubmitAndApprovePaysWorker() public {
        uint256 taskId = _createTask(REWARD);

        vm.expectEmit(true, true, false, true);
        emit TaskAccepted(taskId, worker);
        vm.prank(worker);
        bounty.acceptTask(taskId);

        vm.expectEmit(true, true, true, true);
        emit WorkSubmitted(taskId, worker, resultHash, RESULT_URI);
        vm.prank(worker);
        bounty.submitWork(taskId, RESULT_URI, resultHash);

        vm.expectEmit(true, true, false, true);
        emit TaskCompleted(taskId, worker, REWARD);
        vm.prank(creator);
        bounty.approveTask(taskId);

        TaskBounty.Task memory task = bounty.getTask(taskId);

        assertEq(task.worker, worker);
        assertEq(task.resultURI, RESULT_URI);
        assertEq(task.metadataHash, taskHash);
        assertEq(task.resultHash, resultHash);
        assertEq(uint256(task.status), uint256(TaskBounty.TaskStatus.Completed));
        assertEq(token.balanceOf(worker), REWARD);
        assertEq(token.balanceOf(address(bounty)), 0);
        assertEq(bounty.totalEscrowed(), 0);
    }

    function test_CancelOpenTaskRefundsCreator() public {
        uint256 taskId = _createTask(REWARD);

        vm.expectEmit(true, true, false, true);
        emit TaskCancelled(taskId, creator, REWARD);
        vm.prank(creator);
        bounty.cancelTask(taskId);

        TaskBounty.Task memory task = bounty.getTask(taskId);

        assertEq(uint256(task.status), uint256(TaskBounty.TaskStatus.Cancelled));
        assertEq(token.balanceOf(creator), INITIAL_BALANCE);
        assertEq(token.balanceOf(address(bounty)), 0);
        assertEq(bounty.totalEscrowed(), 0);
    }

    function test_RevertWhenNonCreatorApproves() public {
        uint256 taskId = _createSubmittedTask();

        vm.expectRevert(abi.encodeWithSelector(TaskBounty.Unauthorized.selector, stranger));
        vm.prank(stranger);
        bounty.approveTask(taskId);
    }

    function test_RevertWhenCreatorAcceptsOwnTask() public {
        uint256 taskId = _createTask(REWARD);

        vm.expectRevert(TaskBounty.CreatorCannotAcceptOwnTask.selector);
        vm.prank(creator);
        bounty.acceptTask(taskId);
    }

    function test_RevertWhenSecondWorkerAcceptsTakenTask() public {
        uint256 taskId = _createTask(REWARD);

        vm.prank(worker);
        bounty.acceptTask(taskId);

        vm.expectRevert(
            abi.encodeWithSelector(
                TaskBounty.InvalidTaskStatus.selector,
                taskId,
                TaskBounty.TaskStatus.Open,
                TaskBounty.TaskStatus.InProgress
            )
        );
        vm.prank(stranger);
        bounty.acceptTask(taskId);
    }

    function test_RevertWhenMetadataHashIsEmpty() public {
        vm.expectRevert(TaskBounty.EmptyContentHash.selector);
        vm.prank(creator);
        bounty.createTask(REWARD, TASK_URI, bytes32(0));
    }

    function test_RevertWhenResultHashIsEmpty() public {
        uint256 taskId = _createTask(REWARD);

        vm.prank(worker);
        bounty.acceptTask(taskId);

        vm.expectRevert(TaskBounty.EmptyContentHash.selector);
        vm.prank(worker);
        bounty.submitWork(taskId, RESULT_URI, bytes32(0));
    }

    function test_RevertWhenTokenUnderfundsEscrow() public {
        FeeOnTransferMockERC20 feeToken = new FeeOnTransferMockERC20();
        TaskBounty feeBounty = new TaskBounty(feeToken);
        feeToken.mint(creator, REWARD);

        vm.prank(creator);
        feeToken.approve(address(feeBounty), REWARD);

        uint256 received = REWARD - (REWARD / 100);
        vm.expectRevert(abi.encodeWithSelector(TaskBounty.UnexpectedEscrowAmount.selector, REWARD, received));
        vm.prank(creator);
        feeBounty.createTask(REWARD, TASK_URI, taskHash);

        assertEq(feeToken.balanceOf(creator), REWARD);
        assertEq(feeToken.balanceOf(address(feeBounty)), 0);
        assertEq(feeBounty.totalEscrowed(), 0);
        assertEq(feeBounty.nextTaskId(), 1);
    }

    function test_TotalEscrowedTracksMultipleTasks() public {
        uint256 firstTaskId = _createTask(REWARD);
        uint256 secondReward = REWARD / 2;
        uint256 secondTaskId = _createTask(secondReward);

        assertEq(bounty.totalEscrowed(), REWARD + secondReward);
        assertEq(token.balanceOf(address(bounty)), REWARD + secondReward);

        vm.prank(worker);
        bounty.acceptTask(firstTaskId);
        vm.prank(worker);
        bounty.submitWork(firstTaskId, RESULT_URI, resultHash);
        vm.prank(creator);
        bounty.approveTask(firstTaskId);

        assertEq(bounty.totalEscrowed(), secondReward);
        assertEq(token.balanceOf(address(bounty)), secondReward);

        vm.prank(creator);
        bounty.cancelTask(secondTaskId);

        assertEq(bounty.totalEscrowed(), 0);
        assertEq(token.balanceOf(address(bounty)), 0);
        assertEq(token.balanceOf(worker), REWARD);
        assertEq(token.balanceOf(creator), INITIAL_BALANCE - REWARD);
    }

    function testFuzz_CreateTaskEscrowsExactReward(uint96 rawReward) public {
        uint256 reward = bound(uint256(rawReward), 1, INITIAL_BALANCE);

        vm.prank(creator);
        uint256 taskId = bounty.createTask(reward, TASK_URI, taskHash);

        TaskBounty.Task memory task = bounty.getTask(taskId);
        assertEq(task.reward, reward);
        assertEq(token.balanceOf(address(bounty)), reward);
        assertEq(bounty.totalEscrowed(), reward);
    }

    function _createTask(uint256 reward) internal returns (uint256 taskId) {
        vm.prank(creator);
        taskId = bounty.createTask(reward, TASK_URI, taskHash);
    }

    function _createSubmittedTask() internal returns (uint256 taskId) {
        taskId = _createTask(REWARD);

        vm.prank(worker);
        bounty.acceptTask(taskId);

        vm.prank(worker);
        bounty.submitWork(taskId, RESULT_URI, resultHash);
    }
}
