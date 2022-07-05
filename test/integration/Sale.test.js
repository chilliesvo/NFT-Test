const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { blockTimestamp, setTime } = require("../utils");

const TEN_MINUTES = 600;
const ONE_DAY = 86400;
const baseUri = "ipfs://";

describe("Sale Integration", () => {
  before(async () => {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    superAdmin = accounts[1];
    controller = accounts[2];
    admin = accounts[3];
    user1 = accounts[4];
    user2 = accounts[5];
    user3 = accounts[6];
    user4 = accounts[7];
    user5 = accounts[8];
    user6 = accounts[9];
    user7 = accounts[10];
    manager1 = accounts[11];
    manager2 = accounts[12];
    manager3 = accounts[13];
    manager4 = accounts[14];

    const NFTChecker = await ethers.getContractFactory("NFTChecker");
    nftChecker = await upgrades.deployProxy(NFTChecker);

    const Project = await ethers.getContractFactory("Project");
    project = await upgrades.deployProxy(Project, [
      superAdmin.address,
      nftChecker.address,
    ]);

    const Sale = await ethers.getContractFactory("Sale");
    sale = await upgrades.deployProxy(Sale, [nftChecker.address]);

    OSB721 = await ethers.getContractFactory("OSB721");
    OSB1155 = await ethers.getContractFactory("OSB1155");

    const Distribution = await ethers.getContractFactory("Distribution");
    distribution = await upgrades.deployProxy(Distribution, [
      project.address,
      sale.address,
    ]);

    await project.setContract(sale.address);
    await project.connect(superAdmin).addAdmins([admin.address]);
    await sale.setContracts(project.address, distribution.address);
    await sale.connect(admin).setControllers([controller.address], true);

    WEIGHT_DECIMAL = await project.WEIGHT_DECIMAL();
    ONE_ETHER = ethers.utils.parseEther("1");
    TWO_ETHER = ethers.utils.parseEther("2");

    CASH_0_1 = ethers.utils.parseEther("0.1");
    CASH_0_2 = ethers.utils.parseEther("0.2");

    CASH_00_1 = ethers.utils.parseEther("0.01");
    CASH_00_2 = ethers.utils.parseEther("0.02");
  });

  describe("1. Create project single => Create sale raise => Bid => Distribution success", () => {
    before(async () => {
      const isSingle = true;
      const isRaise = true;

      osb721Project1 = await OSB721.deploy(
        admin.address,
        "single token 1",
        "SIN1",
        admin.address,
        1000
      );

      await project
        .connect(admin)
        .createProject(osb721Project1.address, isSingle, isRaise);
      let project_lastedId = await project.lastedId();
      await project
        .connect(admin)
        .setManager(project_lastedId, manager1.address);

      await project
        .connect(superAdmin)
        .createProject(osb721Project1.address, isSingle, isRaise);
      project_lastedId = await project.lastedId();
      await project
        .connect(admin)
        .setManager(project_lastedId, manager2.address);

      const timestamp = await blockTimestamp();
      joinStart = timestamp + TEN_MINUTES;
      joinEnd = joinStart + ONE_DAY;
      saleStart = joinEnd + TEN_MINUTES;
      saleEnd = saleStart + ONE_DAY;
      distributionStart = saleEnd + ONE_DAY;

      raisePrices_sale_1 = [
        ONE_ETHER,
        TWO_ETHER,
        ONE_ETHER,
        ONE_ETHER,
        ONE_ETHER,
        ONE_ETHER,
      ];

      raisePrices_sale_2 = [ONE_ETHER, TWO_ETHER, ONE_ETHER];
    });

    it("createRaiseSingle", async () => {
      await osb721Project1
        .connect(admin)
        .addControllers([manager1.address, manager2.address]);
      await osb721Project1.connect(manager1).mintBatch(baseUri, 6);
      await osb721Project1.connect(manager2).mintBatch(baseUri, 3);
      await osb721Project1
        .connect(manager1)
        .setApprovalForAll(sale.address, true);
      await osb721Project1
        .connect(manager2)
        .setApprovalForAll(sale.address, true);
      const tokenIds = [1, 2, 3, 4, 5, 6];

      const tokenIds_sale_2 = [7, 8, 9];

      await sale
        .connect(manager1)
        .createRaiseSingle(1, tokenIds, raisePrices_sale_1);
      await sale
        .connect(manager2)
        .createRaiseSingle(2, tokenIds_sale_2, raisePrices_sale_2);

      expect(await osb721Project1.balanceOf(sale.address)).to.equal(
        raisePrices_sale_1.length + raisePrices_sale_2.length
      );
      expect(await sale.lastedId()).to.equal(
        raisePrices_sale_1.length + raisePrices_sale_2.length
      );
    });

    it("setIDO success", async () => {
      await project
        .connect(manager1)
        .setIDO(1, joinStart, joinEnd, saleStart, saleEnd, distributionStart);

      await project
        .connect(manager2)
        .setIDO(2, joinStart, joinEnd, saleStart, saleEnd, distributionStart);
    });

    it("bid success for sale 1", async () => {
      await setTime(Number(saleStart));

      for (let i = 0; i < raisePrices_sale_1.length; i++) {
        const sales_id = i + 1;

        await sale
          .connect(controller)
          .setWinners(sales_id, [user1.address], true);

        const _saleInfo = await sale.getSale(sales_id);
        const _projectInfo = await project.getProject(_saleInfo.projectId);

        const royaltyInfo = await sale.getRoyaltyInfo(
          _saleInfo.projectId,
          _saleInfo.tokenId,
          raisePrices_sale_1[i]
        );
        let royaltyProfit = royaltyInfo[1];
        let sellerProfit = 0;
        let supperAdminProfit = 0;

        if (_projectInfo.isCreatedByAdmin) {
          supperAdminProfit = raisePrices_sale_1[i].sub(royaltyInfo[1]);
        } else {
          let approval = await project.getApproval(_projectInfo.id);
          percentAdminFee = approval.percent;

          supperAdminProfit = raisePrices_sale_1[i]
            .mul(approval.percent)
            .div(WEIGHT_DECIMAL.mul(100));

          sellerProfit = raisePrices_sale_1[i].sub(supperAdminProfit);
          if (royaltyInfo[1] > sellerProfit) royaltyProfit = sellerProfit;

          sellerProfit = sellerProfit.sub(royaltyProfit);
        }

        const project_manager1 = await project.getManager(_projectInfo.id);
        expect(manager1.address).to.equals(project_manager1);

        const project_super_admin = await project.getSuperAdmin();
        expect(superAdmin.address).to.equals(project_super_admin);

        await expect(() =>
          sale
            .connect(user1)
            .bidSingle(sales_id, { value: raisePrices_sale_1[i] })
        ).to.changeEtherBalances(
          [sale, manager1, superAdmin, admin, user1],
          [
            0,
            sellerProfit,
            supperAdminProfit,
            royaltyProfit,
            raisePrices_sale_1[i].mul(-1),
          ],
          "Incorrect balances of contract and user1"
        );
      }
    });

    it("bid success for sale 2", async () => {
      for (let i = 0; i < raisePrices_sale_2.length; i++) {
        const sales_id = raisePrices_sale_1.length + i + 1;

        await sale
          .connect(controller)
          .setWinners(sales_id, [user1.address], true);

        const _saleInfo = await sale.getSale(sales_id);
        const _projectInfo = await project.getProject(_saleInfo.projectId);

        const royaltyInfo = await sale.getRoyaltyInfo(
          _saleInfo.projectId,
          _saleInfo.tokenId,
          raisePrices_sale_2[i]
        );
        let royaltyProfit = royaltyInfo[1];
        let sellerProfit = 0;
        let supperAdminProfit = 0;

        if (_projectInfo.isCreatedByAdmin) {
          supperAdminProfit = raisePrices_sale_2[i].sub(royaltyInfo[1]);
        } else {
          let approval = await project.getApproval(_projectInfo.id);
          percentAdminFee = approval.percent;

          supperAdminProfit = raisePrices_sale_2[i]
            .mul(approval.percent)
            .div(WEIGHT_DECIMAL.mul(100));

          sellerProfit = raisePrices_sale_2[i].sub(supperAdminProfit);
          if (royaltyInfo[1] > sellerProfit) royaltyProfit = sellerProfit;

          sellerProfit = sellerProfit.sub(royaltyProfit);
        }

        const project_manager1 = await project.getManager(_projectInfo.id);
        expect(manager2.address).to.equals(project_manager1);

        const project_super_admin = await project.getSuperAdmin();
        expect(superAdmin.address).to.equals(project_super_admin);

        await expect(() =>
          sale
            .connect(user1)
            .bidSingle(sales_id, { value: raisePrices_sale_2[i] })
        ).to.changeEtherBalances(
          [sale, manager2, superAdmin, admin, user1],
          [
            0,
            0,
            supperAdminProfit,
            royaltyProfit,
            raisePrices_sale_2[i].mul(-1),
          ],
          "Incorrect balances of contract and user1"
        );
      }
    });

    it("distribution success", async () => {
      await setTime(distributionStart);

      for (let i = 0; i < raisePrices_sale_1.length; i++) {
        await expect(() =>
          distribution.connect(user1).claim(i + 1)
        ).to.changeTokenBalances(
          osb721Project1,
          [distribution, user1],
          [-1, 1],
          "Incorrect balances of distribution and user1"
        );
      }

      for (let i = 0; i < raisePrices_sale_2.length; i++) {
        await expect(() =>
          distribution.connect(user1).claim(raisePrices_sale_1.length + i + 1)
        ).to.changeTokenBalances(
          osb721Project1,
          [distribution, user1],
          [-1, 1],
          "Incorrect balances of distribution and user1"
        );
      }
    });
  });

  describe("2. Create project multi => Create sale raise => Bid => Distribution success", () => {
    before(async () => {
      const isSingle = false;
      const isRaise = true;

      osb1155Project3 = await OSB1155.deploy(
        admin.address,
        "multi token 1",
        "MUL1",
        admin.address,
        1000
      );

      await project
        .connect(admin)
        .createProject(osb1155Project3.address, isSingle, isRaise);

      project_lastedId = await project.lastedId();
      await project
        .connect(admin)
        .setManager(project_lastedId, manager3.address);

      const timestamp = await blockTimestamp();
      joinStart = timestamp + TEN_MINUTES;
      joinEnd = joinStart + ONE_DAY;
      saleStart = joinEnd + TEN_MINUTES;
      saleEnd = saleStart + ONE_DAY;
      distributionStart = saleEnd + ONE_DAY;

      amounts = [50, 20, 30, 40, 10, 333];
      raisePrices = [
        ONE_ETHER,
        TWO_ETHER,
        ONE_ETHER,
        ONE_ETHER,
        TWO_ETHER,
        ONE_ETHER,
      ];
      sale_lastedId = await sale.lastedId();
    });

    it("createRaiseMulti", async () => {
      await osb1155Project3.connect(admin).addControllers([manager3.address]);
      await osb1155Project3.connect(manager3).mintBatch(baseUri, amounts);
      await osb1155Project3
        .connect(manager3)
        .setApprovalForAll(sale.address, true);
      const tokenIds = [1, 2, 3, 4, 5, 6];

      await sale
        .connect(manager3)
        .createRaiseMulti(project_lastedId, tokenIds, amounts, raisePrices);

      for (let i = 0; i < tokenIds.length; i++) {
        expect(
          await osb1155Project3.balanceOf(sale.address, tokenIds[i])
        ).to.equal(amounts[i]);
      }

      expect(await sale.lastedId()).to.equal(sale_lastedId.add(amounts.length));
    });

    it("setIDO success", async () => {
      await project
        .connect(manager3)
        .setIDO(
          project_lastedId,
          joinStart,
          joinEnd,
          saleStart,
          saleEnd,
          distributionStart
        );
    });

    it("bid multi success for sale", async () => {
      await setTime(Number(saleStart));
      for (let i = 0; i < raisePrices.length; i++) {
        let sales_id = sale_lastedId.add(i + 1);

        await sale
          .connect(controller)
          .setWinners(sales_id, [user1.address], true);

        const _saleInfo = await sale.getSale(sales_id);
        const _projectInfo = await project.getProject(_saleInfo.projectId);
        const _amount = raisePrices[i].mul(amounts[i]);
        const royaltyInfo = await sale.getRoyaltyInfo(
          _saleInfo.projectId,
          _saleInfo.tokenId,
          _amount
        );
        let royaltyProfit = royaltyInfo[1];
        let sellerProfit = 0;
        let supperAdminProfit = 0;

        if (_projectInfo.isCreatedByAdmin) {
          supperAdminProfit = _amount.sub(royaltyProfit);
        } else {
          let approval = await project.getApproval(_projectInfo.id);
          percentAdminFee = approval.percent;

          supperAdminProfit = _amount
            .mul(approval.percent)
            .div(WEIGHT_DECIMAL.mul(100));

          sellerProfit = _amount.sub(supperAdminProfit);
          if (royaltyProfit > sellerProfit) royaltyProfit = sellerProfit;

          sellerProfit = sellerProfit.sub(royaltyProfit);
        }

        const project_manager_3 = await project.getManager(_projectInfo.id);
        expect(manager3.address).to.equals(project_manager_3);

        const project_super_admin = await project.getSuperAdmin();
        expect(superAdmin.address).to.equals(project_super_admin);

        await expect(() =>
          sale.connect(user1).bidMulti(sales_id, amounts[i], { value: _amount })
        ).to.changeEtherBalances(
          [sale, manager3, superAdmin, admin, user1],
          [
            0,
            sellerProfit,
            supperAdminProfit,
            royaltyProfit,
            raisePrices[i].mul(amounts[i]).mul(-1),
          ],
          "Incorrect balances of contract and user"
        );
      }
    });

    it("distribution success", async () => {
      await setTime(distributionStart);

      for (let i = 0; i < amounts.length; i++) {
        const balance_before = await osb1155Project3.balanceOf(
          distribution.address,
          i + 1
        );
        const balance_user_before = await osb1155Project3.balanceOf(
          user1.address,
          i + 1
        );
        await distribution.connect(user1).claim(sale_lastedId.add(i + 1));

        const balance_after = await osb1155Project3.balanceOf(
          distribution.address,
          i + 1
        );
        const balance_user_after = await osb1155Project3.balanceOf(
          user1.address,
          i + 1
        );

        expect(balance_user_after.sub(balance_user_before)).to.equals(
          balance_before.sub(balance_after)
        );
      }
    });
  });

  describe("3. Create project single => Create sale dutch => Bid => Distribution success", () => {
    before(async () => {
      const isSingle = true;
      const isRaise = false;

      osb721Project1 = await OSB721.deploy(
        admin.address,
        "single token 1",
        "SIN1",
        admin.address,
        1000
      );

      await project
        .connect(admin)
        .createProject(osb721Project1.address, isSingle, isRaise);
      project_lastedId = await project.lastedId();
      await project
        .connect(admin)
        .setManager(project_lastedId, manager1.address);

      const timestamp = await blockTimestamp();
      joinStart = timestamp + TEN_MINUTES;
      joinEnd = joinStart + ONE_DAY;
      saleStart = joinEnd + TEN_MINUTES;
      saleEnd = saleStart + ONE_DAY;
      distributionStart = saleEnd + ONE_DAY;

      dutchMaxPrices = [ONE_ETHER, TWO_ETHER, ONE_ETHER];
      dutchMinPrices = [CASH_0_1, CASH_0_2, CASH_0_1]; //[0.1, 0.2, 0.1] ether
      priceDecrementAmts = [CASH_00_1, CASH_00_2, CASH_00_1]; //[0.01, 0.02, 0.01] ether
      sale_lastedId = await sale.lastedId();
    });

    it("createDutchSingle", async () => {
      await osb721Project1
        .connect(admin)
        .addControllers([manager1.address, manager2.address]);
      await osb721Project1.connect(manager1).mintBatch(baseUri, 3);
      await osb721Project1
        .connect(manager1)
        .setApprovalForAll(sale.address, true);
      const tokenIds = [1, 2, 3];

      await sale
        .connect(manager1)
        .createDutchSingle(
          project_lastedId,
          tokenIds,
          dutchMaxPrices,
          dutchMinPrices,
          priceDecrementAmts
        );

      expect(await osb721Project1.balanceOf(sale.address)).to.equal(
        dutchMaxPrices.length
      );
      expect(await sale.lastedId()).to.equal(
        sale_lastedId.add(dutchMaxPrices.length)
      );
    });

    it("setIDO success", async () => {
      await project
        .connect(manager1)
        .setIDO(
          project_lastedId,
          joinStart,
          joinEnd,
          saleStart,
          saleEnd,
          distributionStart
        );
    });

    it("bid success for sale", async () => {
      await setTime(Number(saleStart + 43200));

      for (let i = 0; i < dutchMaxPrices.length; i++) {
        const sales_id = sale_lastedId.add(i + 1);
        const _currentDutchPrice = await sale.currentDutchPrice(sales_id);
        const _residualPrice = dutchMaxPrices[i].sub(_currentDutchPrice);

        await sale
          .connect(controller)
          .setWinners(sales_id, [user1.address], true);

        const _saleInfo = await sale.getSale(sales_id);
        const _projectInfo = await project.getProject(_saleInfo.projectId);

        const royaltyInfo = await sale.getRoyaltyInfo(
          _saleInfo.projectId,
          _saleInfo.tokenId,
          _currentDutchPrice
        );
        let royaltyProfit = royaltyInfo[1];
        let sellerProfit = 0;
        let supperAdminProfit = 0;

        if (_projectInfo.isCreatedByAdmin) {
          supperAdminProfit = _currentDutchPrice.sub(royaltyInfo[1]);
        } else {
          let approval = await project.getApproval(_projectInfo.id);
          percentAdminFee = approval.percent;

          supperAdminProfit = _currentDutchPrice
            .mul(approval.percent)
            .div(WEIGHT_DECIMAL.mul(100));

          sellerProfit = _currentDutchPrice.sub(supperAdminProfit);
          if (royaltyInfo[1] > sellerProfit) royaltyProfit = sellerProfit;

          sellerProfit = sellerProfit.sub(royaltyProfit);
        }

        supperAdminProfit = supperAdminProfit.add(_residualPrice);

        const project_manager1 = await project.getManager(_projectInfo.id);
        expect(manager1.address).to.equals(project_manager1);

        const project_super_admin = await project.getSuperAdmin();
        expect(superAdmin.address).to.equals(project_super_admin);

        await expect(() =>
          sale.connect(user1).bidSingle(sales_id, { value: dutchMaxPrices[i] })
        ).to.changeEtherBalances(
          [sale, manager1, superAdmin, admin, user1],
          [
            0,
            sellerProfit,
            supperAdminProfit,
            royaltyProfit,
            dutchMaxPrices[i].mul(-1),
          ],
          "Incorrect balances of contract and user1"
        );
      }
    });

    it("distribution success", async () => {
      await setTime(distributionStart);

      for (let i = 0; i < dutchMaxPrices.length; i++) {
        await expect(() =>
          distribution.connect(user1).claim(sale_lastedId.add(i + 1))
        ).to.changeTokenBalances(
          osb721Project1,
          [distribution, user1],
          [-1, 1],
          "Incorrect balances of distribution and user1"
        );
      }
    });
  });

  describe("4. Create project multi => Create sale dutch => Bid => Distribution success", () => {
    before(async () => {
      const isSingle = false;
      const isRaise = false;

      osb1155Project3 = await OSB1155.deploy(
        admin.address,
        "multi token 1",
        "MUL1",
        admin.address,
        1000
      );

      await project
        .connect(admin)
        .createProject(osb1155Project3.address, isSingle, isRaise);

      project_lastedId = await project.lastedId();
      await project
        .connect(admin)
        .setManager(project_lastedId, manager3.address);

      const timestamp = await blockTimestamp();
      joinStart = timestamp + TEN_MINUTES;
      joinEnd = joinStart + ONE_DAY;
      saleStart = joinEnd + TEN_MINUTES;
      saleEnd = saleStart + ONE_DAY;
      distributionStart = saleEnd + ONE_DAY;

      amounts = [50, 20, 30];
      dutchMaxPrices = [ONE_ETHER, TWO_ETHER, ONE_ETHER];
      dutchMinPrices = [CASH_0_1, CASH_0_2, CASH_0_1]; //[0.1, 0.2, 0.1] ether
      priceDecrementAmts = [CASH_00_1, CASH_00_2, CASH_00_1]; //[0.01, 0.02, 0.01] ether
      sale_lastedId = await sale.lastedId();
    });

    it("createDutchMulti", async () => {
      await osb1155Project3.connect(admin).addControllers([manager3.address]);
      await osb1155Project3.connect(manager3).mintBatch(baseUri, amounts);
      await osb1155Project3
        .connect(manager3)
        .setApprovalForAll(sale.address, true);
      const tokenIds = [1, 2, 3];

      await sale
        .connect(manager3)
        .createDutchMulti(
          project_lastedId,
          tokenIds,
          amounts,
          dutchMaxPrices,
          dutchMinPrices,
          priceDecrementAmts
        );

      for (let i = 0; i < tokenIds.length; i++) {
        expect(
          await osb1155Project3.balanceOf(sale.address, tokenIds[i])
        ).to.equal(amounts[i]);
      }

      expect(await sale.lastedId()).to.equal(sale_lastedId.add(amounts.length));
    });

    it("setIDO success", async () => {
      await project
        .connect(manager3)
        .setIDO(
          project_lastedId,
          joinStart,
          joinEnd,
          saleStart,
          saleEnd,
          distributionStart
        );
    });

    it("bid multi success for sale", async () => {
      await setTime(Number(saleStart + 43200));
      for (let i = 0; i < amounts.length; i++) {
        let sales_id = sale_lastedId.add(i + 1);
        const _currentDutchPrice = await sale.currentDutchPrice(sales_id);
        const _amount = _currentDutchPrice.mul(amounts[i]);
        const _residualPrice = dutchMaxPrices[i].mul(amounts[i]).sub(_amount);

        await sale
          .connect(controller)
          .setWinners(sales_id, [user1.address], true);

        const _saleInfo = await sale.getSale(sales_id);
        const _projectInfo = await project.getProject(_saleInfo.projectId);

        const royaltyInfo = await sale.getRoyaltyInfo(
          _saleInfo.projectId,
          _saleInfo.tokenId,
          _amount
        );
        let royaltyProfit = royaltyInfo[1];
        let sellerProfit = 0;
        let supperAdminProfit = 0;

        if (_projectInfo.isCreatedByAdmin) {
          supperAdminProfit = _amount.sub(royaltyProfit);
        } else {
          let approval = await project.getApproval(_projectInfo.id);
          percentAdminFee = approval.percent;

          supperAdminProfit = _amount
            .mul(approval.percent)
            .div(WEIGHT_DECIMAL.mul(100));

          sellerProfit = _amount.sub(supperAdminProfit);
          if (royaltyProfit > sellerProfit) royaltyProfit = sellerProfit;

          sellerProfit = sellerProfit.sub(royaltyProfit);
        }

        supperAdminProfit = supperAdminProfit.add(_residualPrice);

        const project_manager_3 = await project.getManager(_projectInfo.id);
        expect(manager3.address).to.equals(project_manager_3);

        const project_super_admin = await project.getSuperAdmin();
        expect(superAdmin.address).to.equals(project_super_admin);

        await expect(() =>
          sale.connect(user1).bidMulti(sales_id, amounts[i], {
            value: dutchMaxPrices[i].mul(amounts[i]),
          })
        ).to.changeEtherBalances(
          [sale, manager3, superAdmin, admin, user1],
          [
            0,
            sellerProfit,
            supperAdminProfit,
            royaltyProfit,
            dutchMaxPrices[i].mul(amounts[i]).mul(-1),
          ],
          "Incorrect balances of contract and user"
        );
      }
    });

    it("distribution success", async () => {
      await setTime(distributionStart);

      for (let i = 0; i < amounts.length; i++) {
        const balance_before = await osb1155Project3.balanceOf(
          distribution.address,
          i + 1
        );
        const balance_user_before = await osb1155Project3.balanceOf(
          user1.address,
          i + 1
        );
        await distribution.connect(user1).claim(sale_lastedId.add(i + 1));

        const balance_after = await osb1155Project3.balanceOf(
          distribution.address,
          i + 1
        );
        const balance_user_after = await osb1155Project3.balanceOf(
          user1.address,
          i + 1
        );

        expect(balance_user_after.sub(balance_user_before)).to.equals(
          balance_before.sub(balance_after)
        );
      }
    });
  });
});
