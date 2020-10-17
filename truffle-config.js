const HDWalletProvider = require("@truffle/hdwallet-provider");
require("dotenv").config();

const providerFactory = (network) =>
  new HDWalletProvider(
    process.env.PRIVATE_KEY,
    `https://${network}.infura.io/v3/${process.env.INFURA_KEY}`
  );

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8546,
      network_id: 999,
    },
    mainnet: {
      provider: () => providerFactory("mainnet"),
      network_id: 1,
      gasPrice: 20e9,
      gas: 5e5,
    },
  },
  compilers: {
    solc: {
      version: "0.6.10",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
