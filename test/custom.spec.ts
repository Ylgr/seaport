import {assert, expect} from "chai";
import {faucet} from "./utils/faucet";
import {ethers} from "hardhat";
import {buildOrderStatus, getOfferOrConsiderationItem, randomHex, toBN, toKey} from "./utils/encoding";
import {seaportFixture, SeaportFixtures} from "./utils/fixtures";
import {
    ConduitInterface,
    ConsiderationInterface,
    EIP1271Wallet__factory, TestERC1155,
    TestERC20, TestERC721,
    TestZone
} from "../typechain-types";
import {deployContract} from "./utils/contracts";
import {Wallet} from "ethers";

describe("Custom", () => {
    const { provider } = ethers;
    const owner = new ethers.Wallet(randomHex(32), provider);
    const owner2 = new ethers.Wallet(randomHex(32), provider);
    let seller: Wallet, buyer: Wallet, zone: Wallet, sellerContract, buyerContract

    let conduitKeyOne: string;
    let conduitOne: ConduitInterface;
    let EIP1271WalletFactory: EIP1271Wallet__factory;
    let marketplaceContract: ConsiderationInterface;
    let stubZone: TestZone;
    let testERC20: TestERC20;
    let testERC721: TestERC721;
    let testERC1155: TestERC1155;
    let bicERC20: TestERC20;

    let checkExpectedEvents: SeaportFixtures["checkExpectedEvents"];
    let createMirrorAcceptOfferOrder: SeaportFixtures["createMirrorAcceptOfferOrder"];
    let createMirrorBuyNowOrder: SeaportFixtures["createMirrorBuyNowOrder"];
    let createOrder: SeaportFixtures["createOrder"];
    let getTestItem1155: SeaportFixtures["getTestItem1155"];
    let getTestItem20: SeaportFixtures["getTestItem20"];
    let getTestItem721: SeaportFixtures["getTestItem721"];
    let mint721: SeaportFixtures["mint721"];
    let mintAndApprove1155: SeaportFixtures["mintAndApprove1155"];
    let mintAndApprove721: SeaportFixtures["mintAndApprove721"];
    let mintAndApproveERC20: SeaportFixtures["mintAndApproveERC20"];
    let set721ApprovalForAll: SeaportFixtures["set721ApprovalForAll"];
    let withBalanceChecks: SeaportFixtures["withBalanceChecks"];
    let set1155ApprovalForAll: SeaportFixtures["set1155ApprovalForAll"];

    before(async () => {
        console.log("Custom before");
        await faucet(owner.address, provider);
        await faucet(owner2.address, provider);

        ({
            checkExpectedEvents,
            conduitKeyOne,
            conduitOne,
            createMirrorAcceptOfferOrder,
            createMirrorBuyNowOrder,
            createOrder,
            EIP1271WalletFactory,
            getTestItem1155,
            getTestItem20,
            getTestItem721,
            marketplaceContract,
            mint721,
            mintAndApprove1155,
            mintAndApprove721,
            mintAndApproveERC20,
            set721ApprovalForAll,
            stubZone,
            testERC20,
            testERC721,
            testERC1155,
            withBalanceChecks,
            set1155ApprovalForAll
        } = await seaportFixture(owner));
        bicERC20 = await deployContract("TestERC20", owner2);
        console.log('testERC20: ', testERC20.address);
        console.log('bicERC20: ', bicERC20.address);
    })



    beforeEach(async () => {
        // Setup basic buyer/seller wallets with ETH
        seller = new ethers.Wallet(randomHex(32), provider);
        buyer = new ethers.Wallet(randomHex(32), provider);
        zone = new ethers.Wallet(randomHex(32), provider);

        for (const wallet of [seller, buyer, zone]) {
            await faucet(wallet.address, provider);
        }
    })

    describe("PrivateSaleOrderContractTest", () => {
      it("should success on exchange ERC20 <=> ERC20", async () => {
          const tokenAmount = toBN(1000);

          // BUSD
          await mintAndApproveERC20(
              buyer,
              // buyer.address,
              marketplaceContract.address,
              tokenAmount
          );

          // BIC
          await bicERC20.mint(seller.address, tokenAmount.mul(toBN(100)));

          assert.equal((await testERC20.balanceOf(buyer.address)).toString(), tokenAmount.toString());
          assert.equal((await bicERC20.balanceOf(seller.address)).toString(), tokenAmount.mul(toBN(100)).toString());

          assert.equal((await testERC20.balanceOf(seller.address)).toString(), '0');
          assert.equal((await bicERC20.balanceOf(buyer.address)).toString(), '0');

          const privateSaleOrderContractTest = await deployContract(
              "PrivateSaleOrderContractTest",
              owner,
              testERC20.address,
              bicERC20.address
          );

          const offer = [
              getOfferOrConsiderationItem(1, bicERC20.address, 0, 100000, 100000) as any
          ];
          const consideration = [
              getTestItem20(
                  1000,
                  1000,
                  privateSaleOrderContractTest.address
              ) as any
          ];
          offer[0].identifier = offer[0].identifierOrCriteria;
          offer[0].amount = offer[0].endAmount;

          consideration[0].identifier = consideration[0].identifierOrCriteria;
          consideration[0].amount = consideration[0].endAmount;

          const { order, value } = await createOrder(
              seller,
              zone,
              offer,
              consideration,
              4 // CONTRACT
          );

          const contractOffererNonce =
              await marketplaceContract.getContractOffererNonce(
                  privateSaleOrderContractTest.address
              );

          const orderHash =
              privateSaleOrderContractTest.address.toLowerCase() +
              contractOffererNonce.toHexString().slice(2).padStart(24, "0");

          const orderStatus = await marketplaceContract.getOrderStatus(orderHash);
          expect({ ...orderStatus }).to.deep.equal(
              buildOrderStatus(false, false, 0, 0)
          );
          order.parameters.offerer = privateSaleOrderContractTest.address;
          order.numerator = 1;
          order.denominator = 1;
          order.signature = "0x";

          // await withBalanceChecks([order], 0, [], async () => {
          //     const tx = marketplaceContract
          //         .connect(buyer)
          //         .fulfillAdvancedOrder(
          //             order,
          //             [],
          //             toKey(0),
          //             ethers.constants.AddressZero,
          //             {
          //                 value,
          //             }
          //         );
          //     const receipt = await (await tx).wait();
          //     await checkExpectedEvents(
          //         tx,
          //         receipt,
          //         [
          //             {
          //                 order,
          //                 orderHash,
          //                 fulfiller: buyer.address,
          //                 fulfillerConduitKey: toKey(0),
          //             },
          //         ],
          //         undefined,
          //         []
          //     );
          //
          //     return receipt;
          // });

          expect(true).to.be.true;
      })
    })
})
