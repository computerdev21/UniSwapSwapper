const ethers = require('ethers');
const { JsonRpcProvider } = require('@ethersproject/providers');

// Uniswap V2 Pool ABI (only the functions we're interested in)
const UniswapV2PoolABI = [
    "function factory() external view returns (address)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function price0CumulativeLast() external view returns (uint)",
    "function price1CumulativeLast() external view returns (uint)",
    "function kLast() external view returns (uint)"
];

const ALCHEMY_URL = "https://base-mainnet.g.alchemy.com/v2/IGrO62DtBi6xJFam8p293-Bd2FibHonH";
const provider = new JsonRpcProvider(ALCHEMY_URL);

const poolAddress = "0x5dc05033e825ef24fcdc7fafdeb85d0fc27c78f9";

async function testContractInteraction() {
    console.log("Starting contract interaction test...");

    const poolContract = new ethers.Contract(poolAddress, UniswapV2PoolABI, provider);

    try {
        console.log("Attempting to call factory()...");
        const factory = await poolContract.factory();
        console.log("Factory:", factory);

        console.log("Attempting to call token0()...");
        const token0 = await poolContract.token0();
        console.log("Token0:", token0);

        console.log("Attempting to call token1()...");
        const token1 = await poolContract.token1();
        console.log("Token1:", token1);

        console.log("Attempting to call getReserves()...");
        const reserves = await poolContract.getReserves();
        console.log("Reserves:", reserves);

        console.log("Attempting to call price0CumulativeLast()...");
        const price0CumulativeLast = await poolContract.price0CumulativeLast();
        console.log("Price0CumulativeLast:", price0CumulativeLast.toString());

        console.log("Attempting to call price1CumulativeLast()...");
        const price1CumulativeLast = await poolContract.price1CumulativeLast();
        console.log("Price1CumulativeLast:", price1CumulativeLast.toString());

        console.log("Attempting to call kLast()...");
        const kLast = await poolContract.kLast();
        console.log("KLast:", kLast.toString());

    } catch (error) {
        console.error("Detailed error:", JSON.stringify(error, null, 2));
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error data:", error.data);
    }
}

testContractInteraction().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
