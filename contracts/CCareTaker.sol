// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVNFT {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function buyAccesory(uint256 nftId, uint256 itemId) external;
    function claimMiningRewards(uint256 nftId) external;
    function ownerOf(uint256 _tokenId) external view returns (address _owner);
    function itemPrice(uint256 itemId) external view returns (uint256 _amount);
}

contract CCareTaker is Ownable {
    using SafeMath for uint256;

    IVNFT public vnftContract;
    IERC20 public museToken;
    bool paused;
    uint256 public playerShare = 5000;     //in basis points i.e 50%

    uint256[] public depositedVnftArray;

    mapping(uint256 => address) public vnftToAddress;
    mapping(address => uint256)  public playerVnftCount;
    mapping(uint256 => bool) public vnftIsDepositedInContract;

    constructor(
        IVNFT _vnft,
        IERC20 _muse
    ) public {
        vnftContract = _vnft;
        museToken = _muse;
    }

    modifier notPaused() {
        require(!paused, "PAUSED");
        _;
    }

    function depositVnft(uint256[] calldata _vnftIds) external {
        for (uint256 i = 0; i < _vnftIds.length; i++) {
            uint256 vnftToDeposit = _vnftIds[i];
            require(msg.sender == vnftContract.ownerOf(vnftToDeposit), "You must own the VNFT to deposit");
            
            vnftContract.transferFrom(msg.sender, address(this), vnftToDeposit);
            vnftToAddress[vnftToDeposit] = msg.sender;
            playerVnftCount[msg.sender]++;
            vnftIsDepositedInContract[vnftToDeposit] = true;
        }
    }

/*
****************************************************
 OWNER FUNCTIONS
****************************************************
*/
    function setVNFT(IVNFT _vnft) public onlyOwner {
        vnftContract = _vnft;
    }

    function setPlayerShare(uint256 shareInBasisPoints) public onlyOwner {
        playerShare = shareInBasisPoints;
    }

    function setPause(bool _paused) public onlyOwner {
        paused = _paused;
    }
}
