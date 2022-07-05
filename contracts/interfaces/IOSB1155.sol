//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

interface IOSB1155 is IERC1155Upgradeable {
    function mintBatch(uint256[] memory amounts) external returns (uint256[] memory);

    function setBaseURI(string memory newUri) external;

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address, uint256);
}