const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const V2 = artifacts.require("V2");

const NiftyTools = artifacts.require("NiftyTools");
const MuseToken = artifacts.require("MuseToken");
const VNFT = artifacts.require("VNFT");
const ChiToken = artifacts.require("ChiToken");
const GasFeed = artifacts.require("GasFeed");

const { expectRevert } = require("@openzeppelin/test-helpers");

const MUSE_FEE = 5000; //  5% MUSE per service

contract("NiftyTools", ([operator, alice, admin, random]) => {
  let tools, muse, vNFT, proxy;

  before(async function () {
    muse = await MuseToken.new();
    vNFT = await VNFT.new(muse.address);
    chi = await ChiToken.new();
    gasFeed = await GasFeed.new();
    implementation = await NiftyTools.new();

    const encoded = implementation.contract.methods.initialize(
      vNFT.address,
      muse.address,
      chi.address,
      gasFeed.address,
      MUSE_FEE).encodeABI();

    await muse.grantRole(
      "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
      vNFT.address
    );

    proxy = await AdminUpgradeabilityProxy.new(
      implementation.address,
      admin,
      encoded
    );

    tools = await NiftyTools.at(proxy.address)
  });

  describe("Initial Values of V1", () => {
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

  describe("Upgrade to V2", () => {
    it("should be able to upgrade to a new version", async function () {
      const v2 = await V2.new();

      // Only Proxy admin can upgrade
      await expectRevert.unspecified(proxy.upgradeTo(v2.address, {from:random}));

      await proxy.upgradeTo(v2.address, {from:admin});
      tools = await V2.at(proxy.address)
    });

    it("should maintain the v1 storage", async function () {
      const _vnft = await tools.vnft();
      assert.equal(_vnft, vNFT.address);

      const _muse = await tools.muse();
      assert.equal(_muse, muse.address);

      const _fee = await tools.fee();
      assert.equal(_fee, MUSE_FEE);

      const _maxIds = await tools.maxIds();
      assert.equal(_maxIds, 20);
    });

    it("should have access to the new variable", async function () {
      await tools.setNewVariable(10);

      const newVariable = await tools.newVariable();
      assert.equal(newVariable, 10);
    });

    it("should pay fee in the new withdraw function", async function () {
      await muse.transfer(alice, 100, {from:operator});

      const initialBalance = await muse.balanceOf(alice);

      await muse.approve(tools.address,100, {from:alice});
      await tools.depositMuse(100, {from:alice});
      await tools.withdrawMuse({from:alice});

      const finalBalance = await muse.balanceOf(alice);
      assert.equal(finalBalance, initialBalance-1); // 1% fee
    });
  });
});
