const CCareTaker = artifacts.require("CCareTaker");
const MuseToken = artifacts.require("MuseToken");
const VNFT = artifacts.require("VNFT");

const { expectRevert } = require("@openzeppelin/test-helpers");

require("./utils");

const toWei = (amount) => web3.utils.toWei(String(amount));
const fromWei = (amount) => Number(web3.utils.fromWei(String(amount)));

contract("CCareTaker", ([operator, alice, bob, charlie]) => {
  let ccareTaker, muse, vNFT;

  before(async function () {
    muse = await MuseToken.new();
    vNFT = await VNFT.new(muse.address);
    ccareTaker = await CCareTaker.new(vNFT.address, muse.address);

    await muse.grantRole(
      "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
      vNFT.address
    );
  });

  describe("Initial Values", () => {
    it("should get correct contract addresses", async function () {
      const _vnft = await ccareTaker.vnftContract();
      assert.equal(_vnft, vNFT.address);

      const _muse = await ccareTaker.museToken();
      assert.equal(_muse, muse.address);
    });
  });

  describe("CCareTaker", () => {
    let IDS = [];

    before(async function () {
      // fund address with MUSE
      await muse.transfer(alice, toWei(100), { from: operator });

      // Mint 10 vNFTs
      for (let i = 0; i < 10; i++) {
        await vNFT.mint(alice, { from: operator });
        // await vNFT.addCareTaker(i, tools.address, { from: alice });
        IDS.push(i);
      }

      await vNFT.createItem("simple", 5, 100, 3 * 24 * 60 * 60);
    });

    it("should have muse and vnft tokens", async function () {
      const balance = await muse.balanceOf(alice);
      assert.equal(balance, toWei(100));

      const owner = await vNFT.ownerOf(0);
      assert.equal(owner, alice);
    });

    it("should be able to deposit single vnft", async function() {

      let vnftToDeposit = [];
      vnftToDeposit.push(0);

      const owner = await vNFT.ownerOf(0);
      assert.equal(owner, alice);
      await vNFT.approve(ccareTaker.address, 0, { from: alice });

      await ccareTaker.depositVnft(vnftToDeposit, {from: alice });

      const newOwner = await vNFT.ownerOf(0);
      const vnftToAddressOwner = await ccareTaker.vnftToAddress(0);
      const playerCount = await ccareTaker.playerVnftCount(alice);
      const vnftDeposited = await ccareTaker.vnftIsDepositedInContract(0);
      assert.equal(newOwner, ccareTaker.address);
      assert.equal(vnftToAddressOwner, alice);
      assert.equal(playerCount, 1);
      assert(vnftDeposited);
    });

    it("should be able to deposit multiple vnfts at once", async function() {

      let vnftsToDeposit = [];
      
      vnftsToDeposit.push(1);
      vnftsToDeposit.push(2);
      for (let i=1; i<3; i++) {
        const owner = await vNFT.ownerOf(i);
        assert.equal(owner, alice);
        await vNFT.approve(ccareTaker.address, i, { from: alice });
      }

      const oldPlayerVnftCount = parseInt(await ccareTaker.playerVnftCount(alice));

      //Deposit all the VNFTs at once 
      await ccareTaker.depositVnft(vnftsToDeposit, {from: alice });

      for (let i=1; i<3; i++) {
        const newOwner = await vNFT.ownerOf(i);
        const vnftToAddressOwner = await ccareTaker.vnftToAddress(i);
        const newPlayerVnftCount = parseInt(await ccareTaker.playerVnftCount(alice));
        const vnftDeposited = await ccareTaker.vnftIsDepositedInContract(i);
        assert.equal(newOwner, ccareTaker.address);
        assert.equal(vnftToAddressOwner, alice);
        assert.equal(oldPlayerVnftCount+2, newPlayerVnftCount);
        assert(vnftDeposited);
      }
    });
  });
});
