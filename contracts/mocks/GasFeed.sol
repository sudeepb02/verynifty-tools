// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract GasFeed {
    int256 currentGasPrice = 70e9;

    function latestAnswer() public view returns (int256) {
        return currentGasPrice;
    }

    function updateGasPrice(int256 newGasPrice) public {
        currentGasPrice = newGasPrice;
    }
}
