import { PoolInfo, PoolPerformanceMetrics } from './types';
import { PoolDataService } from './poolDataService';
import { PoolEvaluator } from './poolEvaluator';
import { solanaConnection } from './constants';
import { DEFAULT_BOT_CONFIG, MONITORING } from './config';
import chalk from 'chalk';

export class PoolMonitor {
  private poolDataService: PoolDataService;
  private poolEvaluator: PoolEvaluator;
  private isRunning: boolean = false;
  private poolCache: Map<string, PoolInfo> = new Map();
  private lastPoolScan: number = 0;
  private currentPools: PoolInfo[] = [];
  private watchlist: Set<string> = new Set();

  constructor() {
    this.poolDataService = new PoolDataService(solanaConnection);
    this.poolEvaluator = new PoolEvaluator(DEFAULT_BOT_CONFIG, this.logDecision.bind(this));

    console.log(chalk.blue('  Pool Monitor Initialized'));
    console.log(chalk.white('Focus: Listening → Decision Making'));
    console.log(chalk.white(`Scan Interval: ${MONITORING.POOL_SCAN_INTERVAL / 1000}s`));
  }

  /**
   * Start the pool monitoring system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(chalk.yellow('Monitor is already running'));
      return;
    }

    this.isRunning = true;
    console.log(chalk.green('\n Starting Pool Monitor...'));
    console.log(chalk.blue(' Entering listening phase...'));

    // Initial scan
    await this.scanAndEvaluate();

    // Set up continuous monitoring
    const scanInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(scanInterval);
        return;
      }
      await this.scanAndEvaluate();
    }, MONITORING.POOL_SCAN_INTERVAL);

    // Set up watchlist monitoring
    const watchInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(watchInterval);
        return;
      }
      await this.monitorWatchlist();
    }, MONITORING.POSITION_UPDATE_INTERVAL);

    console.log(chalk.green(' Pool Monitor is now running'));
  }

  /**
   * Stop the monitor
   */
  stop(): void {
    this.isRunning = false;
    console.log(chalk.yellow('\nPool Monitor stopped'));
    this.logSummary();
  }

  /**
   * LISTENING PHASE: Scan for new pools and evaluate them
   */
  private async scanAndEvaluate(): Promise<void> {
    const now = Date.now();
    
    // Rate limiting
    if (now - this.lastPoolScan < MONITORING.POOL_SCAN_INTERVAL) {
      return;
    }
    
    this.lastPoolScan = now;

    console.log(chalk.blue('\n === LISTENING PHASE ==='));
    console.log(chalk.white(` ${new Date().toLocaleTimeString()}`));

    try {
      // 1. Discover pools from all sources
      const discoveredPools = await this.discoverPools();
      
      // 2. Update current pool list
      this.updatePoolCache(discoveredPools);
      
      // 3. DECISION PHASE: Evaluate each pool
      console.log(chalk.cyan('\n === DECISION PHASE ==='));
      await this.evaluateDiscoveredPools(discoveredPools);
      
    } catch (error) {
      console.log(chalk.red(` Scan failed: ${error.message}`));
    }
  }

