const { ethers } = require("hardhat");
const { expect } = require("chai");

const baseUri = "ipfs://";

describe("OSB721", () => {
  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    admin = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
    owner = accounts[4];
    const OSB721 = await ethers.getContractFactory("OSB721");
    token = await OSB721.deploy(owner.address, "Single Token", "SIN", owner.address, 1000);
  });

  it("setController", async () => {
    expect(await token.controllers(user1.address)).to.equal(false);
    await expect(token.connect(user1).addControllers([user1.address])).to.revertedWith("caller is not the owner");
    await token.connect(owner).addControllers([user1.address]);
    expect(await token.controllers(user1.address)).to.equal(true);
  })

  it("removeController", async () => {
    expect(await token.controllers(user1.address)).to.equal(false);
    await expect(token.connect(user1).addControllers([user1.address])).to.revertedWith("caller is not the owner");
    await token.connect(owner).addControllers([user1.address]);
    expect(await token.controllers(user1.address)).to.equal(true);
    await expect(token.connect(user1).removeControllers([user1.address])).to.revertedWith("caller is not the owner");
    await token.connect(owner).removeControllers([user1.address]);
    expect(await token.controllers(user1.address)).to.equal(false);
  })

  it("setBaseUri", async () => {
    expect(await token.baseURI()).to.equal("");
    await token.connect(owner).addControllers([user1.address]);
    await expect(token.connect(user2).setBaseURI(baseUri)).to.revertedWith("Caller is not the owner or controller");
    await token.connect(owner).setBaseURI(baseUri)
    expect(await token.baseURI()).to.equal(baseUri);
    await token.connect(user1).setBaseURI("ipfs://.json")
    expect(await token.baseURI()).to.equal("ipfs://.json");
  })

  it("mintBatch", async() => {
    await token.connect(owner).addControllers([user1.address]);
    expect(await token.balanceOf(owner.address)).to.equal(0);
    expect(await token.balanceOf(user1.address)).to.equal(0);
    await expect(token.connect(user2).mintBatch(baseUri, 5)).to.revertedWith("Caller is not the owner or controller");
    await expect(token.connect(user3).mintBatch(baseUri, 10)).to.revertedWith("Caller is not the owner or controller");
    await token.connect(owner).mintBatch(baseUri, 5);
    await token.connect(user1).mintBatch(baseUri, 10);
    expect(await token.baseURI()).to.equal(baseUri);
    expect(await token.balanceOf(owner.address)).to.equal(5);
    expect(await token.balanceOf(user1.address)).to.equal(10);
  })
});
