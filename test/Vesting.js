const { expect } = require("chai");

const waitAndMine = async (timeInSeconds) => {
  await ethers.provider.send("evm_increaseTime", [timeInSeconds]);
  await network.provider.send("evm_mine");
}

describe("Vesting contract", function () {
  let Vesting;
  let VestingContract;
  let owner;
  let addr1;
  let BRTToken;
  let BRTTokenContract;

  beforeEach(async function () {
    [owner, addr1, ...addrs] = await ethers.getSigners();

    Vesting = await ethers.getContractFactory("Vesting", owner);
    BRTToken = await ethers.getContractFactory("BRTToken", owner);


    BRTTokenContract = await BRTToken.deploy();
    await BRTTokenContract.deployed();

    VestingContract = await Vesting.deploy();
    await VestingContract.deployed();
    await (await VestingContract.initialize(BRTTokenContract.address)).wait()
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await VestingContract.owner()).to.equal(owner.address);
    });
  });

  describe("Vest", function () {
    it("Owner should add a new vest to the list", async function () {
      const amount = 100;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);

      const vest = await VestingContract.vests(addr1.address, 0);

      expect(vest.amount).to.equal(amount);
    });

    it("Not owner should not be able to add new vest", async () => {
      await expect(
        VestingContract.connect(addr1).vest(addr1.address, 50),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it("Should not vest if not enough allowance", async () => {
      const amount = 50;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await expect(
        VestingContract.vest(addr1.address, amount + 10),
      ).to.be.revertedWith('Not enough allowance');
    });

    it("Should add 2 vests for the same contract", async () => {
      const amount = 50;
      const amount2 = 100;

      await BRTTokenContract.approve(VestingContract.address, amount + amount2);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);
      await VestingContract.vest(addr1.address, amount2);

      const vest1 = await VestingContract.vests(addr1.address, 0);
      const vest2 = await VestingContract.vests(addr1.address, 1);

      expect(vest1.amount).to.equal(amount);
      expect(vest2.amount).to.equal(amount2);
    });

    it("Should be able to see full vested amount after 30 days", async function () {
      const amount = 100;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*30);

      const vestForAddy = await VestingContract.getCurrentVestAmountForAddress(addr1.address, 0);

      expect(vestForAddy).to.equal(amount);
    });

    it("Should not be possible to claim more than the initial vest amount", async function () {
      const amount = 100;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*30*2) // 2 moths

      const vestForAddy = await VestingContract.getCurrentVestAmountForAddress(addr1.address, 0);

      expect(vestForAddy).to.equal(100);
    });
  });

  describe('Claim', () => {
    it("Should be able to see half vested amount after 15 days", async function () {
      const amount = 100;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*15); // 15 days

      await VestingContract.connect(addr1).claim();

      await network.provider.send("evm_mine");

      const vest = await VestingContract.vests(addr1.address, 0);

      expect(vest.collected).to.equal(50);
    });

    it("Should be able to claim im 2 turns", async function () {
      const amount = 30;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*3); // 3 days

      await VestingContract.connect(addr1).claim();

      await network.provider.send("evm_mine");

      const vest = await VestingContract.vests(addr1.address, 0);

      expect(vest.collected).to.equal(3);

      await waitAndMine(60*60*24*8); // 8 days

      const toBeClaimed = await VestingContract.getCurrentVestAmountForAddress(addr1.address, 0);

      expect(toBeClaimed).to.equal(8);
    });

    it("Should be able to claim all tokens if it is over 30 days after", async function () {
      const amount = 30;

      await BRTTokenContract.approve(VestingContract.address, amount);
      await network.provider.send("evm_mine");

      await VestingContract.vest(addr1.address, amount);

      await waitAndMine(60*60*24*31); // 31 days

      await VestingContract.connect(addr1).claim();

      await network.provider.send("evm_mine");

      const vest = await VestingContract.vests(addr1.address, 0);

      expect(vest.collected).to.equal(amount);
    });
  })
});
