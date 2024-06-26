const { ethers } = require('ethers');
const { keccak256, getCreate2Address, solidityPack } = ethers.utils;
require('dotenv').config();
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');

// Function to compute the address
function getPoolAddress(factoryAddress, tokenA, tokenB, fee) {
    const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];

    const salt = keccak256(solidityPack(
        ['address', 'address', 'uint24'],
        [token0, token1, fee]
    ));

    const POOL_INIT_CODE_HASH = '0xe34fbbf4a139ae56ab8b7977fc3b6efc84f0f0d49e6b8e13f8f7c112f4b27d3c';

    const poolAddress = getCreate2Address(
        factoryAddress,
        salt,
        POOL_INIT_CODE_HASH
    );

    return poolAddress;
}

async function main() {
    const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
    if (!INFURA_URL_TESTNET) {
        console.error("Please ensure .env file has INFURA_URL_TESTNET defined");
        process.exit(1);
    }

    const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_TESTNET);

    const factoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Uniswap V3 Factory Address
    const tokenA = '0x4200000000000000000000000000000000000006'; // WETH on Base
    const tokenB = '0xfde8ceb2e4d4d58480815a0a95d38e3834366b46'; // KIBERA on Base
    const fee = 3000; // Fee tier (e.g., 3000 for 0.3%)

    const poolAddress = getPoolAddress(factoryAddress, tokenA, tokenB, fee);
    console.log('Computed Pool Address:', poolAddress);

    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);

    try {
        const token0 = await poolContract.token0();
        const token1 = await poolContract.token1();
        console.log('Token0:', token0);
        console.log('Token1:', token1);
    } catch (error) {
        console.error("Error accessing pool contract:", error);
    }
}

main().catch(error => {
    console.error("Error in main function:", error);
});
