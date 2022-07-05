//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ISale {
    function getSale(uint256 saleId) external view returns (SaleInfo memory);

    function getSalesProject(uint256 projectId) external view returns (SaleInfo[] memory);
}

struct SaleInfo {
    uint256 id;
    uint256 projectId;
    address token;
    uint256 tokenId;
    uint256 raisePrice;
    uint256 dutchMaxPrice;
    uint256 dutchMinPrice;
    uint256 priceDecrementAmt;
    uint256 amount;
    bool isSoldOut;
}