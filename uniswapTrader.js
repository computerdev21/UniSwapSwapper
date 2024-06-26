const ethers = require('ethers');
const { JsonRpcProvider } = require('@ethersproject/providers');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { getPoolImmutables, getPoolState } = require('./helpers');
const ERC20ABI = require('./abi.json');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;

if (!INFURA_URL_TESTNET) {
    console.error("Please ensure .env file has INFURA_URL_TESTNET defined");
    process.exit(1);
}

const provider = new JsonRpcProvider(INFURA_URL_TESTNET);

const poolAddress = "0x5dc05033e825ef24fcdc7fafdeb85d0fc27c78f9"; // KIBERA/WETH pool address
const swapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const name0 = 'Wrapped Ether';
const symbol0 = 'WETH';
const decimals0 = 18;
const address0 = '0x4200000000000000000000000000000000000006'; // WETH on Base

const name1 = 'KIBAbera';
const symbol1 = 'KIBERA';
const decimals1 = 18;
const address1 = '0xfde8ceb2e4d4d58480815a0a95d38e3834366b46'; // Kibabera on Base

async function performSwap(walletAddress, walletSecret) {
    console.log(`Starting script for wallet: ${walletAddress}...`);

    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);

    try {
        // Test basic interaction with the contract
        const slot0 = await poolContract.slot0();
        console.log("Slot0:", slot0);

        const immutables = await getPoolImmutables(poolContract);
        const state = await getPoolState(poolContract);

        console.log("Pool Immutables:", immutables);
        console.log("Pool State:", state);

        const wallet = new ethers.Wallet(walletSecret);
        const connectedWallet = wallet.connect(provider);

        const swapRouterContract = new ethers.Contract(swapRouterAddress, SwapRouterABI, provider);

        const inputAmount = 0.00005;
        const amountIn = ethers.utils.parseUnits(inputAmount.toString(), decimals0);

        const approvalAmount = amountIn.mul(10).toString();
        const tokenContract0 = new ethers.Contract(address0, ERC20ABI, provider);

        console.log("Approving token...");
        const approvalResponse = await tokenContract0.connect(connectedWallet).approve(swapRouterAddress, approvalAmount);
        console.log("Approval response:", approvalResponse);

        const params = {
            tokenIn: immutables.token1,
            tokenOut: immutables.token0,
            fee: immutables.fee,
            recipient: walletAddress,
            deadline: Math.floor(Date.now() / 1000) + (60 * 10),
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        };

        console.log("Executing swap with params:", params);

        const transaction = await swapRouterContract.connect(connectedWallet).exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(10000000)
        });
        console.log("Transaction:", transaction);
    } catch (error) {
        console.error("Detailed error:", JSON.stringify(error, null, 2));
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error data:", error.data);
    }
}

async function fetchWalletsAndPerformSwaps() {
    const db = new sqlite3.Database('./wallets.db');

    db.serialize(() => {
        db.each("SELECT address, secret FROM wallets", async (err, row) => {
            if (err) {
                console.error("Error fetching wallet data:", err);
                return;
            }
            await performSwap(row.address, row.secret);
        });
    });

    db.close();
}

cron.schedule('* * * * *', () => {
    fetchWalletsAndPerformSwaps().catch(error => {
        console.error("Error in fetchWalletsAndPerformSwaps function:", error);
    });
});

console.log("Bot started, running every minute...");
