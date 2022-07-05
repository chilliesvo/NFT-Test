const { ethers } = require("hardhat");
const { expect } = require("chai");
const { skipTime, blockTimestamp } = require("../utils");

const TEN_MINUTES = 600;
const ONE_DAY     = 86400;
const paymentFee  = ethers.utils.parseEther("0.2");
const deployFund  = ethers.utils.parseEther("3");
const ONE_ETHER   = ethers.utils.parseEther("1");

describe("Admin Create Project Case", async () => {
  beforeEach(async () => {
        const accounts = await ethers.getSigners();
        deployer   = accounts[0];
        superAdmin = accounts[1];
        admin      = accounts[2];
        controller = accounts[3]; 
        manager1   = accounts[4];
        manager2   = accounts[5];
        manager3   = accounts[6];
        manager4   = accounts[7];
        manager5   = accounts[8];
        user1      = accounts[9];
        user2      = accounts[10]; 
        user3      = accounts[11];
        user4      = accounts[12];
        user5      = accounts[13];
        author     = accounts[14];

        const NFTChecker = await ethers.getContractFactory("NFTChecker");
        nftChecker = await upgrades.deployProxy(NFTChecker);

        const Project = await ethers.getContractFactory("Project");
        project = await upgrades.deployProxy(Project, [superAdmin.address, nftChecker.address]);

        const Sale = await ethers.getContractFactory("Sale");
        sale = await upgrades.deployProxy(Sale, [nftChecker.address]);

        const Distribution = await ethers.getContractFactory("Distribution");
        distribution = await upgrades.deployProxy(Distribution, [project.address, sale.address]);

        OSB721 = await ethers.getContractFactory("OSB721");
        OSB1155 = await ethers.getContractFactory("OSB1155");

        const DeployPayment = await ethers.getContractFactory("DeployPayment");
        deployPayment = await upgrades.deployProxy(DeployPayment, [paymentFee, deployFund, superAdmin.address, deployer.address])

        await project.setContract(sale.address);
        await project.connect(superAdmin).addAdmins([admin.address]);
        await sale.setContracts(project.address, distribution.address);
        await expect(sale.connect(user1).setControllers([controller.address], true)).revertedWith("caller is not the admin");
        await sale.connect(admin).setControllers([controller.address], true);
  })

  it("Create project without token available", async () => {
    const isSingle = true;
    const isRaise  = true;
    const baseUri  = "ipfs://{CID}/";
		
    //** Deposit request deploy new token */ 
    await deployPayment.connect(admin).deposit(isSingle, "Token Single Of Admin", "SIN", { value: paymentFee });
		
    //** Deploy new token and set author with 10% royalty fee */ 
    const tokenSingle = await OSB721.deploy(admin.address, "Token Single Of Admin", "SIN", author.address, 1000);
		
    //** Using owner account of the token deployed and setting the controller for the token contract */
    await tokenSingle.connect(admin).addControllers([manager1.address]);
		
    //** Set address new token to user request */
    await deployPayment.connect(deployer).setTokenDeployedTo(1, tokenSingle.address);
		
    //** Create Project with new token deployed */ 
    await project.connect(admin).createProject(tokenSingle.address, isSingle, isRaise);
		
    //** Set manager for project */ 
    await project.connect(admin).setManager(1, manager1.address);
		
    //** Mint tokens */
    await tokenSingle.connect(manager1).mintBatch(baseUri, 5);
		
    expect(await tokenSingle.ownerOf(1)).to.equal(manager1.address);
    expect(await tokenSingle.ownerOf(2)).to.equal(manager1.address);
    expect(await tokenSingle.ownerOf(3)).to.equal(manager1.address);
    expect(await tokenSingle.ownerOf(4)).to.equal(manager1.address);
    expect(await tokenSingle.ownerOf(5)).to.equal(manager1.address);
		
    //** Approval all for sale contract */
    await tokenSingle.connect(manager1).setApprovalForAll(sale.address, true);
		
    //** Create sales */
    const beforeTokenIds    = [1, 2, 3, 4, 5];
    const beforeRaisePrices = [ONE_ETHER, ONE_ETHER, ONE_ETHER, ONE_ETHER, ONE_ETHER];
    await sale.connect(manager1).createRaiseSingle(1, beforeTokenIds, beforeRaisePrices, { value: 5e17.toString() });
		
    expect(await tokenSingle.ownerOf(1)).to.equal(sale.address);
    expect(await tokenSingle.ownerOf(2)).to.equal(sale.address);
    expect(await tokenSingle.ownerOf(3)).to.equal(sale.address);
    expect(await tokenSingle.ownerOf(4)).to.equal(sale.address);
    expect(await tokenSingle.ownerOf(5)).to.equal(sale.address);
		
    //** Set IDO */
    let timestamp         = await blockTimestamp();
    let joinStart         = timestamp + TEN_MINUTES;
    let joinEnd           = joinStart + ONE_DAY;
    let saleStart         = joinEnd   + TEN_MINUTES;
    let saleEnd           = saleStart + ONE_DAY;
    let distributionStart = saleEnd   + ONE_DAY;
    await project.connect(manager1).setIDO(1, joinStart, joinEnd, saleStart, saleEnd, distributionStart);
		
    //** Add winners */
    await sale.connect(controller).setWinners(1, [user1.address, user2.address, user3.address], true);
    await sale.connect(controller).setWinners(2, [user1.address, user2.address, user3.address], true);
    await sale.connect(controller).setWinners(3, [user1.address, user2.address, user3.address], true);
    await sale.connect(controller).setWinners(4, [user1.address, user2.address, user3.address], true);
    await sale.connect(controller).setWinners(5, [user1.address, user2.address, user3.address], true);
		
    //** Skip to start Sale */
    await skipTime(TEN_MINUTES + ONE_DAY + TEN_MINUTES);
		
    //** Buy Nfts with winners */
    await sale.connect(user1).bidSingle(1, { value: beforeRaisePrices[0] });
    await sale.connect(user2).bidSingle(2, { value: beforeRaisePrices[1] });
    await sale.connect(user3).bidSingle(3, { value: beforeRaisePrices[2] });
		
    expect(await tokenSingle.ownerOf(1)).to.equal(distribution.address);
    expect(await tokenSingle.ownerOf(2)).to.equal(distribution.address);
    expect(await tokenSingle.ownerOf(3)).to.equal(distribution.address);
		
    //** Skip to start Distribution */
    await skipTime(ONE_DAY * 2);
		
    //** Claim token when start Distribution */
    await distribution.connect(user1).claim(1);
    await distribution.connect(user2).claim(2);
    await distribution.connect(user3).claim(3);
		
    expect(await tokenSingle.ownerOf(1)).to.equal(user1.address);
    expect(await tokenSingle.ownerOf(2)).to.equal(user2.address);
    expect(await tokenSingle.ownerOf(3)).to.equal(user3.address);
		
    //** Close sale and get Nfts expire to manager account */
    await sale.connect(manager1).close(1, [4, 5]);
    expect(await tokenSingle.ownerOf(4)).to.equal(manager1.address);
    expect(await tokenSingle.ownerOf(5)).to.equal(manager1.address);
		
    //** End project */
    await project.connect(manager1).end(1);
		
    //** Resale Nfts expire */
    const afterTokenIds    = [4, 5];
    const afterRaisePrices = [ONE_ETHER, ONE_ETHER].map(ether => ether.toString());
    await sale.connect(manager1).createRaiseSingle(1, afterTokenIds, afterRaisePrices, { value: 5e17.toString() });
    expect(await tokenSingle.ownerOf(4)).to.equal(sale.address);
    expect(await tokenSingle.ownerOf(5)).to.equal(sale.address);
		
    //** Set IDO */
    timestamp         = await blockTimestamp();;
    joinStart         = timestamp + TEN_MINUTES;
    joinEnd           = joinStart + ONE_DAY;
    saleStart         = joinEnd   + TEN_MINUTES;
    saleEnd           = saleStart + ONE_DAY;
    distributionStart = saleEnd   + ONE_DAY;
    await project.connect(manager1).setIDO(1, joinStart, joinEnd, saleStart, saleEnd, distributionStart);
		
    //** Add winners */
    await sale.connect(controller).setWinners(6, [user4.address, user5.address], true);
    await sale.connect(controller).setWinners(7, [user4.address, user5.address], true);
		
    //** Skip to start Sale */
    await skipTime(TEN_MINUTES + ONE_DAY + TEN_MINUTES);
		
    //** Buy Nfts with winners */
    await sale.connect(user4).bidSingle(6, { value: afterRaisePrices[0] });
    await sale.connect(user5).bidSingle(7, { value: afterRaisePrices[1] });
		
    expect(await tokenSingle.ownerOf(4)).to.equal(distribution.address);
    expect(await tokenSingle.ownerOf(5)).to.equal(distribution.address);
		
    //** Skip to start Distribution */
    await skipTime(ONE_DAY * 2);
		
    //** Claim token when start Distribution */
    await distribution.connect(user4).claim(6);
    await distribution.connect(user5).claim(7);
		
    expect(await tokenSingle.ownerOf(4)).to.equal(user4.address);
    expect(await tokenSingle.ownerOf(5)).to.equal(user5.address);
  })
})