// Loading env configs for deploying and public contract source
require("dotenv").config();

// Solidity compile
require("solidity-coverage");

// Using hardhat-ethers plugin for deploying
// See here: https://hardhat.org/plugins/nomiclabs-hardhat-ethers.html
//           https://hardhat.org/guides/deploying.html
require("@nomiclabs/hardhat-ethers");

// Testing plugins with Waffle
// See here: https://hardhat.org/guides/waffle-testing.html
require("@nomiclabs/hardhat-waffle");

// This plugin runs solhint on the project's sources and prints the report
// See here: https://hardhat.org/plugins/nomiclabs-hardhat-solhint.html
require("@nomiclabs/hardhat-solhint");

// Verify and public source code on etherscan
require("@nomiclabs/hardhat-etherscan");

require("@openzeppelin/hardhat-upgrades");

// Report gas
require("hardhat-gas-reporter");

// Expose internal functions for smart contract testing
require("hardhat-exposed");

const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: { count: 20 },
    },
    binance_testnet: {
      url: process.env.BINANCE_URL,
      accounts: [process.env.DEPLOY_ACCOUNT],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL,
      accounts: [process.env.DEPLOY_ACCOUNT],
    },
    mumbai: {
      url: `${process.env.MUMBAI_URL}${process.env.INFURA_KEY}`,
      accounts: [process.env.DEPLOY_ACCOUNT],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "deploy",
    deployments: "deployments",
  },
  mocha: {
    timeout: 200000,
    useColors: true,
    reporter: "mocha-multi-reporters",
    reporterOptions: {
      configFile: "./mocha-report.json",
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    token: "BNB",
    gasPrice: 30,
    coinmarketcap: process.env.COIN_MARKET_API,
  },
  exposed: { prefix: "$" },
};

module.exports = config;
