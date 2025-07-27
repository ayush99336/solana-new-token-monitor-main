"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONITORING = exports.POOL_EVALUATION = exports.API_ENDPOINTS = exports.TOKENS = exports.DEX_PROGRAM_IDS = exports.DEFAULT_BOT_CONFIG = void 0;
exports.DEFAULT_BOT_CONFIG = {
    // Entry criteria - adjusted for real Raydium data
    minApy: 20.0, // Minimum 20% APY (real pools have much higher APRs)
    minTvl: 100, // Minimum $100 TVL (many real pools have low TVL)
    minVolume24h: 1000, // Minimum $1K daily volume
    maxPositions: 5, // Maximum 5 concurrent positions
    positionSize: 1000, // $1000 per position
    // Exit criteria
    exitApyThreshold: 10.0, // Exit if APY drops below 10%
    stopLossPercentage: -15.0, // Exit if loss exceeds 15%
    takeProfitPercentage: 25.0, // Exit if profit exceeds 25%
    maxHoldingTime: 168, // Max 7 days (168 hours)
    // Risk management
    maxTotalInvestment: 10000, // Maximum $10K total investment
    riskPerPosition: 10.0, // Maximum 10% risk per position
};
// Known Solana DEX program IDs
exports.DEX_PROGRAM_IDS = {
    RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    RAYDIUM_V5: '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h',
    ORCA: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
    SERUM: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    OPENBOOK: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
};
// Token addresses
exports.TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};
// API endpoints for data fetching
exports.API_ENDPOINTS = {
    DEXSCREENER: 'https://api.dexscreener.com/latest/dex',
    BIRDEYE: 'https://public-api.birdeye.so/defi',
    COINGECKO: 'https://api.coingecko.com/api/v3',
    JUPITER_PAID: 'https://quote-api.jup.ag/v6', // For paid tier with API key
    JUPITER_FREE: 'https://quote-api.jup.ag/v6', // For free tier (1 RPS, 60 RPM)
    RAYDIUM: 'https://api-v3.raydium.io', // Updated to V3
};
// Pool evaluation thresholds
exports.POOL_EVALUATION = {
    MIN_AGE_HOURS: 1, // Minimum pool age before considering
    MAX_AGE_HOURS: 72, // Maximum pool age to consider (3 days)
    MIN_LIQUIDITY_RATIO: 0.3, // Minimum ratio of balanced liquidity
    MAX_PRICE_IMPACT: 5.0, // Maximum acceptable price impact percentage
    MIN_TRANSACTION_COUNT: 10, // Minimum number of transactions
};
// Monitoring intervals
exports.MONITORING = {
    POOL_SCAN_INTERVAL: 30000, // Scan for new pools every 30 seconds
    POSITION_UPDATE_INTERVAL: 60000, // Update positions every minute
    PERFORMANCE_LOG_INTERVAL: 300000, // Log performance every 5 minutes
    DATA_CLEANUP_INTERVAL: 86400000, // Cleanup old data every 24 hours
};
