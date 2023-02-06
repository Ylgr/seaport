import {expect} from "chai";
import {ethers, network} from "hardhat";
import {seaportFixture, SeaportFixtures, tokensFixture} from "./utils/fixtures";
import {buildOrderStatus, getItemETH, randomHex, toBN, toKey} from "./utils/encoding";
import {faucet} from "./utils/faucet";
import { Wallet } from "ethers";
import {
    ConduitInterface,
    ConsiderationInterface,
    EIP1271Wallet__factory, TestERC1155,
    TestERC20, TestERC721,
    TestZone
} from "../typechain-types";
import {minRandom} from "./utils/helpers";
import {deployContract} from "./utils/contracts";
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
    let testERC1155: TestERC1155;

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
            testERC1155,
            withBalanceChecks,
            set1155ApprovalForAll
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

            console.log('before createOrder');
            const { order, orderHash } = await createOrder(
                seller,
                zone,
                offer,
                consideration,
                0, // FULL_OPEN
                // 4, // CONTRACT
                [],
                null,
                seller,
                ethers.constants.HashZero,
                conduitKeyOne
            );
            console.log('after createOrder');

            await withBalanceChecks([order], 0, undefined, async () => {
                console.log('adsdsadasd')
                const tx = marketplaceContract
                    .connect(buyer)
                    .fulfillOrder(order, toKey(0));
                console.log('adsdsadasd2')

                const receipt = await (await tx).wait();
                console.log('adsdsadasd3')
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

    describe("AdvancedContractOrders", () => {
        describe("Contract Orders", async () => {
            it("Contract Orders ERC721 <=> ERC20 (standard via conduit)", async () => {
                const { nftId, amount } = await mintAndApprove1155(
                    seller,
                    marketplaceContract.address,
                    10000, undefined, 120000
                );
                // Buyer mints ERC20
                // const tokenAmount = minRandom(100);
                const tokenAmount = toBN(1000);
                await mintAndApproveERC20(
                    buyer,
                    marketplaceContract.address,
                    tokenAmount
                );

                // seller deploys offererContract and approves it for 1155 token
                const offererContract = await deployContract(
                    "TestContractOfferer",
                    owner,
                    marketplaceContract.address
                );

                await set1155ApprovalForAll(seller, offererContract.address, true);

                const offer = [
                    getTestItem1155(nftId, amount.mul(10), amount.mul(10)) as any,
                ];
                const consideration = [
                    getTestItem20(
                        tokenAmount.sub(100),
                        tokenAmount.sub(100),
                        offererContract.address
                    ) as any
                ];
                // const consideration = [
                //     getItemETH(
                //         amount.mul(1000),
                //         amount.mul(1000),
                //         offererContract.address
                //     ) as any,
                // ];


                offer[0].identifier = offer[0].identifierOrCriteria;
                offer[0].amount = offer[0].endAmount;

                consideration[0].identifier = consideration[0].identifierOrCriteria;
                consideration[0].amount = consideration[0].endAmount;

                const offererContractBalance1 = await testERC20.balanceOf(offererContract.address)
                console.log('offererContractBalance1: ', offererContractBalance1.toString())

                const offererContractNftBalance1 = await testERC1155.balanceOf(offererContract.address, nftId)
                console.log('offererContractNftBalance1: ', offererContractNftBalance1.toString())

                const buyerBalance1 = await testERC20.balanceOf(buyer.address)
                console.log('buyerBalance1: ', buyerBalance1.toString())

                const buyerNftBalance1 = await testERC1155.balanceOf(buyer.address, nftId)
                console.log('buyerNftBalance1: ', buyerNftBalance1.toString())

                const sellerBalance1 = await testERC20.balanceOf(seller.address)
                console.log('sellerBalance1: ', sellerBalance1.toString())

                const sellerNftBalance1 = await testERC1155.balanceOf(seller.address, nftId)
                console.log('sellerNftBalance1: ', sellerNftBalance1.toString())

                await offererContract
                    .connect(seller)
                    .activate(offer[0], consideration[0]);

                const offererContractBalance2 = await testERC20.balanceOf(offererContract.address)
                console.log('offererContractBalance2: ', offererContractBalance2.toString())

                const offererContractNftBalance2 = await testERC1155.balanceOf(offererContract.address, nftId)
                console.log('offererContractNftBalance2: ', offererContractNftBalance2.toString())

                const buyerBalance2 = await testERC20.balanceOf(buyer.address)
                console.log('buyerBalance2: ', buyerBalance2.toString())

                const buyerNftBalance2 = await testERC1155.balanceOf(buyer.address, nftId)
                console.log('buyerNftBalance2: ', buyerNftBalance2.toString())

                const sellerBalance2 = await testERC20.balanceOf(seller.address)
                console.log('sellerBalance2: ', sellerBalance2.toString())

                const sellerNftBalance2 = await testERC1155.balanceOf(seller.address, nftId)
                console.log('sellerNftBalance2: ', sellerNftBalance2.toString())


                const { order, value } = await createOrder(
                    seller,
                    zone,
                    offer,
                    consideration,
                    4 // CONTRACT
                );

                const contractOffererNonce =
                    await marketplaceContract.getContractOffererNonce(
                        offererContract.address
                    );

                const orderHash =
                    offererContract.address.toLowerCase() +
                    contractOffererNonce.toHexString().slice(2).padStart(24, "0");

                const orderStatus = await marketplaceContract.getOrderStatus(orderHash);
                expect({ ...orderStatus }).to.deep.equal(
                    buildOrderStatus(false, false, 0, 0)
                );


                order.parameters.offerer = offererContract.address;
                order.numerator = 1;
                order.denominator = 1;
                order.signature = "0x";

                // const orderWithoutOffer = JSON.parse(JSON.stringify(order));
                // orderWithoutOffer.parameters.offer = [];

                // const orderWithSmallerOfferAmount = JSON.parse(JSON.stringify(order));
                // orderWithSmallerOfferAmount.parameters.offer[0].startAmount =
                //     order.parameters.offer[0].startAmount.sub(1);
                // orderWithSmallerOfferAmount.parameters.offer[0].endAmount =
                //     order.parameters.offer[0].endAmount.sub(1);

                await withBalanceChecks([order], 0, [], async () => {
                    const tx = marketplaceContract
                        .connect(buyer)
                        .fulfillAdvancedOrder(
                            order,
                            [],
                            toKey(0),
                            ethers.constants.AddressZero,
                            {
                                value,
                            }
                        );
                    const receipt = await (await tx).wait();
                    await checkExpectedEvents(
                        tx,
                        receipt,
                        [
                            {
                                order,
                                orderHash,
                                fulfiller: buyer.address,
                                fulfillerConduitKey: toKey(0),
                            },
                        ],
                        undefined,
                        []
                    );

                    return receipt;
                });

                const offererContractBalance3 = await testERC20.balanceOf(offererContract.address)
                console.log('offererContractBalance3: ', offererContractBalance3.toString())

                const offererContractNftBalance3 = await testERC1155.balanceOf(offererContract.address, nftId)
                console.log('offererContractNftBalance3: ', offererContractNftBalance3.toString())

                const buyerBalance3 = await testERC20.balanceOf(buyer.address)
                console.log('buyerBalance3: ', buyerBalance3.toString())

                const buyerNftBalance3 = await testERC1155.balanceOf(buyer.address, nftId)
                console.log('buyerNftBalance3: ', buyerNftBalance3.toString())

                const sellerBalance3 = await testERC20.balanceOf(seller.address)
                console.log('sellerBalance3: ', sellerBalance3.toString())

                const sellerNftBalance3 = await testERC1155.balanceOf(seller.address, nftId)
                console.log('sellerNftBalance3: ', sellerNftBalance3.toString())

            })
        })
    })
})