  /**
   * LISTENING: Discover pools from all sources
   */
  private async discoverPools(): Promise<PoolInfo[]> {
    console.log(chalk.blue(' Discovering pools from all sources...'));
    
    const allPools: PoolInfo[] = [];
    
    try {
      // Get pools from Raydium (primary source)
      console.log(chalk.white(' Scanning Raydium API V3...'));
      const raydiumPools = await this.poolDataService.fetchRaydiumPools();
      allPools.push(...raydiumPools);
      console.log(chalk.green(` Raydium: ${raydiumPools.length} pools discovered`));
      
      // Get pools from Jupiter (secondary source)
      console.log(chalk.white(' Scanning Jupiter...'));
      const jupiterPools = await this.poolDataService.fetchJupiterData();
      allPools.push(...jupiterPools);
      console.log(chalk.green(` Jupiter: ${jupiterPools.length} pools discovered`));
      
      // Get pools from Birdeye (tertiary source)
      console.log(chalk.white(' Scanning Birdeye...'));
      const birdeyePools = await this.poolDataService.fetchBirdeyePools();
      allPools.push(...birdeyePools);
      console.log(chalk.green(` Birdeye: ${birdeyePools.length} pools discovered`));
      
      // Remove duplicates and validate
      const uniquePools = this.removeDuplicatePools(allPools)
        .filter(pool => this.poolDataService.validatePoolData(pool));
      
      console.log(chalk.green(` Total discovered: ${allPools.length} pools`));
      console.log(chalk.green(` After deduplication: ${uniquePools.length} unique pools`));
      
      return uniquePools;
      
    } catch (error) {
      console.log(chalk.red(` Pool discovery failed: ${error.message}`));
      return [];
    }
  }

