const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const args = [];
  const basicNFT = await deploy("BasicNFT", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
    await verify(basicNFT.address, args);
  }

  log("-------------------------------------------");
};

module.exports.tags = ["all", "basicnft"];
