// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../NiftyTools.sol";

contract V2 is NiftyTools {
    uint256 public newVariable;

    function setNewVariable(uint256 newValue) public {
        newVariable = newValue;
    }

    // Update function to charge fee
    function withdrawMuse() external override {
        uint256 toWithdraw = museBalance[msg.sender];
        require(toWithdraw > 0, "ZERO BALANCE");

        museBalance[msg.sender] = 0;

        uint256 fee = toWithdraw.mul(1).div(100);

        // Send muse fee to recipient
        require(muse.transfer(feeRecipient, fee));

        // Send muse to user
        require(muse.transfer(msg.sender, toWithdraw.sub(fee)));
    }
}
