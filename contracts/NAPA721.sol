//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NAPA721 is ERC721, ERC721Enumerable, ERC2981 {
    using Strings for uint256;

    uint256 private constant maxBatch = 50;
    uint256 public lastedId;
    string  public baseURI;

    event MintBatch(uint256[] tokenIds);
    event SetBaseURI(string indexed oldUri, string indexed newUri);

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view override (ERC721, ERC721Enumerable, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override (ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    constructor(string memory _name, string memory _symbol, address _receiverRoyaltyFee, uint96 _percentageRoyaltyFee) ERC721(_name, _symbol) {
        if (_receiverRoyaltyFee != address(0)) {
            require(_percentageRoyaltyFee > 0, "Requires royalty fee more significant than 0");
            _setDefaultRoyalty(_receiverRoyaltyFee, _percentageRoyaltyFee);
        }
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token.");
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : ".json";
    }

    function mintBatch(uint256 _times) external {
        require(_times > 0 && _times <= maxBatch, "Must mint fewer in each batch");
        uint256 id = lastedId;
        uint256[] memory tokenIds = new uint256[](_times);
        string memory oldUri = baseURI;
        for (uint256 i; i < _times; i++) {
            tokenIds[i] = ++id;
            _safeMint(_msgSender(), id);
        }
        lastedId = id;
        emit MintBatch(tokenIds);
    }  

    function setBaseURI(string memory _newUri) external {
        string memory oldUri = baseURI;
        baseURI = _newUri;
        emit SetBaseURI(oldUri, _newUri);
    }
}