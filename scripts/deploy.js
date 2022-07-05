const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Loading accounts
  const accounts   = await ethers.getSigners();
  const addresses  = accounts.map((item) => item.address);
  const deployer   = addresses[0];
  const paymentFee = ethers.utils.parseEther("0.001");
  const deployFund = ethers.utils.parseEther("2");

  // Loading contract factory.
  const OSB721     = await ethers.getContractFactory("OSB721");
  const OSB1155    = await ethers.getContractFactory("OSB1155");

  // Deploy contracts
  console.log("==================================================================");
  console.log("DEPLOYING CONTRACTS");
  console.log("==================================================================");

  const nftChecker = await upgrades.deployProxy(NFTChecker);
  await nftChecker.deployed();
  console.log("NFTChecker                         deployed to:>>", nftChecker.address);
  const nftCheckerVerify = await upgrades.erc1967.getImplementationAddress(nftChecker.address);
  console.log("NFTChecker                         verify:>>", nftCheckerVerify);

  const osb721Args = [deployer, "OSB Single Token", "OSB", deployer, 1000];
  const osb721     = await OSB721.deploy(...osb721Args);
  await osb721.deployed();
  console.log("OSB721                             deployed to:>>", osb721.address);

  const osb1155Args = [deployer, "OSB Multi Token", "OSB", deployer, 1000];
  const osb1155     = await OSB1155.deploy(...osb1155Args);
  await osb1155.deployed();
  console.log("OSB1155                            deployed to:>>", osb1155.address);

  console.log("==================================================================");
  console.log("DONE");
  console.log("==================================================================");

  const verifyArguments = {
    deployer     : deployer,
    osb721       : osb721.address,
    osb1155      : osb1155.address,
    osb721Args   : osb721Args,
    osb1155Args  : osb1155Args,
  };

  await fs.writeFileSync("contracts.json", JSON.stringify(verifyArguments));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
