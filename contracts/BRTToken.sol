pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BRTToken is ERC20, Ownable {
    uint constant _supply = 10000;

    constructor() ERC20("BRTToken", "BRT") {
        _mint(msg.sender, _supply);
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }
}
