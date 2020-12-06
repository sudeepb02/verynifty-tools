require("dotenv").config();

const Web3 = require("web3");

const HDWalletProvider = require("@truffle/hdwallet-provider");
const provider = new HDWalletProvider(
  process.env.PRIVATE_KEY,
  `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
);
const web3 = new Web3(provider);
const {abi} = require("../build/contracts/PersonalNiftyTools.json");
const instance = new web3.eth.Contract(abi, process.env.PERSONAL_TOOLS_ADDRESS);

const { gasStation } = require("../utils/axios");

// PARAMETERS
const TOKEN_IDS_FEED = [222,333];
const ITEM_TO_FEED = 2;
const GAS_PRICE_LIMIT = 150; // Max amount of gwei to pay
const ADDITIONAL_GAS = 100000; // Additional gas amount to send with tx

const execute = async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    const from = accounts[0];

    const gasData = await gasStation.get();
    const fastGasPrice = gasData.data.fast / 10;

    console.log("Gas Price:", fastGasPrice);

    if (fastGasPrice >= GAS_PRICE_LIMIT) return;

    let shouldBurnCHI = false;
    if(fastGasPrice >= 50) shouldBurnCHI=true;

    const tx = instance.methods
      .feedMultiple(TOKEN_IDS_FEED, Array(TOKEN_IDS_FEED.length)
      .fill(ITEM_TO_FEED), shouldBurnCHI);

    const gas = await tx.estimateGas({ from });
    console.log("Gas Estimated: ", gas);

    const _tx = await tx.send({
      from: user,
      gas: +gas + ADDITIONAL_GAS,
      gasPrice: fastGasPrice * 1e9,
    });

    console.log("Successful?", _tx.status);

    process.exit(0);
  } catch (error) {
    console.log(error.message);
  }
};

execute();
