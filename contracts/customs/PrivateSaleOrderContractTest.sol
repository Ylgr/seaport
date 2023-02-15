import "../interfaces/ContractOffererInterface.sol";
import {
    SpentItem,
    ReceivedItem,
    Schema
} from "../lib/ConsiderationStructs.sol";
import {
    BasicOrderRouteType,
    ItemType,
    OrderType
} from "../lib/ConsiderationEnums.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
contract PrivateSaleOrderContractTest is ContractOffererInterface {
    uint256 public numeratorPrice;
    uint256 public denominatorPrice;
    uint256 public soldAmountCountDown;
    uint256 public soldAmountStartCountDown;
    IERC20 public busd;
    IERC20 public bic;
    constructor(address _busd, address _bic) {
        numeratorPrice = 1;
        denominatorPrice = 100;
        soldAmountStartCountDown = 1000000 * 10 ** 18;
        soldAmountCountDown = soldAmountStartCountDown;
        busd = IERC20(_busd);
        bic = IERC20(_bic);
    }
    function generateOrder(
        address fulfiller,
        SpentItem[] calldata minimumReceived,
        SpentItem[] calldata maximumSpent,
        bytes calldata context
    )
        external
        override
        returns (SpentItem[] memory offer, ReceivedItem[] memory consideration)
    {

        return (new SpentItem[](0), new ReceivedItem[](0));
    }

    function previewOrder(
        address caller,
        address fulfiller,
        SpentItem[] calldata minimumReceived,
        SpentItem[] calldata maximumSpent,
        bytes calldata context
    )
    external
    view
    override
    returns (SpentItem[] memory offer, ReceivedItem[] memory consideration)
    {
        console.log("previewOrder");
        uint256 receiptBic = maximumSpent[0].amount * numeratorPrice / denominatorPrice;
        if (receiptBic < minimumReceived[0].amount) {
            return (new SpentItem[](0), new ReceivedItem[](0));
        }
        offer[0] = SpentItem({
            itemType: ItemType.ERC20,
            token: address(busd),
            identifier: 0,
            amount: receiptBic
        });
        consideration[0] = ReceivedItem({
            itemType: ItemType.ERC20,
            token: address(bic),
            identifier: 0,
            amount: maximumSpent[0].amount,
            recipient: payable(caller)
        });
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

    function getSeaportMetadata()
    external view override
    returns (
        string memory name,
        Schema[] memory schemas // map to Seaport Improvement Proposal IDs
    ) {
        return ("", new Schema[](0));
    }
}
