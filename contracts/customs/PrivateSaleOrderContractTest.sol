import "../interfaces/ContractOffererInterface.sol";
import {
    SpentItem,
    ReceivedItem,
    Schema
} from "../lib/ConsiderationStructs.sol";
import "hardhat/console.sol";
contract PrivateSaleOrderContractTest is ContractOffererInterface {
    function generateOrder(
        address,
        SpentItem[] calldata,
        SpentItem[] calldata,
        bytes calldata
    )
        external
        override
        returns (SpentItem[] memory, ReceivedItem[] memory)
    {

        return (new SpentItem[](0), new ReceivedItem[](0));
    }

    function ratifyOrder(
        SpentItem[] calldata,
        ReceivedItem[] calldata,
        bytes calldata,
        bytes32[] calldata,
        uint256
    ) external override returns (bytes4) {
        return 0x0;
    }

    function previewOrder(
        address caller,
        address fulfiller,
        SpentItem[] calldata,
        SpentItem[] calldata,
        bytes calldata context
    )
    external
    view
    override
    returns (SpentItem[] memory offer, ReceivedItem[] memory consideration)
    {
        console.log("previewOrder");
        return (new SpentItem[](0), new ReceivedItem[](0));
    }

    function getSeaportMetadata()
    external view override
    returns (
        string memory name,
        Schema[] memory schemas // map to Seaport Improvement Proposal IDs
    ) {
        return ("", new Schema[](0));
    }
}
