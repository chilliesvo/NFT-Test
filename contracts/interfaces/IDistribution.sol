//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IDistribution {
    function setSale(uint256 saleId, address buyer, uint256 amount) external;
}
