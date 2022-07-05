const hre = require("hardhat");
const contracts = require("../contracts.json");

async function main() {
  try {
    await hre.run("verify:verify", {
      address: contracts.osb721,
      constructorArguments: contracts.osb721Args,
    });
  } catch (err) {
    console.log("err :>> ", err);
  }

  try {
    await hre.run("verify:verify", {
      address: contracts.osb1155,
      constructorArguments: contracts.osb1155Args,
    });
  } catch (err) {
    console.log("err :>> ", err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
