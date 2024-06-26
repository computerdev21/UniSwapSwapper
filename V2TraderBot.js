const { ethers } = require('ethers');
const { JsonRpcProvider } = require('@ethersproject/providers');
const { abi: IUniswapV2PairABI } = require('@uniswap/v2-core/build/IUniswapV2Pair.json');
const { abi: UniswapV2RouterABI } = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');
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

const pairAddress = "0x5dc05033e825ef24fcdc7fafdeb85d0fc27c78f9"; // Uniswap V2 pair address
const routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Uniswap V2 router address

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

    const wallet = new ethers.Wallet(walletSecret, provider);
    const pairContract = new ethers.Contract(pairAddress, IUniswapV2PairABI, provider);

    try {
        const [reserve0, reserve1, blockTimestampLast] = await pairContract.getReserves();

        console.log("Reserve0:", reserve0.toString());
        console.log("Reserve1:", reserve1.toString());
        console.log("Block Timestamp Last:", blockTimestampLast.toString());

        const routerContract = new ethers.Contract(routerAddress, UniswapV2RouterABI, wallet);

        const inputAmount = ethers.utils.parseUnits('0.0001', decimals0);

        const approvalAmount = inputAmount.mul(10).toString();
        const tokenContract0 = new ethers.Contract(address0, ERC20ABI, wallet);

        console.log("Approving token...");
        const approvalResponse = await tokenContract0.approve(routerAddress, approvalAmount);
        console.log("Approval response:", approvalResponse);

        // Wait for the approval transaction to be mined
        await approvalResponse.wait();

        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        console.log("Executing swap...");
        const transaction = await routerContract.swapExactTokensForTokens(
            inputAmount,
            0, // Set amountOutMin based on calculation or risk tolerance
            [address0, address1],
            walletAddress,
            deadline,
            { gasLimit: ethers.utils.hexlify(10000000) }
        );
        console.log("Transaction:", transaction);

        // Wait for the swap transaction to be mined
        const receipt = await transaction.wait();
        console.log("Transaction receipt:", receipt);
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
