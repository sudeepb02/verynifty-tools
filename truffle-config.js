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
      port: 8545,
      network_id: 666,
    },
    mainnet: {
      provider: () => providerFactory("mainnet"),
      network_id: 1,
      gasPrice: 25e9,
      gas: 2e6,
    },
    remote: {
      provider() {
        return new HDWalletProvider(
          process.env.MNEMONICS,
          process.env.NODE_URL,
          0,
          2
        );
      },
      network_id: 666,
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
