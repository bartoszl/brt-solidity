const { expect } = require("chai");

const { expectRevert } = require('@openzeppelin/test-helpers');

describe("Token contract", function () {
  let BRTToken;
  let BRTTokenContract;
  let owner;
  let addr1;

  beforeEach(async function () {
    BRTToken = await ethers.getContractFactory("BRTToken");
    [owner, addr1, ...addrs] = await ethers.getSigners();

    BRTTokenContract = await BRTToken.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await BRTTokenContract.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await BRTTokenContract.balanceOf(owner.address);
      expect(await BRTTokenContract.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Mint", function () {
    it("Should revert if non owner tries to mint", async function () {
      expectRevert(
        BRTTokenContract.connect(addr1).mint(addr1.address, 50),
        'Ownable: caller is not the owner',
      );
    });

    it("Should mint tokens if owner calls the method", async function () {
        const initialSupply = await BRTTokenContract.totalSupply();
        const mintAmount = 50;

        await BRTTokenContract.mint(owner.address, mintAmount);

        const totalSupply = await BRTTokenContract.totalSupply();

        expect(totalSupply).to.equal(Number(initialSupply) + mintAmount);
    });
  });
});
