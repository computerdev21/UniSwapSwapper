const ethers = require('ethers');
const { JsonRpcProvider } = require('@ethersproject/providers');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { getPoolImmutables, getPoolState } = require('./helpers');
const ERC20ABI = require('./abi.json');

require('dotenv').config();

const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;

if (!INFURA_URL_TESTNET || !WALLET_ADDRESS || !WALLET_SECRET) {
    console.error("Please ensure .env file has INFURA_URL_TESTNET, WALLET_ADDRESS, and WALLET_SECRET defined");
    process.exit(1);
}

const provider = new JsonRpcProvider(INFURA_URL_TESTNET);

const poolAddress = "0x51adc79e7760ac5317a0d05e7a64c4f9cb2d4369"; // UNI/WETH on Sepolia
const swapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const name0 = 'Wrapped Ether';
const symbol0 = 'WETH';
const decimals0 = 18;
const address0 = '0xc778417e063141139fce010982780140aa0cd5ab'; // WETH on Sepolia

const name1 = 'Uniswap Token';
const symbol1 = 'UNI';
const decimals1 = 18;
const address1 = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'; // UNI

async function main() {
    console.log("Starting script...");

    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);

    const immutables = await getPoolImmutables(poolContract);
    const state = await getPoolState(poolContract);

    console.log("Pool Immutables:", immutables);
    console.log("Pool State:", state);

    const wallet = new ethers.Wallet(WALLET_SECRET);
    const connectedWallet = wallet.connect(provider);

    const swapRouterContract = new ethers.Contract(swapRouterAddress, SwapRouterABI, provider);

    const inputAmount = 0.001;
    const amountIn = ethers.utils.parseUnits(inputAmount.toString(), decimals0);

    const approvalAmount = amountIn.mul(100000).toString();
    const tokenContract0 = new ethers.Contract(address0, ERC20ABI, provider);

    console.log("Approving token...");
    const approvalResponse = await tokenContract0.connect(connectedWallet).approve(swapRouterAddress, approvalAmount);
    console.log("Approval response:", approvalResponse);

    const params = {
        tokenIn: immutables.token1,
        tokenOut: immutables.token0,
        fee: immutables.fee,
        recipient: WALLET_ADDRESS,
        deadline: Math.floor(Date.now() / 1000) + (60 * 10),
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };

    console.log("Executing swap...");
    try {
        const transaction = await swapRouterContract.connect(connectedWallet).exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000)
        });
        console.log("Transaction:", transaction);
    } catch (error) {
        console.error("Error executing transaction:", error);
    }
}

main().catch(error => {
    console.error("Error in main function:", error);
});