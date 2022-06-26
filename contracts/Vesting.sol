pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Vesting is Ownable {
    struct Vest {
        uint256 amount;
        uint256 timestamp;
        uint256 collected;
    }

    mapping(address => Vest) private _vests;

    uint constant _vestingPeriod = 60*60*24*30; // 1 month in seconds

    IERC20 private _token;

    constructor(IERC20 token) {
        _token = token;
    }

    function vest(address receiver, uint amount) public onlyOwner {
        _vests[receiver] = Vest(amount, block.timestamp, 0);
    }

    function claim() public returns(uint) {
        uint claimAmount = getCurrentVestAmountForAddress(msg.sender);

        _token.transfer(msg.sender, claimAmount);

        _vests[msg.sender].collected = claimAmount;

        return claimAmount;
    }

    function getCollectedAmountForAddress(address addy) public view returns(uint){
        return _vests[addy].collected;
    }

    function getTotalVestAmountForAddress(address addy) public view returns(uint){
        return _vests[addy].amount;
    }

    function getCurrentVestAmountForAddress(address addy) public view returns(uint){
        return(_calculateCurrentVestedAmount(_vests[addy]));
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
