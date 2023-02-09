const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { networkConfig } = require("../../helper-hardhat-config");

const chainId = network.config.chainId;

chainId !== 31337
  ? describe.skip
  : describe("Testing randomNft contract", () => {
      let randomNft, deployer, vrfCoordinatorV2Mock;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        await deployments.fixture(["mocks","randomnft"]);
        randomNft = await ethers.getContract("RandomIpfsNFT");
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
      });

      describe("constructor", () => {
        it("sets starting values correctly", async function () {
          const dogTokenUriZero = await randomNft.getDogTokenUris(0);
          const isInitialized = await randomNft.getInitialized();
          assert(dogTokenUriZero.includes("ipfs://"));
          assert.equal(isInitialized, true);
        });
      });

      describe("requestNft", () => {
        it("fails if payment isn't sent with the request", async function () {
          await expect(randomNft.requestNFT()).to.be.revertedWithCustomError(
            randomNft,
            "RandomIpfsNFT__NeedMoreETH"
          );
        });
        it("reverts if payment amount is less than the mint fee", async function () {
          const fee = await randomNft.getMintFee();
          await expect(
            randomNft.requestNFT({
              value: fee.sub(ethers.utils.parseEther("0.001")),
            })
          ).to.be.revertedWithCustomError(randomNft, "RandomIpfsNFT__NeedMoreETH");
        });
        it("emits an event and kicks off a random word request", async function () {
          const fee = await randomNft.getMintFee();
          await expect(
            randomNft.requestNFT({ value: fee.toString() })
          ).to.emit(randomNft, "NFTRequested");
        });
      });
      describe("fulfillRandomWords", () => {
        it("mints NFT after random number is returned", async function () {
          await new Promise(async (resolve, reject) => {
            randomNft.once("NFTMinted", async () => {
              try {
                const tokenUri = await randomNft.tokenURI("0");
                const tokenCounter = await randomNft.getTokenCounter();
                assert.equal(tokenUri.toString().includes("ipfs://"), true);
                assert.equal(tokenCounter.toString(), "1");
                resolve();
              } catch (e) {
                console.log(e);
                reject(e);
              }
            });
            try {
              const fee = await randomNft.getMintFee();
              const requestNftResponse = await randomNft.requestNFT({
                value: fee.toString(),
              });
              const requestNftReceipt = await requestNftResponse.wait(1);
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestNftReceipt.events[1].args.requestId,
                randomNft.address
              );
            } catch (e) {
              console.log(e);
              reject(e);
            }
          });
        });
      });
      describe("getBreedFromModdedRng", () => {
        it("should return pug if moddedRng < 10", async function () {
          const expectedValue = await randomNft.getBreedFromModdedRng(7);
          assert.equal(0, expectedValue);
        });
        it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
          const expectedValue = await randomNft.getBreedFromModdedRng(21);
          assert.equal(1, expectedValue);
        });
        it("should return st. bernard if moddedRng is between 40 - 99", async function () {
          const expectedValue = await randomNft.getBreedFromModdedRng(77);
          assert.equal(2, expectedValue);
        });
        it("should revert if moddedRng > 99", async function () {
          await expect(
            randomNft.getBreedFromModdedRng(100)
          ).to.be.revertedWithCustomError(randomNft, "RandomIpfsNFT__RangeOutOfBounds");
        });
      });
    });
