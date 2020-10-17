const NiftyTools = artifacts.require("NiftyTools");

const VNFT_CONTRACT = "0x57f0B53926dd62f2E26bc40B30140AbEA474DA94";
const MUSE_TOKEN = "0xB6Ca7399B4F9CA56FC27cBfF44F4d2e4Eef1fc81";
const FEE_PERCENT = 100; // 1% = 100

module.exports = async function (deployer) {
  await deployer.deploy(NiftyTools, VNFT_CONTRACT, MUSE_TOKEN, FEE_PERCENT);
};
