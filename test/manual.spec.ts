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
import {minRandom} from "./utils/helpers";
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
        it("ERC721 <=> ERC20 (standard)", async () => {
            const nftId = await mintAndApprove721(
                seller,
                marketplaceContract.address
            );

            // Buyer mints ERC20
            const tokenAmount = minRandom(100);
            console.log('tokenAmount: ', tokenAmount.toString())
            await mintAndApproveERC20(
                buyer,
                marketplaceContract.address,
                tokenAmount
            );

            const offer = [getTestItem721(nftId)];

            const buyerBalance = await testERC20.balanceOf(buyer.address)
            console.log('buyerBalance: ', buyerBalance.toString())
            const sellerBalance = await testERC20.balanceOf(seller.address)
            console.log('sellerBalance: ', sellerBalance.toString())
            const zoneBalance = await testERC20.balanceOf(zone.address)
            console.log('zoneBalance: ', zoneBalance.toString())
            const ownerBalance = await testERC20.balanceOf(zone.address)
            console.log('ownerBalance: ', ownerBalance.toString())
            const buyerNftBalance = await testERC721.balanceOf(buyer.address)
            console.log('buyerNftBalance: ', buyerNftBalance.toString())
            const sellerNftBalance = await testERC721.balanceOf(seller.address)
            console.log('sellerNftBalance: ', sellerNftBalance.toString())
            const zoneNftBalance = await testERC721.balanceOf(zone.address)
            console.log('zoneNftBalance: ', zoneNftBalance.toString())
            const ownerNftBalance = await testERC721.balanceOf(zone.address)
            console.log('ownerNftBalance: ', ownerNftBalance.toString())

            const consideration = [
                getTestItem20(
                    // tokenAmount.sub(100),
                    // tokenAmount.sub(100),
                    100,
                    102,
                    seller.address
                ),
                getTestItem20(50, 52, zone.address),
                getTestItem20(50, 52, owner.address),
            ];

            const { order, orderHash } = await createOrder(
                seller,
                zone,
                offer,
                consideration,
                0 // FULL_OPEN
            );

            await withBalanceChecks([order], 0, undefined, async () => {
                const tx = marketplaceContract
                    .connect(buyer)
                    .fulfillOrder(order, toKey(0));
                const receipt = await (await tx).wait();
                // console.log('receipt: ', receipt)
                // const events = await testERC20.queryFilter(testERC20.filters.Transfer())
                // console.log('events: ', events)
                await checkExpectedEvents(tx, receipt, [
                    {
                        order,
                        orderHash,
                        fulfiller: buyer.address,
                        fulfillerConduitKey: toKey(0),
                    },
                ]);
                return receipt;
            });
            const buyerBalance2 = await testERC20.balanceOf(buyer.address)
            console.log('buyerBalance2: ', buyerBalance2.toString())
            const sellerBalance2 = await testERC20.balanceOf(seller.address)
            console.log('sellerBalance2: ', sellerBalance2.toString())
            const zoneBalance2 = await testERC20.balanceOf(zone.address)
            console.log('zoneBalance2: ', zoneBalance2.toString())
            const ownerBalance2 = await testERC20.balanceOf(zone.address)
            console.log('ownerBalance2: ', ownerBalance2.toString())
            const buyerNftBalance2 = await testERC721.balanceOf(buyer.address)
            console.log('buyerNftBalance2: ', buyerNftBalance2.toString())
            const sellerNftBalance2 = await testERC721.balanceOf(seller.address)
            console.log('sellerNftBalance2: ', sellerNftBalance2.toString())
            const zoneNftBalance2 = await testERC721.balanceOf(zone.address)
            console.log('zoneNftBalance2: ', zoneNftBalance2.toString())
            const ownerNftBalance2 = await testERC721.balanceOf(zone.address)
            console.log('ownerNftBalance2: ', ownerNftBalance2.toString())
        });

        it("ERC721 <=> ERC20 (standard via conduit)", async () => {
            const nftId = await mintAndApprove721(seller, conduitOne.address);

            // Buyer mints ERC20
            const tokenAmount = minRandom(100);
            await mintAndApproveERC20(
                buyer,
                marketplaceContract.address,
                tokenAmount
            );

            const offer = [getTestItem721(nftId)];

            const buyerBalance = await testERC20.balanceOf(buyer.address)
            console.log('buyerBalance: ', buyerBalance.toString())
            const sellerBalance = await testERC20.balanceOf(seller.address)
            console.log('sellerBalance: ', sellerBalance.toString())
            const zoneBalance = await testERC20.balanceOf(zone.address)
            console.log('zoneBalance: ', zoneBalance.toString())
            const ownerBalance = await testERC20.balanceOf(zone.address)
            console.log('ownerBalance: ', ownerBalance.toString())
            const buyerNftBalance = await testERC721.balanceOf(buyer.address)
            console.log('buyerNftBalance: ', buyerNftBalance.toString())
            const sellerNftBalance = await testERC721.balanceOf(seller.address)
            console.log('sellerNftBalance: ', sellerNftBalance.toString())
            const zoneNftBalance = await testERC721.balanceOf(zone.address)
            console.log('zoneNftBalance: ', zoneNftBalance.toString())
            const ownerNftBalance = await testERC721.balanceOf(zone.address)
            console.log('ownerNftBalance: ', ownerNftBalance.toString())

            const consideration = [
                getTestItem20(
                    tokenAmount.sub(100),
                    tokenAmount.sub(100),
                    seller.address
                ),
                getTestItem20(50, 50, zone.address),
                getTestItem20(50, 50, owner.address),
            ];


            const { order, orderHash } = await createOrder(
                seller,
                zone,
                offer,
                consideration,
                0, // FULL_OPEN
                [],
                null,
                seller,
                ethers.constants.HashZero,
                conduitKeyOne
            );

            await withBalanceChecks([order], 0, undefined, async () => {
                const tx = marketplaceContract
                    .connect(buyer)
                    .fulfillOrder(order, toKey(0));
                const receipt = await (await tx).wait();
                await checkExpectedEvents(tx, receipt, [
                    {
                        order,
                        orderHash,
                        fulfiller: buyer.address,
                        fulfillerConduitKey: toKey(0),
                    },
                ]);

                return receipt;
            });

            const buyerBalance2 = await testERC20.balanceOf(buyer.address)
            console.log('buyerBalance2: ', buyerBalance2.toString())
            const sellerBalance2 = await testERC20.balanceOf(seller.address)
            console.log('sellerBalance2: ', sellerBalance2.toString())
            const zoneBalance2 = await testERC20.balanceOf(zone.address)
            console.log('zoneBalance2: ', zoneBalance2.toString())
            const ownerBalance2 = await testERC20.balanceOf(zone.address)
            console.log('ownerBalance2: ', ownerBalance2.toString())
            const buyerNftBalance2 = await testERC721.balanceOf(buyer.address)
            console.log('buyerNftBalance2: ', buyerNftBalance2.toString())
            const sellerNftBalance2 = await testERC721.balanceOf(seller.address)
            console.log('sellerNftBalance2: ', sellerNftBalance2.toString())
            const zoneNftBalance2 = await testERC721.balanceOf(zone.address)
            console.log('zoneNftBalance2: ', zoneNftBalance2.toString())
            const ownerNftBalance2 = await testERC721.balanceOf(zone.address)
            console.log('ownerNftBalance2: ', ownerNftBalance2.toString())
        });

    })
})
