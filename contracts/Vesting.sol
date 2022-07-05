pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

contract Vesting is OwnableUpgradeable {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    struct Vest {
        uint256 amount;
        uint256 timestamp;
        uint256 collected;
    }

    mapping(address => EnumerableSet.Bytes32Set) private addressVestSetMap;
    mapping(bytes32 => Vest) public vests;

    uint constant _vestingPeriod = 60*60*24*30; // 1 month in seconds

    IERC20 private _token;

    function initialize(IERC20 token) public initializer {
        __Ownable_init();
        _token = token;
    }

    function getVestHashSet(address addr) public view returns(bytes32[] memory){
        return addressVestSetMap[addr].values();
    }

    function hash(address addr, uint256 amount, uint256 timestamp) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(addr, amount, timestamp));
    }

    function vest(address receiver, uint amount) public onlyOwner {
        uint allowance = _token.allowance(owner(), address(this));

        require(allowance >= amount, 'Not enough allowance');

        uint now = block.timestamp;
        bytes32 vestHash = hash(receiver, amount, now);
        addressVestSetMap[receiver].add(vestHash);
        vests[vestHash] = Vest(amount, now, 0);

        _token.transferFrom(owner(), address(this), amount);
    }

    function claim(bytes32[] calldata hashArray) public returns(uint) {
        uint sum = 0;

        for(uint i = 0;i < hashArray.length; i++) {
            if(addressVestSetMap[msg.sender].contains(hashArray[i])) {
                // get claim amount
                uint claimAmount = calculateCurrentVestedAmount(hashArray[i]);

                sum += claimAmount;

                vests[hashArray[i]].collected = claimAmount;
            }
        }

        _token.transfer(msg.sender, sum);

        return sum;
    }

    function calculateCurrentVestedAmount(bytes32 currentVestHash) public view returns (uint) {
        Vest memory currentVest = vests[currentVestHash];

        uint availableCoins = currentVest.amount - currentVest.collected;

        if(currentVest.timestamp + _vestingPeriod < block.timestamp) {
            return availableCoins;
        }

        uint totalToBeCollected = currentVest.amount * (block.timestamp - currentVest.timestamp) / _vestingPeriod;

        uint toBeCollected = totalToBeCollected - currentVest.collected;

        return toBeCollected;
    }
}
