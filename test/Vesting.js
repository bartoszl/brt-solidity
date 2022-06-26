const { expect } = require("chai");

const { expectRevert } = require('@openzeppelin/test-helpers');


const waitAndMine = async (timeInSeconds) => {
  await ethers.provider.send("evm_increaseTime", [timeInSeconds]);
  await network.provider.send("evm_mine")
}

describe("Vesting contract", function () {
  let Vesting;
  let VestingContract;
  let owner;
  let addr1;
  let BRTToken;
  let BRTTokenContract;

  beforeEach(async function () {
    Vesting = await ethers.getContractFactory("Vesting");
    BRTToken = await ethers.getContractFactory("BRTToken");
    [owner, addr1, ...addrs] = await ethers.getSigners();

    BRTTokenContract = await BRTToken.deploy();
    await BRTTokenContract.deployed();

    VestingContract = await Vesting.deploy(BRTTokenContract.address);
    await VestingContract.deployed();

    await BRTTokenContract.mint(VestingContract.address, 1000);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await VestingContract.owner()).to.equal(owner.address);
    });
  });

  describe("Vest", function () {
    it("Owner should add a new vest to the list", async function () {
      const amount = 100;
      await VestingContract.vest(addr1.address, amount);
      const vestForAddy = await VestingContract.getTotalVestAmountForAddress(addr1.address);

      expect(vestForAddy).to.equal(amount);
    });

    it("Not owner should not be able to add new vest", async () => {
      expectRevert(
        VestingContract.connect(addr1).vest(addr1.address, 50),
        'Ownable: caller is not the owner',
      );
    });

    it("Should be able to see full vested amount after 30 days", async function () {
      const amount = 100;
      await VestingContract.vest(addr1.address, amount);

      await ethers.provider.send("evm_increaseTime", [60*60*24*30]);
      await network.provider.send("evm_mine")

      const vestForAddy = await VestingContract.getCurrentVestAmountForAddress(addr1.address);

      expect(vestForAddy).to.equal(100);
    });

    it("Should not be possible to claim more than the initial vest amount", async function () {
      const amount = 100;
      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*30*2) // 2 moths

      const vestForAddy = await VestingContract.getCurrentVestAmountForAddress(addr1.address);

      expect(vestForAddy).to.equal(100);
    });

    it('Should be able to claim half of the tokens after 15 days', async function () {
      const amount = 100;
      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*15); // 15 days

      const vestForAddy = await VestingContract.getCurrentVestAmountForAddress(addr1.address);

      expect(vestForAddy).to.equal(50);
    })
  });

  describe('Claim', () => {
    it("Should be able to see half vested amount after 15 days", async function () {
      const amount = 100;
      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*15); // 15 days

      await VestingContract.connect(addr1).claim();

      await network.provider.send("evm_mine");

      const collected = await VestingContract.getCollectedAmountForAddress(addr1.address);

      expect(collected).to.equal(50);
    });

    it("Should be able to claim im 2 turns", async function () {
      const amount = 30;
      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*3); // 3 days

      await VestingContract.connect(addr1).claim();

      await network.provider.send("evm_mine");

      const collected = await VestingContract.getCollectedAmountForAddress(addr1.address);

      expect(collected).to.equal(3);

      await waitAndMine(60*60*24*8); // 8 days

      const toBeClaimed = await VestingContract.getCurrentVestAmountForAddress(addr1.address);

      expect(toBeClaimed).to.equal(8);
    });

    it("Should be able to claim all tokens if it is over 30 days after", async function () {
      const amount = 30;
      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*31); // 31 days

      await VestingContract.connect(addr1).claim();

      await network.provider.send("evm_mine");

      const collected = await VestingContract.getCollectedAmountForAddress(addr1.address);

      expect(collected).to.equal(amount);
    });
  })
});
