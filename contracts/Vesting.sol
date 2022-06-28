pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Vesting is OwnableUpgradeable {
    struct Vest {
        uint256 amount;
        uint256 timestamp;
        uint256 collected;
    }

    mapping(address => Vest) public vests;

    uint constant _vestingPeriod = 60*60*24*30; // 1 month in seconds

    IERC20 private _token;

    function initialize(IERC20 token) public initializer {
        __Ownable_init();
        __Ownable_init_unchained();
        _token = token;
    }

    function vest(address receiver, uint amount) public onlyOwner {
        uint allowance = _token.allowance(owner(), address(this));

        require(allowance >= amount, 'Not enough allowance');
        require(vests[receiver].amount == 0, 'Vest for this address already exists');

        _token.transferFrom(owner(), address(this), amount);

        vests[receiver] = Vest(amount, block.timestamp, 0);
    }

    function claim() public returns(uint) {
        require(vests[msg.sender].collected < vests[msg.sender].amount);

        uint claimAmount = getCurrentVestAmountForAddress(msg.sender);

        vests[msg.sender].collected = claimAmount;

        _token.transfer(msg.sender, claimAmount);

        return claimAmount;
    }

    function getCurrentVestAmountForAddress(address addy) public view returns(uint){
        return(_calculateCurrentVestedAmount(vests[addy]));
    }

    function _calculateCurrentVestedAmount(Vest memory currentVest) private view returns (uint) {
        uint totalToBeCollected = currentVest.amount * (block.timestamp - currentVest.timestamp) / _vestingPeriod;

        uint toBeCollected = totalToBeCollected - currentVest.collected;

        uint availableCoins = currentVest.amount - currentVest.collected;

        if (availableCoins < toBeCollected) {
            return availableCoins;
        }

        return toBeCollected;
    }
}
