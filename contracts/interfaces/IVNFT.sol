// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

interface IVNFT {
    function fatality(uint256 _deadId, uint256 _tokenId) external;

    function buyAccesory(uint256 nftId, uint256 itemId) external;

    function claimMiningRewards(uint256 nftId) external;

    function addCareTaker(uint256 _tokenId, address _careTaker) external;

    function careTaker(uint256 _tokenId, address _user)
        external
        view
        returns (address _careTaker);

    function ownerOf(uint256 _tokenId) external view returns (address _owner);

    function itemPrice(uint256 itemId) external view returns (uint256 _amount);

    function setApprovalForAll(address operator, bool approved) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}
