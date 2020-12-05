const NiftyTools = artifacts.require("NiftyTools");
const MuseToken = artifacts.require("MuseToken");
const VNFT = artifacts.require("VNFT");
const ChiToken = artifacts.require("ChiToken");
const GasFeed = artifacts.require("GasFeed");

const { expectRevert, constants, time } = require("@openzeppelin/test-helpers");

const MUSE_FEE = 5000; //  5% MUSE per service
const INITIAL_AMOUNT = 200;
const toWei = (amount) => web3.utils.toWei(String(amount));
const fromWei = (amount) => Number(web3.utils.fromWei(String(amount)));

contract("NiftyTools", ([operator, alice, bob, charlie]) => {
  let tools, muse, vNFT;

  before(async function () {
    muse = await MuseToken.new();
    vNFT = await VNFT.new(muse.address);
    chi = await ChiToken.new();
    gasFeed = await GasFeed.new();
    tools = await NiftyTools.new(
      vNFT.address,
      muse.address,
      chi.address,
      gasFeed.address,
      MUSE_FEE
    );

    await muse.grantRole(
      "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
      vNFT.address
    );
  });

  describe("Initial Values", () => {
    it("should get correct contract addresses", async function () {
      const _vnft = await tools.vnft();
      assert.equal(_vnft, vNFT.address);

      const _muse = await tools.muse();
      assert.equal(_muse, muse.address);
    });

    it("should get correct fee", async function () {
      const _fee = await tools.fee();
      assert.equal(_fee, MUSE_FEE);
    });

    it("should get correct maxIds", async function () {
      const _maxIds = await tools.maxIds();
      assert.equal(_maxIds, 20);
    });
  });

  describe("Tools", () => {
    let IDS = [];

    before(async function () {
      // fund address with MUSE
      await muse.transfer(alice, toWei(INITIAL_AMOUNT), { from: operator });

      // mint CHI tokens
      await chi.mint(150, { from: alice });

      // Mint 10 vNFTs
      for (let i = 0; i < 10; i++) {
        await vNFT.mint(alice, { from: operator });
        await vNFT.addCareTaker(i, tools.address, { from: alice });
        IDS.push(i);
      }

      await vNFT.createItem("simple", 5, 100, 3 * 24 * 60 * 60);

      // Approve big amount so we save gas when buying items
      await tools.approveMuse(toWei("1000000"));
    });

    it("should have muse, vnft and chi tokens", async function () {
      const balance = await muse.balanceOf(alice);
      assert.equal(balance, toWei(INITIAL_AMOUNT));

      const chiBalance = await chi.balanceOf(alice);
      assert.equal(chiBalance, 150);

      const owner = await vNFT.ownerOf(0);
      assert.equal(owner, alice);
    });

    it("should get correct available rewards to claim", async function () {
      // await advanceTimeAndBlock(25 * 60 * 60); // 25h later

      await time.advanceBlock();
      await time.increase(25 * 60 * 60);

      for (let i = 0; i < IDS.length; i++) {
        const rewards = await vNFT.getRewards(i);
        assert.equal(rewards, toWei(6));
      }
    });

    it("should be able to claim mining rewards from multiple tokens", async function () {
      const initialBalance = await muse.balanceOf(alice);
      const initialOperatorBalance = await muse.balanceOf(operator);
      await tools.claimMultiple(IDS, { from: alice });
      const finalBalance = await muse.balanceOf(alice);

      assert.equal(
        fromWei(finalBalance),
        fromWei(initialBalance) + 60 * (1 - 0.05)
      ); // 10*6 -5% fee

      const toolsBalance = await muse.balanceOf(tools.address);
      assert.equal(toolsBalance, 0);

      const finalOperatorBalance = await muse.balanceOf(operator);
      assert.equal(
        fromWei(finalOperatorBalance) - fromWei(initialOperatorBalance),
        60 * 0.05
      );
    });

    it("should be able to feed multiple tokens", async function () {
      await muse.approve(tools.address, constants.MAX_UINT256, { from: alice });

      const initialBalance = await muse.balanceOf(alice);
      const initialOperatorBalance = await muse.balanceOf(operator);
      await tools.feedMultiple(IDS, Array(10).fill(1), { from: alice });
      const finalBalance = await muse.balanceOf(alice);

      assert.equal(
        fromWei(finalBalance),
        fromWei(initialBalance) - 50 * (1 + 0.05)
      ); // 10*5 -5% fee

      const toolsBalance = await muse.balanceOf(tools.address);
      assert.equal(toolsBalance, 0);

      const finalOperatorBalance = await muse.balanceOf(operator);
      assert.equal(
        fromWei(finalOperatorBalance),
        fromWei(initialOperatorBalance) + 50 * 0.05
      );
    });
  });
});
