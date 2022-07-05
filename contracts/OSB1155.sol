//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract OSB1155 is ERC1155, ERC2981, Ownable {
    using Strings for uint256;

    uint256     private constant maxBatch = 50;
    uint256     public lastedId;
    string      public name;
    string      public symbol;
    string      public baseURI;
    RoyaltyInfo public defaultRoyaltyInfo;

    mapping(address => bool) public controllers;

    event MintBatch(string indexed oldUri, string indexed newUri, uint256[] tokenIds, uint256[] amounts);
    event MintBatchWithRoyalty(string indexed oldUri, string indexed newUri, uint256[] tokenIds, uint256[] amounts, address[] receiverRoyaltyFees, uint96[] percentageRoyaltyFees);
    event AddControllers(address[] accounts);
    event RemoveControllers(address[] accounts);
    event SetBaseURI(string indexed oldUri, string indexed newUri);

    modifier onlyOwnerOrController() {
        require(_msgSender() == owner() || controllers[_msgSender()], "caller is not the owner or controller");
        _;
    }

    /**
     * @dev Initializes the contract by setting `owner` `name` `symbol` and `receiverRoyaltyFee` `percentageRoyaltyFee` to the token collection.
     *
     * Requirements:
     * - `_owner` cannot be the zero address.
     */
    constructor(address _owner, string memory _name, string memory _symbol, address _receiverRoyaltyFee, uint96 _percentageRoyaltyFee) ERC1155("") {
        name   = _name;
        symbol = _symbol;
        transferOwnership(_owner);
        if (_receiverRoyaltyFee != address(0)) {
            require(_percentageRoyaltyFee > 0, "Requires royalty fee more significant than 0");
            defaultRoyaltyInfo = RoyaltyInfo(_receiverRoyaltyFee, _percentageRoyaltyFee);
            _setDefaultRoyalty(_receiverRoyaltyFee, _percentageRoyaltyFee);
        }
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool){
        return super.supportsInterface(interfaceId);
    }

    function uri(uint256 _tokenId) override public view returns (string memory) {
        string memory _baseURI = baseURI;
        return bytes(_baseURI).length > 0 ? string(abi.encodePacked(_baseURI, _tokenId.toString(), ".json")) : ".json";
    }

    function setBaseURI(string memory _newUri) external onlyOwnerOrController {
        string memory oldUri = baseURI;
        baseURI = _newUri;
        emit SetBaseURI(oldUri, _newUri);
    }

    function mintBatch(string memory _baseUri, uint256[] memory _amounts) external onlyOwnerOrController {
        require(_amounts.length > 0 && _amounts.length <= maxBatch, "must mint fewer in each batch");
        uint256 id = lastedId;
        uint256[] memory tokenIds = new uint256[](_amounts.length);
        string memory oldUri = baseURI;
        for (uint256 i; i < _amounts.length; i++) {
            tokenIds[i] = id++;
            _mint(_msgSender(), id, _amounts[i], "");
        }
        baseURI = _baseUri;
        lastedId = id;
        emit MintBatch(oldUri, _baseUri, tokenIds, _amounts);
    }

    function mintBatchWithRoyalty(string memory _baseUri, uint256[] memory _amounts, address[] memory _receiverRoyaltyFees, uint96[] memory _percentageRoyaltyFees) external onlyOwnerOrController {
        require(_amounts.length == _receiverRoyaltyFees.length && _receiverRoyaltyFees.length == _percentageRoyaltyFees.length, "Invalid pram");
        require(_amounts.length > 0 && _amounts.length <= maxBatch, "Must mint fewer in each batch");
        uint256 id = lastedId;
        uint256[] memory tokenIds = new uint256[](_amounts.length);
        string memory oldUri = baseURI;
        for (uint256 i; i < _amounts.length; i++) {
            tokenIds[i] = id++;
            _mint(_msgSender(), id, _amounts[i], "");
            if (_percentageRoyaltyFees[i] == 0) continue;

            if (_receiverRoyaltyFees[i] == address(0)) {
                _setTokenRoyalty(id, defaultRoyaltyInfo.receiver, _percentageRoyaltyFees[i]);
            } else {
                _setTokenRoyalty(id, _receiverRoyaltyFees[i], _percentageRoyaltyFees[i]);
            }
        }
        baseURI = _baseUri;
        lastedId = id;
        emit MintBatchWithRoyalty(oldUri, _baseUri, tokenIds, _amounts, _receiverRoyaltyFees, _percentageRoyaltyFees);
    }

    function addControllers(address[] memory _accounts) external onlyOwner {
        _setControllers(_accounts, true);
    }

    function removeControllers(address[] memory _accounts) external onlyOwner {
        _setControllers(_accounts, false);
    }

    function _setControllers(address[] memory accounts, bool isAdd) private {
        for (uint256 i; i < accounts.length; i++) {
            require(accounts[i] != address(0), "account is zero address");
            controllers[accounts[i]] = isAdd;
        }
    }
}
