const { ethers } = require("hardhat");
const { expect } = require("chai");
const { ZERO_ADDRESS } = require("./utils");

const baseUri = "ipfs://";

describe("OSB1155", () => {
  beforeEach(async () => {
      const accounts = await ethers.getSigners();
      admin = accounts[0];
      user1 = accounts[1];
      user2 = accounts[2];
      user3 = accounts[3];
      const OSB1155 = await ethers.getContractFactory("OSB1155");
      token = await OSB1155.deploy(admin.address, "Multi Token", "MUL", ZERO_ADDRESS, 0);
  });

  it("setController", async () => {
      expect(await token.controllers(user1.address)).to.equal(false);
      await expect(token.connect(user1).addControllers([user1.address])).to.revertedWith("caller is not the owner");
      await token.connect(admin).addControllers([user1.address]);
      expect(await token.controllers(user1.address)).to.equal(true);
  })

  it("removeController", async () => {
    expect(await token.controllers(user1.address)).to.equal(false);
      await expect(token.connect(user1).addControllers([user1.address])).to.revertedWith("caller is not the owner");
      await token.connect(admin).addControllers([user1.address]);
      expect(await token.controllers(user1.address)).to.equal(true);
      await expect(token.connect(user1).removeControllers([user1.address])).to.revertedWith("caller is not the owner");
      await token.connect(admin).removeControllers([user1.address]);
      expect(await token.controllers(user1.address)).to.equal(false);
  })

  it("setBaseUri", async () => {
      expect(await token.baseURI()).to.equal("");
      await token.connect(admin).addControllers([user1.address]);
      await expect(token.connect(user2).setBaseURI(baseUri)).to.revertedWith("caller is not the owner or controller");
      await token.connect(admin).setBaseURI(baseUri)
      expect(await token.baseURI()).to.equal(baseUri);
      await token.connect(user1).setBaseURI("ipfs://.json")
      expect(await token.baseURI()).to.equal("ipfs://.json");
  })

  it("mintBatch", async() => {
      await token.connect(admin).addControllers([user1.address]);
      expect(await token.balanceOf(admin.address, 1)).to.equal(0);
      expect(await token.balanceOf(admin.address, 2)).to.equal(0);
      expect(await token.balanceOf(user1.address, 3)).to.equal(0);
      expect(await token.balanceOf(user1.address, 4)).to.equal(0);
      await expect(token.connect(user2).mintBatch(baseUri, [100, 200])).to.revertedWith("caller is not the owner or controller");
      await expect(token.connect(user3).mintBatch(baseUri, [100, 200])).to.revertedWith("caller is not the owner or controller");
      await token.connect(admin).mintBatch(baseUri, [100, 200]);
      await token.connect(user1).mintBatch(baseUri, [300, 400]);
      expect(await token.baseURI()).to.equal(baseUri);
      expect(await token.balanceOf(admin.address, 1)).to.equal(100);
      expect(await token.balanceOf(admin.address, 2)).to.equal(200);
      expect(await token.balanceOf(user1.address, 3)).to.equal(300);
      expect(await token.balanceOf(user1.address, 4)).to.equal(400);
  })
});