  /**
   * DECISION PHASE: Evaluate discovered pools
   */
  private async evaluateDiscoveredPools(pools: PoolInfo[]): Promise<void> {
    if (pools.length === 0) {
      console.log(chalk.yellow(' No pools to evaluate'));
      return;
    }

    console.log(chalk.cyan(` Evaluating ${pools.length} discovered pools...`));
    
    const decisions: Array<{pool: PoolInfo, evaluation: any}> = [];
    
    for (const pool of pools) {
      try {
        // Evaluate pool for entry
        const evaluation = this.poolEvaluator.evaluatePoolForEntry(pool);
        decisions.push({ pool, evaluation });
        
        // Log decision
        this.logPoolDecision(pool, evaluation);
        
        // Add high-scoring pools to watchlist
        if (evaluation.shouldEnter && evaluation.score >= 80) {
          this.addToWatchlist(pool);
        }
        
      } catch (error) {
        console.log(chalk.red(` Error evaluating ${pool.poolId}: ${error.message}`));
      }
    }
    
    // Summary of decisions
    const enterDecisions = decisions.filter(d => d.evaluation.shouldEnter);
    const skipDecisions = decisions.filter(d => !d.evaluation.shouldEnter);
    
    console.log(chalk.cyan('\n === DECISION SUMMARY ==='));
    console.log(chalk.green(` Pools to ENTER: ${enterDecisions.length}`));
    console.log(chalk.yellow(`  Pools to SKIP: ${skipDecisions.length}`));
    console.log(chalk.blue(`  Total in watchlist: ${this.watchlist.size}`));
    
    // Show top recommendations
    if (enterDecisions.length > 0) {
      console.log(chalk.cyan('\n TOP RECOMMENDATIONS:'));
      enterDecisions
        .sort((a, b) => b.evaluation.score - a.evaluation.score)
        .slice(0, 3)
        .forEach((decision, i) => {
          const { pool, evaluation } = decision;
          console.log(chalk.white(`   ${i + 1}. ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
          console.log(chalk.gray(`      Score: ${evaluation.score}/100, APY: ${pool.apy.toFixed(2)}%, TVL: $${pool.tvl.toLocaleString()}`));
        });
    }
  }

  /**
   * Monitor pools in watchlist for changes
   */
  private async monitorWatchlist(): Promise<void> {
    if (this.watchlist.size === 0) {
      return;
    }

    console.log(chalk.blue(`\n  Monitoring ${this.watchlist.size} pools in watchlist...`));
    
    for (const poolId of this.watchlist) {
      try {
        // Get updated metrics
        const metrics = await this.poolDataService.getPoolMetrics(poolId);
        
        if (metrics) {
          // Check for significant changes
          const cachedPool = this.poolCache.get(poolId);
          if (cachedPool) {
            this.analyzePoolChanges(cachedPool, metrics);
          }
        }
        
      } catch (error) {
        console.log(chalk.red(` Error monitoring ${poolId}: ${error.message}`));
      }
    }
  }

  /**
   * Analyze changes in pool metrics
   */
  private analyzePoolChanges(pool: PoolInfo, newMetrics: PoolPerformanceMetrics): void {
    const apyChange = ((newMetrics.apy - pool.apy) / pool.apy) * 100;
    const tvlChange = ((newMetrics.tvl - pool.tvl) / pool.tvl) * 100;
    
    if (Math.abs(apyChange) > 10) { // 10% APY change
      console.log(chalk.yellow(` ${pool.baseToken.symbol}/${pool.quoteToken.symbol}: APY changed ${apyChange.toFixed(1)}%`));
    }
    
    if (Math.abs(tvlChange) > 20) { // 20% TVL change
      console.log(chalk.yellow(` ${pool.baseToken.symbol}/${pool.quoteToken.symbol}: TVL changed ${tvlChange.toFixed(1)}%`));
    }
    
    // Re-evaluate if significant change
    if (Math.abs(apyChange) > 15 || Math.abs(tvlChange) > 30) {
      console.log(chalk.cyan(` Re-evaluating ${pool.baseToken.symbol}/${pool.quoteToken.symbol} due to significant changes`));
      
      // Update pool with new metrics
      const updatedPool: PoolInfo = {
        ...pool,
        apy: newMetrics.apy,
        tvl: newMetrics.tvl,
        volume24h: newMetrics.volume24h,
        fees24h: newMetrics.fees24h,
        price: newMetrics.price,
      };
      
      const evaluation = this.poolEvaluator.evaluatePoolForEntry(updatedPool);
      this.logPoolDecision(updatedPool, evaluation, ' RE-EVAL');
    }
  }

  /**
   * Add pool to watchlist
   */
  private addToWatchlist(pool: PoolInfo): void {
    this.watchlist.add(pool.poolId);
    console.log(chalk.blue(`  Added ${pool.baseToken.symbol}/${pool.quoteToken.symbol} to watchlist`));
  }

  /**
   * Update pool cache
   */
  private updatePoolCache(pools: PoolInfo[]): void {
    pools.forEach(pool => {
      this.poolCache.set(pool.poolId, pool);
    });
    
    // Clean old entries (keep last 1000)
    if (this.poolCache.size > 1000) {
      const entries = Array.from(this.poolCache.entries());
      entries.slice(0, entries.length - 1000).forEach(([key]) => {
        this.poolCache.delete(key);
      });
    }
  }

  /**
   * Remove duplicate pools
   */
  private removeDuplicatePools(pools: PoolInfo[]): PoolInfo[] {
    const seen = new Set<string>();
    return pools.filter(pool => {
      const key = `${pool.baseToken.mint}-${pool.quoteToken.mint}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Log individual pool decision
   */
  private logPoolDecision(pool: PoolInfo, evaluation: any, prefix: string = ''): void {
    const decision = evaluation.shouldEnter ? 'ENTER' : 'SKIP';
    const color = evaluation.shouldEnter ? chalk.green : chalk.gray;
    
    console.log(color(`${prefix} ${decision}: ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
    console.log(color(`   Score: ${evaluation.score}/100, APY: ${pool.apy.toFixed(2)}%, TVL: $${pool.tvl.toLocaleString()}`));
    
    if (evaluation.shouldEnter) {
      console.log(chalk.white(`   Reasons: ${evaluation.reasons.join(', ')}`));
    }
  }

  /**
   * Log decision for tracking
   */
  private logDecision(action: any): void {
    // Simple logging - can be expanded
    console.log(chalk.gray(` Decision logged: ${action.type}`));
  }

  /**
   * Log monitoring summary
   */
  private logSummary(): void {
    console.log(chalk.cyan('\n === MONITORING SUMMARY ==='));
    console.log(chalk.white(`Total pools cached: ${this.poolCache.size}`));
    console.log(chalk.white(`Pools in watchlist: ${this.watchlist.size}`));
    console.log(chalk.white(`Last scan: ${new Date(this.lastPoolScan).toLocaleTimeString()}`));
  }
}
