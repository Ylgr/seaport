import {expect} from "chai";
import {ethers, network} from "hardhat";
import {seaportFixture, SeaportFixtures, tokensFixture} from "./utils/fixtures";
import {getItemETH, randomHex, toKey} from "./utils/encoding";
import {faucet} from "./utils/faucet";
import { Wallet } from "ethers";
import {
    ConduitInterface,
    ConsiderationInterface,
    EIP1271Wallet__factory,
    TestERC20, TestERC721,
    TestZone
} from "../typechain-types";
export {
    fixtureERC20,
    fixtureERC721,
    fixtureERC1155,
    tokensFixture,
} from "./utils/fixtures/tokens";

const {parseEther, keccak256} = ethers.utils;

describe("Manual", () => {
    let accounts: any[]
    let seller: Wallet, buyer: Wallet, zone: Wallet, sellerContract, buyerContract
    const { provider } = ethers;
    const owner = new ethers.Wallet(randomHex(32), provider);

    let conduitKeyOne: string;
    let conduitOne: ConduitInterface;
    let EIP1271WalletFactory: EIP1271Wallet__factory;
    let marketplaceContract: ConsiderationInterface;
    let stubZone: TestZone;
    let testERC20: TestERC20;
    let testERC721: TestERC721;

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

    before(async () => {
        await faucet(owner.address, provider);

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
            withBalanceChecks,
        } = await seaportFixture(owner));
    });
    beforeEach(async () => {
        accounts = await ethers.getSigners();
        // Setup basic buyer/seller wallets with ETH
        seller = new ethers.Wallet(randomHex(32), provider);
        buyer = new ethers.Wallet(randomHex(32), provider);
        zone = new ethers.Wallet(randomHex(32), provider);

        sellerContract = await EIP1271WalletFactory.deploy(seller.address);
        buyerContract = await EIP1271WalletFactory.deploy(buyer.address);

        for (const wallet of [seller, buyer, zone, sellerContract, buyerContract]) {
            await faucet(wallet.address, provider);
        }
    })

    describe("Basic", () => {
        it("ERC721 <=> ETH (standard)", async () => {
            const nftId = await mintAndApprove721(
                seller,
                marketplaceContract.address
            );

            const offer = [getTestItem721(nftId)];

            const consideration = [
                getItemETH(parseEther("10"), parseEther("10"), seller.address),
                getItemETH(parseEther("1"), parseEther("1"), zone.address),
                getItemETH(parseEther("1"), parseEther("1"), owner.address),
            ];

            const { order, orderHash, value } = await createOrder(
                seller,
                zone,
                offer,
                consideration,
                0 // FULL_OPEN
            );

            await withBalanceChecks([order], 0, undefined, async () => {
                const tx = marketplaceContract
                    .connect(buyer)
                    .fulfillOrder(order, toKey(0), {
                        value,
                    });
                const receipt = await (await tx).wait();
                await checkExpectedEvents(tx, receipt, [
                    {
                        order,
                        orderHash,
                        fulfiller: buyer.address,
                    },
                ]);
                return receipt;
            });
        });
    })
})
