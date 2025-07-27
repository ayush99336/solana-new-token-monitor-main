import { PoolInfo, PoolEvaluation, BotAction } from './types';
import { POOL_EVALUATION } from './config';
import chalk from 'chalk';

export class PoolEvaluator {
  private actionLogger: (action: BotAction) => void;

  constructor(actionLogger: (action: BotAction) => void) {
    this.actionLogger = actionLogger;
  }

  /**
   * Evaluate if a pool meets entry criteria for decision phase
   */
  evaluatePoolForEntry(pool: PoolInfo): PoolEvaluation {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Log evaluation attempt
    this.actionLogger({
      id: `eval_${pool.poolId}_${Date.now()}`,
      timestamp: new Date(),
      type: 'pool_evaluated',
      poolId: pool.poolId,
      details: { apy: pool.apy, tvl: pool.tvl, volume24h: pool.volume24h },
      success: true,
    });

    // 1. APY Check (Required)
    if (pool.apy >= POOL_EVALUATION.MIN_APY) {
      score += 30;
      reasons.push(`✓ APY ${pool.apy.toFixed(2)}% meets minimum ${POOL_EVALUATION.MIN_APY}%`);
    } else {
      return {
        poolId: pool.poolId,
        score: 0,
        decision: 'SKIP',
        reasons: [`✗ APY ${pool.apy.toFixed(2)}% below minimum ${POOL_EVALUATION.MIN_APY}%`],
        warnings,
        timestamp: new Date()
      };
    }

    // 2. TVL Check (Required)
    if (pool.tvl >= POOL_EVALUATION.MIN_TVL) {
      score += 20;
      reasons.push(`✓ TVL $${pool.tvl.toLocaleString()} meets minimum $${POOL_EVALUATION.MIN_TVL.toLocaleString()}`);
    } else {
      return {
        poolId: pool.poolId,
        score: 0,
        decision: 'SKIP',
        reasons: [`✗ TVL $${pool.tvl.toLocaleString()} below minimum $${POOL_EVALUATION.MIN_TVL.toLocaleString()}`],
        warnings,
        timestamp: new Date()
      };
    }

    // 3. Volume Check (Required)
    if (pool.volume24h >= POOL_EVALUATION.MIN_VOLUME_24H) {
      score += 20;
      reasons.push(`✓ 24h volume $${pool.volume24h.toLocaleString()} meets minimum $${POOL_EVALUATION.MIN_VOLUME_24H.toLocaleString()}`);
    } else {
      return {
        poolId: pool.poolId,
        score: 0,
        decision: 'SKIP',
        reasons: [`✗ 24h volume $${pool.volume24h.toLocaleString()} below minimum $${POOL_EVALUATION.MIN_VOLUME_24H.toLocaleString()}`],
        warnings,
        timestamp: new Date()
      };
    }

    // 4. Pool Age Analysis
    const now = Date.now();
    const poolAge = now - pool.createdAt.getTime();
    const ageHours = poolAge / (1000 * 60 * 60);

    if (ageHours >= POOL_EVALUATION.MIN_AGE_HOURS && ageHours <= POOL_EVALUATION.MAX_AGE_HOURS) {
      if (ageHours <= POOL_EVALUATION.SWEET_SPOT_AGE_HOURS) {
        score += 20;
        reasons.push(` Pool age ${ageHours.toFixed(1)}h in 24h incentive sweet spot`);
      } else {
        score += 10;
        reasons.push(`✓ Pool age ${ageHours.toFixed(1)}h within acceptable range`);
      }

      if (ageHours <= 12) {
        score += 15;
        reasons.push(` Ultra fresh pool (${ageHours.toFixed(1)}h)`);
      }
    } else if (ageHours < POOL_EVALUATION.MIN_AGE_HOURS) {
      warnings.push(` Pool too new (${ageHours.toFixed(1)}h), might be unstable`);
    } else {
      warnings.push(` Pool too old (${ageHours.toFixed(1)}h), incentives likely ended`);
    }

    // 5. High Incentive Bonus
    if (pool.apy >= POOL_EVALUATION.HIGH_INCENTIVE_THRESHOLD) {
      score += 25;
      reasons.push(` Ultra high incentive (${pool.apy.toFixed(2)}%+ APY)`);
    } else if (pool.apy >= 100) {
      score += 15;
      reasons.push(` High incentive (${pool.apy.toFixed(2)}%+ APY)`);
    }

    // 6. Volume Analysis
    if (pool.volume24h >= POOL_EVALUATION.HIGH_VOLUME_THRESHOLD) {
      score += 15;
      reasons.push(` High volume activity`);
    } else if (pool.volume24h >= POOL_EVALUATION.MIN_VOLUME_24H * 2) {
      score += 10;
      reasons.push(` Good volume activity`);
    }

    // 7. Risk/Reward Analysis
    if (pool.tvl < 1000 && pool.apy > 150) {
      score += 15;
      reasons.push(` Early entry opportunity (low TVL, high APY)`);
    }

    // 8. Sustainability Check
    if (pool.apy < 1000 && pool.volume24h > pool.tvl * 0.1) {
      score += 10;
      reasons.push(` Sustainable incentive metrics`);
    }

    // Warning for extreme APY
    if (pool.apy > 1000) {
      warnings.push(` Very high APY (${pool.apy.toFixed(2)}%) - monitor closely for exit`);
    }

    const decision = score >= POOL_EVALUATION.MIN_SCORE_TO_ENTER ? 'ENTER' : 'SKIP';

    console.log(chalk.cyan(`\n Pool Evaluation: ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
    console.log(chalk.white(`Score: ${score}/${POOL_EVALUATION.MIN_SCORE_TO_ENTER}`));
    console.log(chalk.white(`Decision: ${decision}`));

    return {
      poolId: pool.poolId,
      score,
      decision,
      reasons,
      warnings,
      timestamp: new Date()
    };
  }

  /**
   * Display evaluation results
   */
  displayEvaluation(pool: PoolInfo, evaluation: PoolEvaluation): void {
    const { decision, score, reasons, warnings } = evaluation;
    
    if (decision === 'ENTER') {
      console.log(chalk.green(` ${decision}: ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
    } else {
      console.log(chalk.yellow(` ${decision}: ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
    }
    
    console.log(chalk.white(`   Score: ${score}/${POOL_EVALUATION.MIN_SCORE_TO_ENTER}, APY: ${pool.apy.toFixed(2)}%, TVL: $${pool.tvl.toLocaleString()}`));
    
    if (reasons.length > 0) {
      console.log(chalk.cyan(`   Reasons: ${reasons.join(', ')}`));
    }
    
    if (warnings.length > 0) {
      console.log(chalk.yellow(`   Warnings: ${warnings.join(', ')}`));
    }
  }
}
