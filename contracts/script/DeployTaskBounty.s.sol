// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {TaskBounty} from "../src/TaskBounty.sol";

/// @notice Deploys TaskBounty with Coston2 FTestXRP as the reward token.
contract DeployTaskBounty is Script {
    uint256 internal constant COSTON2_CHAIN_ID = 114;

    // Official Coston2 FXRP token address documented by Flare.
    // Its ERC-20 symbol on Coston2 is FTestXRP.
    address internal constant COSTON2_FXRP = 0x0b6A3645c240605887a5532109323A3E12273dc7;

    function run() external returns (TaskBounty taskBounty) {
        require(block.chainid == COSTON2_CHAIN_ID, "DeployTaskBounty: wrong chain");

        // The environment variable is optional and lets us override the
        // address if Flare redeploys the token on the public testnet.
        address rewardToken = vm.envOr("FXRP_ADDRESS", COSTON2_FXRP);

        vm.startBroadcast();
        taskBounty = new TaskBounty(IERC20(rewardToken));
        vm.stopBroadcast();

        console2.log("TaskBounty:", address(taskBounty));
        console2.log("Reward token:", rewardToken);
        console2.log("Chain ID:", block.chainid);
    }
}
