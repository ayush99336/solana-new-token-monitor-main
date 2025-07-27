"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolEvaluator = void 0;
const config_1 = require("./config");
const chalk_1 = __importDefault(require("chalk"));
class PoolEvaluator {
    constructor(config, actionLogger) {
        this.config = config;
        this.actionLogger = actionLogger;
    }
    /**
     * Evaluate if a pool meets entry criteria
     */
    evaluatePoolForEntry(pool) {
        const reasons = [];
        const warnings = [];
        let score = 0;
        // Log evaluation attempt
        this.actionLogger({
            id: `eval_${pool.poolId}_${Date.now()}`,
            timestamp: new Date(),
            type: 'pool_evaluated',
            poolId: pool.poolId,
            details: {
                apy: pool.apy,
                tvl: pool.tvl,
                volume24h: pool.volume24h,
                age: this.getPoolAgeHours(pool),
            },
            success: true,
        });
        // Check minimum APY
        if (pool.apy >= this.config.minApy) {
            score += 25;
            reasons.push(`✓ APY ${pool.apy.toFixed(2)}% meets minimum ${this.config.minApy}%`);
        }
        else {
            reasons.push(`✗ APY ${pool.apy.toFixed(2)}% below minimum ${this.config.minApy}%`);
            return { shouldEnter: false, score, reasons, warnings };
        }
        // Check minimum TVL
        if (pool.tvl >= this.config.minTvl) {
            score += 20;
            reasons.push(`✓ TVL $${pool.tvl.toLocaleString()} meets minimum $${this.config.minTvl.toLocaleString()}`);
        }
        else {
            reasons.push(`✗ TVL $${pool.tvl.toLocaleString()} below minimum $${this.config.minTvl.toLocaleString()}`);
            return { shouldEnter: false, score, reasons, warnings };
        }
        // Check minimum volume
        if (pool.volume24h >= this.config.minVolume24h) {
            score += 20;
            reasons.push(`✓ 24h volume $${pool.volume24h.toLocaleString()} meets minimum $${this.config.minVolume24h.toLocaleString()}`);
        }
        else {
            reasons.push(`✗ 24h volume $${pool.volume24h.toLocaleString()} below minimum $${this.config.minVolume24h.toLocaleString()}`);
            return { shouldEnter: false, score, reasons, warnings };
        }
        // Check pool age
        const ageHours = this.getPoolAgeHours(pool);
        if (ageHours >= config_1.POOL_EVALUATION.MIN_AGE_HOURS && ageHours <= config_1.POOL_EVALUATION.MAX_AGE_HOURS) {
            score += 15;
            reasons.push(`✓ Pool age ${ageHours.toFixed(1)}h within acceptable range`);
        }
        else if (ageHours < config_1.POOL_EVALUATION.MIN_AGE_HOURS) {
            warnings.push(`⚠ Pool is very new (${ageHours.toFixed(1)}h), higher risk`);
            score += 5; // Lower score but don't exclude
        }
        else {
            warnings.push(`⚠ Pool is old (${ageHours.toFixed(1)}h), potentially less profitable`);
            score += 5;
        }
        // Check liquidity balance
        const liquidityRatio = this.calculateLiquidityRatio(pool);
        if (liquidityRatio >= config_1.POOL_EVALUATION.MIN_LIQUIDITY_RATIO) {
            score += 10;
            reasons.push(`✓ Good liquidity balance (ratio: ${liquidityRatio.toFixed(2)})`);
        }
        else {
            warnings.push(`⚠ Unbalanced liquidity (ratio: ${liquidityRatio.toFixed(2)})`);
            score += 3;
        }
        // Bonus scoring for exceptional metrics
        if (pool.apy > this.config.minApy * 2) {
            score += 10;
            reasons.push(`🚀 Exceptional APY (${pool.apy.toFixed(2)}%)`);
        }
        if (pool.volume24h > this.config.minVolume24h * 5) {
            score += 5;
            reasons.push(`📈 High volume activity`);
        }
        // Check for red flags
        if (pool.apy > 100) {
            warnings.push(`🚨 Extremely high APY (${pool.apy.toFixed(2)}%) - possible rug pull risk`);
            score -= 20;
        }
        if (pool.tvl < pool.volume24h * 0.1) {
            warnings.push(`🚨 Low TVL relative to volume - high volatility risk`);
            score -= 10;
        }
        const shouldEnter = score >= 70; // Require minimum score of 70/100
        console.log(chalk_1.default.cyan(`\n📊 Pool Evaluation: ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
        console.log(chalk_1.default.white(`Score: ${score}/100`));
        console.log(chalk_1.default.white(`Decision: ${shouldEnter ? chalk_1.default.green('ENTER') : chalk_1.default.red('SKIP')}`));
        return { shouldEnter, score, reasons, warnings };
    }
    /**
     * Evaluate if a position should be exited
     */
    evaluatePositionForExit(position, currentPool) {
        const holdingTimeHours = (Date.now() - position.entryTime.getTime()) / (1000 * 60 * 60);
        // Check stop loss
        if (position.pnlPercentage <= this.config.stopLossPercentage) {
            return {
                shouldExit: true,
                reason: `Stop loss triggered: ${position.pnlPercentage.toFixed(2)}% loss`,
                urgency: 'high',
            };
        }
        // Check take profit
        if (position.pnlPercentage >= this.config.takeProfitPercentage) {
            return {
                shouldExit: true,
                reason: `Take profit triggered: ${position.pnlPercentage.toFixed(2)}% gain`,
                urgency: 'medium',
            };
        }
        // Check APY threshold
        if (currentPool.apy < this.config.exitApyThreshold) {
            return {
                shouldExit: true,
                reason: `APY dropped to ${currentPool.apy.toFixed(2)}%, below threshold ${this.config.exitApyThreshold}%`,
                urgency: 'medium',
            };
        }
        // Check maximum holding time
        if (holdingTimeHours >= this.config.maxHoldingTime) {
            return {
                shouldExit: true,
                reason: `Maximum holding time reached: ${holdingTimeHours.toFixed(1)}h`,
                urgency: 'low',
            };
        }
        // Check for significant APY decline
        const apyDecline = ((position.entryApy - currentPool.apy) / position.entryApy) * 100;
        if (apyDecline > 50) {
            return {
                shouldExit: true,
                reason: `Significant APY decline: ${apyDecline.toFixed(1)}% drop`,
                urgency: 'medium',
            };
        }
        // Check for liquidity issues
        if (currentPool.tvl < position.amount * 10) {
            return {
                shouldExit: true,
                reason: 'Low liquidity relative to position size',
                urgency: 'high',
            };
        }
        return {
            shouldExit: false,
            reason: 'Position meets holding criteria',
            urgency: 'low',
        };
    }
    /**
     * Calculate liquidity balance ratio
     */
    calculateLiquidityRatio(pool) {
        const baseValue = pool.baseToken.amount * pool.price;
        const quoteValue = pool.quoteToken.amount;
        const totalValue = baseValue + quoteValue;
        if (totalValue === 0)
            return 0;
        const ratio = Math.min(baseValue, quoteValue) / totalValue;
        return ratio * 2; // Normalize to 0-1 range where 1 = perfect balance
    }
    /**
     * Get pool age in hours
     */
    getPoolAgeHours(pool) {
        return (Date.now() - pool.createdAt.getTime()) / (1000 * 60 * 60);
    }
    /**
     * Calculate risk score for a pool (0-100, higher = riskier)
     */
    calculateRiskScore(pool) {
        let riskScore = 0;
        // Age risk
        const ageHours = this.getPoolAgeHours(pool);
        if (ageHours < 1)
            riskScore += 30;
        else if (ageHours < 24)
            riskScore += 20;
        else if (ageHours > 168)
            riskScore += 10;
        // APY risk
        if (pool.apy > 100)
            riskScore += 25;
        else if (pool.apy > 50)
            riskScore += 15;
        else if (pool.apy > 30)
            riskScore += 5;
        // Liquidity risk
        const liquidityRatio = this.calculateLiquidityRatio(pool);
        if (liquidityRatio < 0.3)
            riskScore += 20;
        else if (liquidityRatio < 0.5)
            riskScore += 10;
        // Volume to TVL ratio risk
        const volumeToTvlRatio = pool.volume24h / pool.tvl;
        if (volumeToTvlRatio > 2)
            riskScore += 15;
        else if (volumeToTvlRatio > 1)
            riskScore += 5;
        return Math.min(100, riskScore);
    }
}
exports.PoolEvaluator = PoolEvaluator;
