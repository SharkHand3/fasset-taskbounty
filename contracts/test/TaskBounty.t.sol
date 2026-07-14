// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TaskBounty} from "../src/TaskBounty.sol";
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

    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward, string metadataURI);
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event WorkSubmitted(uint256 indexed taskId, address indexed worker, string resultURI);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward);
    event TaskCancelled(uint256 indexed taskId, address indexed creator, uint256 refund);

    function setUp() public {
        token = new MockERC20();
        bounty = new TaskBounty(token);

        token.mint(creator, INITIAL_BALANCE);

        vm.prank(creator);
        token.approve(address(bounty), type(uint256).max);
    }

    function test_CreateTaskEscrowsReward() public {
        vm.expectEmit(true, true, false, true);
        emit TaskCreated(1, creator, REWARD, TASK_URI);

        vm.prank(creator);
        uint256 taskId = bounty.createTask(REWARD, TASK_URI);

        TaskBounty.Task memory task = bounty.getTask(taskId);

        assertEq(taskId, 1);
        assertEq(task.creator, creator);
        assertEq(task.worker, address(0));
        assertEq(task.reward, REWARD);
        assertEq(task.metadataURI, TASK_URI);
        assertEq(uint256(task.status), uint256(TaskBounty.TaskStatus.Open));
        assertEq(token.balanceOf(address(bounty)), REWARD);
        assertEq(token.balanceOf(creator), INITIAL_BALANCE - REWARD);
        assertEq(bounty.nextTaskId(), 2);
    }

    function test_AcceptSubmitAndApprovePaysWorker() public {
        uint256 taskId = _createTask(REWARD);

        vm.expectEmit(true, true, false, true);
        emit TaskAccepted(taskId, worker);
        vm.prank(worker);
        bounty.acceptTask(taskId);

        vm.expectEmit(true, true, false, true);
        emit WorkSubmitted(taskId, worker, RESULT_URI);
        vm.prank(worker);
        bounty.submitWork(taskId, RESULT_URI);

        vm.expectEmit(true, true, false, true);
        emit TaskCompleted(taskId, worker, REWARD);
        vm.prank(creator);
        bounty.approveTask(taskId);

        TaskBounty.Task memory task = bounty.getTask(taskId);

        assertEq(task.worker, worker);
        assertEq(task.resultURI, RESULT_URI);
        assertEq(uint256(task.status), uint256(TaskBounty.TaskStatus.Completed));
        assertEq(token.balanceOf(worker), REWARD);
        assertEq(token.balanceOf(address(bounty)), 0);
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

    function testFuzz_CreateTaskEscrowsExactReward(uint96 rawReward) public {
        uint256 reward = bound(uint256(rawReward), 1, INITIAL_BALANCE);

        vm.prank(creator);
        uint256 taskId = bounty.createTask(reward, TASK_URI);

        TaskBounty.Task memory task = bounty.getTask(taskId);
        assertEq(task.reward, reward);
        assertEq(token.balanceOf(address(bounty)), reward);
    }

    function _createTask(uint256 reward) internal returns (uint256 taskId) {
        vm.prank(creator);
        taskId = bounty.createTask(reward, TASK_URI);
    }

    function _createSubmittedTask() internal returns (uint256 taskId) {
        taskId = _createTask(REWARD);

        vm.prank(worker);
        bounty.acceptTask(taskId);

        vm.prank(worker);
        bounty.submitWork(taskId, RESULT_URI);
    }
}

