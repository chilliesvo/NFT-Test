//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract OSB721 is ERC721, ERC721Enumerable, ERC2981, Ownable {
    using Strings for uint256;

    uint256     private constant maxBatch = 50;
    uint256     public lastedId;
    string      public baseURI;
    RoyaltyInfo public defaultRoyaltyInfo;

    mapping(address => bool) public controllers;

    event MintBatch(string indexed oldUri, string indexed newUri, uint256[] tokenIds);
    event MintBatchWithRoyalty(string indexed oldUri, string indexed newUri, uint256[] tokenIds, address[] receiverRoyaltyFees, uint96[] percentageRoyaltyFees);
    event AddControllers(address[] accounts);
    event RemoveControllers(address[] accounts);
    event SetBaseURI(string indexed oldUri, string indexed newUri);

    modifier onlyOwnerOrController() {
        require(_msgSender() == owner() || controllers[_msgSender()], "Caller is not the owner or controller");
        _;
    }

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

    /**
     * @dev Initializes the contract by setting `owner` `name` `symbol` and `receiverRoyaltyFee` `percentageRoyaltyFee` to the token collection.
     *
     * Requirements:
     * - `_owner` cannot be the zero address.
     */
    constructor(address _owner, string memory _name, string memory _symbol, address _receiverRoyaltyFee, uint96 _percentageRoyaltyFee) ERC721(_name, _symbol) {
        transferOwnership(_owner);
        if (_receiverRoyaltyFee != address(0)) {
            require(_percentageRoyaltyFee > 0, "Requires royalty fee more significant than 0");
            defaultRoyaltyInfo = RoyaltyInfo(_receiverRoyaltyFee, _percentageRoyaltyFee);
            _setDefaultRoyalty(_receiverRoyaltyFee, _percentageRoyaltyFee);
        }
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token.");
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : ".json";
    }

    function mintBatch(string memory _baseUri, uint256 _times) external onlyOwnerOrController {
        require(_times > 0 && _times <= maxBatch, "Must mint fewer in each batch");
        uint256 id = lastedId;
        uint256[] memory tokenIds = new uint256[](_times);
        string memory oldUri = baseURI;
        for (uint256 i; i < _times; i++) {
            tokenIds[i] = ++id;
            _safeMint(_msgSender(), id);
        }
        baseURI  = _baseUri;
        lastedId = id;
        emit MintBatch(oldUri, _baseUri, tokenIds);
    }  

    function mintBatchWithRoyalty(string memory _baseUri, address[] memory _receiverRoyaltyFees, uint96[] memory _percentageRoyaltyFees) external onlyOwnerOrController {
        require(_receiverRoyaltyFees.length == _percentageRoyaltyFees.length, "Invalid param");
        require(_receiverRoyaltyFees.length > 0 && _receiverRoyaltyFees.length <= maxBatch, "Must mint fewer in each batch");
        uint256 id = lastedId;
        uint256[] memory tokenIds = new uint256[](_percentageRoyaltyFees.length);
        string memory oldUri = baseURI;
        for (uint256 i; i < _receiverRoyaltyFees.length; i++) {
            tokenIds[i] = id++;
            _safeMint(_msgSender(), id);
            if (_percentageRoyaltyFees[i] == 0) continue;

            if (_receiverRoyaltyFees[i] == address(0)) {
                _setTokenRoyalty(id, defaultRoyaltyInfo.receiver, _percentageRoyaltyFees[i]);
            } else {
                _setTokenRoyalty(id, _receiverRoyaltyFees[i], _percentageRoyaltyFees[i]);
            }
        }
        baseURI  = _baseUri;
        lastedId = id;
        emit MintBatchWithRoyalty(oldUri, _baseUri, tokenIds, _receiverRoyaltyFees, _percentageRoyaltyFees);
    }  

    function addControllers(address[] memory _accounts) external onlyOwner {
        _setControllers(_accounts, true);
        emit AddControllers(_accounts);
    }

    function removeControllers(address[] memory _accounts) external onlyOwner {
        _setControllers(_accounts, false);
        emit RemoveControllers(_accounts);
    }

    function setBaseURI(string memory _newUri) external onlyOwnerOrController {
        string memory oldUri = baseURI;
        baseURI = _newUri;
        emit SetBaseURI(oldUri, _newUri);
    }

    function _setControllers(address[] memory accounts, bool isAdd) private {
        for (uint256 i; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Account is zero address");
            controllers[accounts[i]] = isAdd;
        }
    }
}