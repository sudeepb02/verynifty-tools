pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
}

contract NiftyTools is Ownable {
    using SafeMath for uint256;

    IVNFT vnft;
    IERC20 muse;
    uint256 maxIds = 20;
    uint256 fee;

    constructor(
        IVNFT _vnft,
        IERC20 _muse,
        uint256 _fee
    ) public {
        vnft = _vnft;
        muse = _muse;
        fee = _fee;
    }

    function setVNFT(IVNFT _vnft) public onlyOwner {
        vnft = _vnft;
    }

    function setMaxIds(uint256 _maxIds) public onlyOwner {
        maxIds = _maxIds;
    }

    function claimMultiple(uint256[] memory ids) external {
        require(ids.length <= maxIds, "Too many ids");

        for (uint256 i = 0; i < ids.length; i++) {
            vnft.claimMiningRewards(ids[i]);
        }

        // Charge fees
        uint256 museFee = muse.balanceOf(address(this)).mul(fee).div(10000);
        require(muse.transfer(owner(), museFee));

        // Send rest to user
        require(muse.transfer(msg.sender, muse.balanceOf(address(this))));
    }

    function _checkAmount(uint256[] memory _itemIds)
        internal
        returns (uint256 totalAmt)
    {
        for (uint256 i = 0; i < _itemIds.length; i++) {
            totalAmt = totalAmt.add(vnft.itemPrice(_itemIds[i]));
        }
    }

    function feedMultiple(uint256[] memory ids, uint256[] memory itemIds)
        external
    {
        require(ids.length <= maxIds, "Too many ids");
        uint256 totalMuse = _checkAmount(itemIds);
        require(
            totalMuse <= muse.allowance(msg.sender, address(this)),
            "Insufficient MUSE"
        );

        for (uint256 i = 0; i < ids.length; i++) {
            vnft.buyAccesory(ids[i], itemIds[i]);
        }
    }
}
