const { ethers } = require('ethers');

async function getPairImmutables(pairContract) {
    const [token0, token1, pairAddress] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.address
    ]);

    return { token0, token1, pairAddress };
}

async function getPairState(pairContract) {
    const [reserve0, reserve1, blockTimestampLast] = await Promise.all([
        pairContract.getReserves(),
        pairContract.blockTimestampLast()
    ]);

    const [reserve0Amount, reserve1Amount] = reserve0;

    return { reserve0Amount, reserve1Amount, blockTimestampLast };
}

module.exports = { getPairImmutables, getPairState };
