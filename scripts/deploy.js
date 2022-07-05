const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Loading accounts
  const accounts   = await ethers.getSigners();
  const addresses  = accounts.map((item) => item.address);
  const deployer   = addresses[0];

  // Loading contract factory.
  const NAPA721     = await ethers.getContractFactory("NAPA721");
  const NAPA1155    = await ethers.getContractFactory("NAPA1155");

  // Deploy contracts
  console.log("===================================================================================");
  console.log("DEPLOYING CONTRACTS");
  console.log("===================================================================================");

  // const nftChecker = await upgrades.deployProxy(NFTChecker);
  // await nftChecker.deployed();
  // console.log("NFTChecker                         deployed to:>>", nftChecker.address);
  // const nftCheckerVerify = await upgrades.erc1967.getImplementationAddress(nftChecker.address);
  // console.log("NFTChecker                         verify:>>", nftCheckerVerify);
  const barUri = "https://gateway.pinata.cloud/ipfs/QmfZpfLKeyYLtjuMPyecmsyVzTZSmHby4utjmeqcBoL4ty/";

  const napa721Args = ["NAPA Royalty Single Token", "NAPA", deployer, 1000];
  const napa721     = await NAPA721.deploy(...napa721Args);
  await napa721.deployed();
  console.log("NAPA721                   deployed to:>>", napa721.address);

  const napa1155Args = ["NAPA Royalty Multi Token", "NAPA", deployer, 1000];
  const napa1155     = await NAPA1155.deploy(...napa1155Args);
  await napa1155.deployed();
  console.log("NAPA1155                  deployed to:>>", napa1155.address);

  await napa721.setBaseURI(barUri);
  await napa1155.setBaseURI(barUri);

  console.log("===================================================================================");
  console.log("DONE");
  console.log("===================================================================================");

  const verifyArguments = {
    deployer    : deployer,
    napa721     : napa721.address,
    napa1155    : napa1155.address,
    napa721Args : napa721Args,
    napa1155Args: napa1155Args,
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
