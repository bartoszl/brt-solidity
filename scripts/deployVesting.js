async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Vesting = await ethers.getContractFactory("Vesting");
  const vesting = await Vesting.deploy('0x58BC94e046bEC83cFc5Eb4aa86C9DEdEafE2CBe4');

  console.log("Token address:", vesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
