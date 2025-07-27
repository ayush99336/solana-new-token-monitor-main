import { PoolInfo } from './types';

/**
 * Demo pool data for testing and demonstration purposes
 * This simulates real Solana liquidity pools with realistic metrics
 */
export const DEMO_POOLS: PoolInfo[] = [
  {
    poolId: 'demo_pool_1_high_apy',
    baseToken: {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      decimals: 6,
      amount: 50000,
    },
    quoteToken: {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9,
      amount: 300,
    },
    tvl: 75000,
    volume24h: 25000,
    fees24h: 62.5,
    apy: 18.5, // High APY - should trigger entry
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lpTokenSupply: 1000000,
    price: 167.5,
  },
  {
    poolId: 'demo_pool_2_medium_apy',
    baseToken: {
      mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      symbol: 'RAY',
      decimals: 6,
      amount: 100000,
    },
    quoteToken: {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9,
      amount: 150,
    },
    tvl: 45000,
    volume24h: 15000,
    fees24h: 37.5,
    apy: 14.2, // Medium APY - should trigger entry
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    lpTokenSupply: 750000,
    price: 0.45,
  },
  {
    poolId: 'demo_pool_3_low_apy',
    baseToken: {
      mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
      symbol: 'ORCA',
      decimals: 6,
      amount: 80000,
    },
    quoteToken: {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9,
      amount: 120,
    },
    tvl: 30000,
    volume24h: 8000,
    fees24h: 20,
    apy: 8.5, // Low APY - should be skipped
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    lpTokenSupply: 500000,
    price: 2.5,
  },
  {
    poolId: 'demo_pool_4_very_high_apy',
    baseToken: {
      mint: 'memeToken123456789',
      symbol: 'MEME',
      decimals: 9,
      amount: 1000000,
    },
    quoteToken: {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9,
      amount: 50,
    },
    tvl: 12000,
    volume24h: 35000,
    fees24h: 87.5,
    apy: 125.0, // Very high APY - risky but might be entered with warnings
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago (very new)
    lpTokenSupply: 2000000,
    price: 0.012,
  },
  {
    poolId: 'demo_pool_5_low_liquidity',
    baseToken: {
      mint: 'lowLiqToken987654321',
      symbol: 'LOW',
      decimals: 6,
      amount: 5000,
    },
    quoteToken: {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      decimals: 9,
      amount: 25,
    },
    tvl: 5500, // Below minimum TVL
    volume24h: 2000,
    fees24h: 5,
    apy: 22.0, // High APY but low liquidity
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    lpTokenSupply: 100000,
    price: 0.22,
  },
  {
    poolId: 'demo_pool_6_balanced',
    baseToken: {
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      symbol: 'USDT',
      decimals: 6,
      amount: 60000,
    },
    quoteToken: {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      decimals: 6,
      amount: 58000,
    },
    tvl: 118000,
    volume24h: 40000,
    fees24h: 100,
    apy: 16.8, // Good APY with high liquidity
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    lpTokenSupply: 1500000,
    price: 1.03,
  },
];

/**
 * Get a random subset of demo pools to simulate discovery
 */
export function getRandomDemoPools(count: number = 3): PoolInfo[] {
  const shuffled = [...DEMO_POOLS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, DEMO_POOLS.length));
}

/**
 * Simulate pool performance changes over time
 */
export function simulatePoolChanges(pool: PoolInfo): PoolInfo {
  const updatedPool = { ...pool };
  
  // Simulate small random changes in APY (-2% to +2%)
  const apyChange = (Math.random() - 0.5) * 4;
  updatedPool.apy = Math.max(0, pool.apy + apyChange);
  
  // Simulate volume changes (-20% to +20%)
  const volumeChange = (Math.random() - 0.5) * 0.4;
  updatedPool.volume24h = Math.max(0, pool.volume24h * (1 + volumeChange));
  
  // Simulate price changes (-5% to +5%)
  const priceChange = (Math.random() - 0.5) * 0.1;
  updatedPool.price = Math.max(0.001, pool.price * (1 + priceChange));
  
  // Update fees based on volume
  updatedPool.fees24h = updatedPool.volume24h * 0.0025; // 0.25% fee
  
  return updatedPool;
}
