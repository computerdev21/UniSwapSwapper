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

const pairAddress = "0x5dc05033e825ef24fcdc7fafdeb85d0fc27c78f9";
const routerAddress = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';

const name0 = 'Wrapped Ether';
const symbol0 = 'WETH';
const decimals0 = 18;
const address0 = '0x4200000000000000000000000000000000000006';

const name1 = 'KIBAbera';
const symbol1 = 'KIBERA';
const decimals1 = 18;
const address1 = '0xfde8ceb2e4d4d58480815a0a95d38e3834366b46';

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

        const inputAmount = ethers.utils.parseUnits('0.002', decimals0); // Increased amount for visibility
        console.log(`Amount to swap: ${ethers.utils.formatUnits(inputAmount, decimals0)} ${symbol0}`);

        const approvalAmount = inputAmount.mul(10).toString();
        const tokenContract0 = new ethers.Contract(address0, ERC20ABI, wallet);

        console.log("Approving token...");
        const approvalResponse = await tokenContract0.approve(routerAddress, approvalAmount);
        console.log("Approval transaction hash:", approvalResponse.hash);

        console.log("Waiting for approval confirmation...");
        const approvalReceipt = await approvalResponse.wait();
        console.log("Approval confirmed in block:", approvalReceipt.blockNumber);

        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        // Get current gas prices
        const feeData = await provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas;
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

        // Estimate gas limit for the swap transaction
        const estimatedGasLimit = await routerContract.estimateGas.swapExactTokensForTokens(
            inputAmount,
            0,
            [address0, address1],
            walletAddress,
            deadline
        );

        console.log("Executing swap...");
        const transaction = await routerContract.swapExactTokensForTokens(
            inputAmount,
            0,
            [address0, address1],
            walletAddress,
            deadline,
            {
                gasLimit: estimatedGasLimit,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas
            }
        );
        console.log("Swap transaction hash:", transaction.hash);

        console.log("Waiting for swap confirmation...");
        const receipt = await transaction.wait();
        console.log("Swap confirmed in block:", receipt.blockNumber);

        // Calculate gas cost
        const gasUsed = receipt.gasUsed;
        const effectiveGasPrice = receipt.effectiveGasPrice;
        const gasCost = gasUsed.mul(effectiveGasPrice);
        console.log(`Gas used: ${gasUsed.toString()}`);
        console.log(`Gas cost: ${ethers.utils.formatEther(gasCost)} ETH`);

        // Get all events emitted by the pair contract
        const filter = pairContract.filters.Swap();
        const events = await pairContract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);

        if (events.length > 0) {
            events.forEach(event => {
                console.log(`Event: ${event.event}`);
                console.log(`  Transaction Hash: ${event.transactionHash}`);
                console.log(`  Amount In: ${ethers.utils.formatUnits(event.args.amount0In, decimals0)} ${symbol0}`);
                console.log(`  Amount Out: ${ethers.utils.formatUnits(event.args.amount1Out, decimals1)} ${symbol1}`);
            });
        } else {
            console.log("No Swap events found in transaction receipt");
        }

        // Summary
        console.log("\nSwap Summary:");
        console.log(`Amount transferred: ${ethers.utils.formatUnits(inputAmount, decimals0)} ${symbol0}`);
        console.log(`Gas cost: ${ethers.utils.formatEther(gasCost)} ETH`);
        if (events.length > 0) {
            const swapEvent = events[0];
            console.log(`Amount received: ${ethers.utils.formatUnits(swapEvent.args.amount1Out, decimals1)} ${symbol1}`);
        }

        return true; // Swap completed successfully
    } catch (error) {
        console.error("Detailed error:", JSON.stringify(error, null, 2));
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error data:", error.data);
        return false; // Swap failed
    }
}

async function fetchWalletsAndPerformSwaps() {
    const db = new sqlite3.Database('./wallets.db');

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.each("SELECT address, secret FROM wallets", async (err, row) => {
                if (err) {
                    console.error("Error fetching wallet data:", err);
                    reject(err);
                    return;
                }
                const success = await performSwap(row.address, row.secret);
                if (!success) {
                    console.error(`Swap failed for wallet: ${row.address}`);
                }
            }, (err, count) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(count);
                }
            });
        });

        db.close();
    });
}

async function main() {
    console.log("Starting initial swap...");
    try {
        await fetchWalletsAndPerformSwaps();
        console.log("Initial swap completed. Starting cron job...");

        cron.schedule('* * * * *', async () => {
            console.log("Running scheduled swap...");
            try {
                await fetchWalletsAndPerformSwaps();
                console.log("Scheduled swap completed successfully.");
            } catch (error) {
                console.error("Error in scheduled swap:", error);
            }
        });
    } catch (error) {
        console.error("Error in initial swap:", error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error("Unhandled error in main function:", error);
    process.exit(1);
});
