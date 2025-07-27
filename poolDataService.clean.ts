import axios from 'axios';
import { PoolInfo } from './types';
import { API_ENDPOINTS } from './config';
import { Connection } from '@solana/web3.js';
import chalk from 'chalk';

export class PoolDataService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    console.log(chalk.blue('PoolDataService initialized'));
  }

  /**
   * Get recent pools from Raydium API V3 - main data source for listening phase
   */
  async fetchRaydiumPools(): Promise<PoolInfo[]> {
    console.log(chalk.blue('\n[RAYDIUM] Starting pool fetch...'));
    
    try {
      console.log(chalk.white(`[RAYDIUM] Calling: ${API_ENDPOINTS.RAYDIUM}/pools/info/list`));
      
      const response = await axios.get(`${API_ENDPOINTS.RAYDIUM}/pools/info/list`, {
        params: {
          poolType: 'standard',
          poolSortField: 'apr24h',
          sortType: 'desc',
          pageSize: 50,
          page: 1,
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SolanaYieldBot/1.0',
        },
      });

      console.log(chalk.green(`[RAYDIUM] Response received (${response.status})`));
      console.log(chalk.white(`[RAYDIUM] Response structure:`));
      console.log(chalk.gray(`   - success: ${response.data?.success}`));
      console.log(chalk.gray(`   - data count: ${response.data?.data?.count || 0}`));
      console.log(chalk.gray(`   - pools length: ${response.data?.data?.data?.length || 0}`));

      if (!response.data?.success) {
        console.log(chalk.red(`[RAYDIUM] API error: ${response.data?.msg || 'Unknown error'}`));
        return [];
      }

      const pools = response.data.data?.data || [];
      console.log(chalk.green(`[RAYDIUM] Found ${pools.length} total pools`));

      const recentPools: PoolInfo[] = [];
      const now = Date.now();
      const maxAge = 72 * 60 * 60 * 1000; // 72 hours

      console.log(chalk.blue(`[RAYDIUM] Processing pools (max age: 72h)...`));

      for (let i = 0; i < Math.min(pools.length, 50); i++) {
        const pool = pools[i];
        
        try {
          if (!pool.id || !pool.mintA || !pool.mintB) {
            console.log(chalk.yellow(`[RAYDIUM] Pool ${i}: Missing required fields`));
            continue;
          }

          const poolOpenTime = parseInt(pool.openTime) * 1000;
          const poolAge = now - poolOpenTime;
          
          if (poolAge > maxAge) {
            console.log(chalk.gray(`[RAYDIUM] Pool ${i}: Too old (${Math.round(poolAge/3600000)}h)`));
            continue;
          }

          const tvl = parseFloat(pool.tvl || '0');
          const volume24h = parseFloat(pool.day?.volume || '0');
          const fees24h = parseFloat(pool.day?.volumeFee || '0');
          const apr24h = parseFloat(pool.day?.apr || '0');

          console.log(chalk.white(`[RAYDIUM] Pool ${i}: ${pool.mintA.symbol}/${pool.mintB.symbol}`));
          console.log(chalk.gray(`   TVL: $${tvl.toLocaleString()}, Vol: $${volume24h.toLocaleString()}, APR: ${apr24h.toFixed(2)}%`));

          const poolInfo: PoolInfo = {
            poolId: pool.id,
            baseToken: {
              mint: pool.mintA.address,
              symbol: pool.mintA.symbol || 'UNKNOWN',
              decimals: pool.mintA.decimals || 9,
              amount: parseFloat(pool.mintAmountA || '0'),
            },
            quoteToken: {
              mint: pool.mintB.address,
              symbol: pool.mintB.symbol || 'UNKNOWN',
              decimals: pool.mintB.decimals || 9,
              amount: parseFloat(pool.mintAmountB || '0'),
            },
            tvl,
            volume24h,
            fees24h,
            apy: Math.min(apr24h, 1000),
            createdAt: new Date(poolOpenTime),
            lpTokenSupply: parseFloat(pool.lpMint?.supply || '0'),
            price: parseFloat(pool.price || '0'),
          };

          // Simple filtering for listening phase
          if (tvl > 100 && volume24h > 0 && apr24h > 0 && apr24h < 50000) {
            recentPools.push(poolInfo);
            console.log(chalk.green(`[RAYDIUM] Pool ${i}: Added (APY: ${poolInfo.apy.toFixed(2)}%)`));
          } else {
            console.log(chalk.yellow(`[RAYDIUM] Pool ${i}: Filtered out (TVL: $${tvl}, Vol: $${volume24h}, APR: ${apr24h.toFixed(2)}%)`));
          }

        } catch (error) {
          console.log(chalk.red(`[RAYDIUM] Pool ${i}: Processing error - ${error.message}`));
          continue;
        }
      }

      console.log(chalk.green(`[RAYDIUM] Processing complete: ${recentPools.length} qualifying pools`));
      return recentPools;

    } catch (error) {
      console.log(chalk.red(`[RAYDIUM] Request failed: ${error.message}`));
      if (error.response) {
        console.log(chalk.red(`   Status: ${error.response.status}`));
        console.log(chalk.red(`   Data: ${JSON.stringify(error.response.data, null, 2)}`));
      }
      return [];
    }
  }

  /**
   * Create synthetic pools for testing - used when real APIs fail
   */
  async fetchJupiterData(): Promise<PoolInfo[]> {
    console.log(chalk.blue('\n[JUPITER] Creating synthetic pools for testing...'));
    
    const syntheticPools: PoolInfo[] = [];
    const topTokens = [
      { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
      { symbol: 'WIF', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
      { symbol: 'POPCAT', address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
      { symbol: 'MEW', address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5' },
      { symbol: 'MOTHER', address: '3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN' },
    ];

    for (let i = 0; i < topTokens.length; i++) {
      const token = topTokens[i];
      
      try {
        const tvl = Math.random() * 50000 + 10000;
        const volume24h = Math.random() * 25000 + 5000;
        const fees24h = volume24h * 0.0025;
        const apy = this.calculateAPY(fees24h, tvl, volume24h);

        const poolInfo: PoolInfo = {
          poolId: `jupiter_${token.address}`,
          baseToken: {
            mint: token.address,
            symbol: token.symbol,
            decimals: 9,
            amount: tvl / (Math.random() * 10 + 1),
          },
          quoteToken: {
            mint: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            decimals: 9,
            amount: tvl / 150,
          },
          tvl,
          volume24h,
          fees24h,
          apy,
          createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          lpTokenSupply: tvl * 100,
          price: Math.random() * 100,
        };

        syntheticPools.push(poolInfo);
        console.log(chalk.white(`[JUPITER] Created synthetic pool: ${token.symbol}/SOL (APY: ${apy.toFixed(2)}%)`));

      } catch (error) {
        console.log(chalk.red(`[JUPITER] Error processing token ${i}: ${error.message}`));
      }
    }

    console.log(chalk.green(`[JUPITER] Created ${syntheticPools.length} synthetic pools`));
    return syntheticPools;
  }

  /**
   * Calculate APY based on fees and TVL
   */
  calculateAPY(fees24h: number, tvl: number, volume24h: number = 0): number {
    if (tvl <= 0) return 0;
    
    const dailyYield = fees24h / tvl;
    const apy = dailyYield * 365 * 100;
    
    // Add volume-based boost for high-volume pools
    const volumeBoost = Math.min(volume24h / tvl, 2) * 0.1;
    
    return Math.max(0, apy + volumeBoost);
  }

  /**
   * Validate pool data quality
   */
  validatePoolData(pool: PoolInfo): boolean {
    const isValid = (
      pool.tvl > 0 &&
      pool.apy >= 0 &&
      pool.volume24h >= 0 &&
      pool.baseToken.amount >= 0 &&
      pool.quoteToken.amount >= 0 &&
      pool.lpTokenSupply >= 0
    );

    if (!isValid) {
      console.log(chalk.yellow(`[VALIDATION] Pool ${pool.poolId} failed validation`));
    }

    return isValid;
  }
}
