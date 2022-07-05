//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

interface IOSB721 is IERC721Upgradeable {
    function setBaseURI(string memory newUri) external;

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address, uint256);
}