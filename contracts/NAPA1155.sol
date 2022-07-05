//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NAPA1155 is ERC1155, ERC2981 {
    using Strings for uint256;

    uint256 private constant maxBatch = 50;
    uint256 public lastedId;
    string  public name;
    string  public symbol;
    string  public baseURI;

    event MintBatch(uint256[] tokenIds, uint256[] amounts);
    event SetBaseURI(string indexed oldUri, string indexed newUri);

    constructor(string memory _name, string memory _symbol, address _receiverRoyaltyFee, uint96 _percentageRoyaltyFee) ERC1155("") {
        name   = _name;
        symbol = _symbol;
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

    function setBaseURI(string memory _newUri) external {
        string memory oldUri = baseURI;
        baseURI = _newUri;
        emit SetBaseURI(oldUri, _newUri);
    }

    function mintBatch(uint256[] memory _amounts) external {
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
        emit MintBatch(tokenIds, _amounts);
    }
}
