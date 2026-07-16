// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FeeOnTransferMockERC20 is ERC20 {
    uint256 internal constant FEE_BPS = 100;
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    address internal constant FEE_COLLECTOR = address(0xFEE);

    constructor() ERC20("Fee-on-transfer Mock", "FEE") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * FEE_BPS) / BPS_DENOMINATOR;
        super._update(from, FEE_COLLECTOR, fee);
        super._update(from, to, value - fee);
    }
}
