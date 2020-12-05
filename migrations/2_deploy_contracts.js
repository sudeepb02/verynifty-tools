const NiftyTools = artifacts.require("NiftyTools");
const ChiToken = artifacts.require("ChiToken");
const GasFeed = artifacts.require("GasFeed");
const MuseToken = artifacts.require("MuseToken");
const VNFT = artifacts.require("VNFT");

const MUSE_FEE = 5000; //  5% fee

const infinite = String(
  web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1))
);

module.exports = async function (deployer, network) {
  if (network === "ganache") {
    await deployer.deploy(ChiToken);
    await deployer.deploy(GasFeed);
    await deployer.deploy(MuseToken);
    await deployer.deploy(VNFT, MuseToken.address);
    await deployer.deploy(
      NiftyTools,
      VNFT.address,
      MuseToken.address,
      ChiToken.address,
      GasFeed.address,
      MUSE_FEE
    );
  }

  if (network === "mainnet") {
    const VNFT_CONTRACT = "0x57f0B53926dd62f2E26bc40B30140AbEA474DA94";
    const MUSE_TOKEN = "0xB6Ca7399B4F9CA56FC27cBfF44F4d2e4Eef1fc81";
    const CHI_TOKEN = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
    const GAS_FEED = "0xA417221ef64b1549575C977764E651c9FAB50141";
    await deployer.deploy(
      NiftyTools,
      VNFT_CONTRACT,
      MUSE_TOKEN,
      CHI_TOKEN,
      GAS_FEED,
      MUSE_FEE
    );
  }

  // Approve spending of MUSE to VNFT
  const tools = await NiftyTools.deployed();
  await tools.approveMuse(infinite);
};
