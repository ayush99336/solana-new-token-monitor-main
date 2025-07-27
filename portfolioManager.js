"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioManager = void 0;
const uuid_1 = require("uuid");
const chalk_1 = __importDefault(require("chalk"));
class PortfolioManager {
    constructor(config, actionLogger, initialCash = 10000) {
        this.config = config;
        this.actionLogger = actionLogger;
        this.portfolio = {
            totalValue: initialCash,
            totalInvested: 0,
            totalPnl: 0,
            totalPnlPercentage: 0,
            activePositions: [],
            closedPositions: [],
            availableCash: initialCash,
            maxPositions: config.maxPositions,
        };
    }
    /**
     * Simulate entering a position in a pool
     */
    enterPosition(pool) {
        // Check if we can enter a new position
        if (!this.canEnterNewPosition()) {
            console.log(chalk_1.default.yellow(`❌ Cannot enter position: max positions reached or insufficient cash`));
            return null;
        }
        // Check if we already have a position in this pool
        if (this.hasPositionInPool(pool.poolId)) {
            console.log(chalk_1.default.yellow(`❌ Already have position in pool ${pool.poolId}`));
            return null;
        }
        const positionSize = Math.min(this.config.positionSize, this.portfolio.availableCash);
        const position = {
            id: (0, uuid_1.v4)(),
            poolId: pool.poolId,
            entryTime: new Date(),
            entryPrice: pool.price,
            entryApy: pool.apy,
            amount: positionSize,
            currentValue: positionSize,
            currentApy: pool.apy,
            pnl: 0,
            pnlPercentage: 0,
            status: 'active',
        };
        // Update portfolio
        this.portfolio.activePositions.push(position);
        this.portfolio.availableCash -= positionSize;
        this.portfolio.totalInvested += positionSize;
        // Log action
        this.actionLogger({
            id: `enter_${position.id}`,
            timestamp: new Date(),
            type: 'position_entered',
            poolId: pool.poolId,
            details: {
                positionId: position.id,
                amount: positionSize,
                entryPrice: pool.price,
                entryApy: pool.apy,
                poolSymbols: `${pool.baseToken.symbol}/${pool.quoteToken.symbol}`,
            },
            success: true,
        });
        console.log(chalk_1.default.green(`✅ Entered position in ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
        console.log(chalk_1.default.white(`   Amount: $${positionSize.toLocaleString()}`));
        console.log(chalk_1.default.white(`   Entry APY: ${pool.apy.toFixed(2)}%`));
        console.log(chalk_1.default.white(`   Available cash: $${this.portfolio.availableCash.toLocaleString()}`));
        return position;
    }
    /**
     * Simulate exiting a position
     */
    exitPosition(positionId, currentPool, reason) {
        const positionIndex = this.portfolio.activePositions.findIndex(p => p.id === positionId);
        if (positionIndex === -1) {
            console.log(chalk_1.default.red(`❌ Position ${positionId} not found`));
            return false;
        }
        const position = this.portfolio.activePositions[positionIndex];
        // Calculate final P&L (simplified - in reality would depend on LP token price changes)
        const timeHeldHours = (Date.now() - position.entryTime.getTime()) / (1000 * 60 * 60);
        const apyGain = (position.entryApy / 100 / 365 / 24) * timeHeldHours * position.amount;
        const priceChange = ((currentPool.price - position.entryPrice) / position.entryPrice) * position.amount;
        position.currentValue = position.amount + apyGain + priceChange;
        position.pnl = position.currentValue - position.amount;
        position.pnlPercentage = (position.pnl / position.amount) * 100;
        position.status = 'exited';
        position.exitTime = new Date();
        position.exitPrice = currentPool.price;
        position.exitReason = reason;
        // Update portfolio
        this.portfolio.availableCash += position.currentValue;
        this.portfolio.totalInvested -= position.amount;
        this.portfolio.closedPositions.push(position);
        this.portfolio.activePositions.splice(positionIndex, 1);
        // Log action
        this.actionLogger({
            id: `exit_${position.id}`,
            timestamp: new Date(),
            type: 'position_exited',
            poolId: position.poolId,
            details: {
                positionId: position.id,
                exitReason: reason,
                pnl: position.pnl,
                pnlPercentage: position.pnlPercentage,
                holdingTime: timeHeldHours,
                finalValue: position.currentValue,
            },
            success: true,
        });
        console.log(chalk_1.default.cyan(`🚪 Exited position in ${currentPool.baseToken.symbol}/${currentPool.quoteToken.symbol}`));
        console.log(chalk_1.default.white(`   Reason: ${reason}`));
        console.log(chalk_1.default.white(`   P&L: ${position.pnl >= 0 ? chalk_1.default.green('+') : chalk_1.default.red('')}$${position.pnl.toFixed(2)} (${position.pnlPercentage.toFixed(2)}%)`));
        console.log(chalk_1.default.white(`   Held for: ${timeHeldHours.toFixed(1)} hours`));
        console.log(chalk_1.default.white(`   Available cash: $${this.portfolio.availableCash.toLocaleString()}`));
        return true;
    }
    /**
     * Update position values based on current pool data
     */
    updatePosition(position, currentPool) {
        const timeHeldHours = (Date.now() - position.entryTime.getTime()) / (1000 * 60 * 60);
        // Simulate APY gains over time
        const apyGain = (position.entryApy / 100 / 365 / 24) * timeHeldHours * position.amount;
        // Simulate price impact on position value
        const priceChange = ((currentPool.price - position.entryPrice) / position.entryPrice) * position.amount * 0.5; // 50% price exposure
        position.currentValue = position.amount + apyGain + priceChange;
        position.currentApy = currentPool.apy;
        position.pnl = position.currentValue - position.amount;
        position.pnlPercentage = (position.pnl / position.amount) * 100;
    }
    /**
     * Update overall portfolio metrics
     */
    updatePortfolioMetrics() {
        // Calculate total portfolio value
        const activeValue = this.portfolio.activePositions.reduce((sum, pos) => sum + pos.currentValue, 0);
        this.portfolio.totalValue = this.portfolio.availableCash + activeValue;
        // Calculate total P&L
        const activePnl = this.portfolio.activePositions.reduce((sum, pos) => sum + pos.pnl, 0);
        const closedPnl = this.portfolio.closedPositions.reduce((sum, pos) => sum + pos.pnl, 0);
        this.portfolio.totalPnl = activePnl + closedPnl;
        // Calculate total P&L percentage
        const initialValue = this.portfolio.totalValue - this.portfolio.totalPnl;
        this.portfolio.totalPnlPercentage = initialValue > 0 ? (this.portfolio.totalPnl / initialValue) * 100 : 0;
    }
    /**
     * Get portfolio summary
     */
    getPortfolioSummary() {
        this.updatePortfolioMetrics();
        return Object.assign({}, this.portfolio);
    }
    /**
     * Get position by ID
     */
    getPosition(positionId) {
        return this.portfolio.activePositions.find(p => p.id === positionId) || null;
    }
    /**
     * Get all active positions
     */
    getActivePositions() {
        return [...this.portfolio.activePositions];
    }
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const closedPositions = this.portfolio.closedPositions;
        const totalTrades = closedPositions.length;
        if (totalTrades === 0) {
            return {
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                winRate: 0,
                avgWin: 0,
                avgLoss: 0,
                profitFactor: 0,
                sharpeRatio: 0,
            };
        }
        const winningTrades = closedPositions.filter(p => p.pnl > 0);
        const losingTrades = closedPositions.filter(p => p.pnl < 0);
        const avgWin = winningTrades.length > 0
            ? winningTrades.reduce((sum, p) => sum + p.pnl, 0) / winningTrades.length
            : 0;
        const avgLoss = losingTrades.length > 0
            ? Math.abs(losingTrades.reduce((sum, p) => sum + p.pnl, 0) / losingTrades.length)
            : 0;
        const grossProfit = winningTrades.reduce((sum, p) => sum + p.pnl, 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, p) => sum + p.pnl, 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
        // Simplified Sharpe ratio calculation
        const returns = closedPositions.map(p => p.pnlPercentage);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const returnStdDev = Math.sqrt(returnVariance);
        const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
        return {
            totalTrades,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: (winningTrades.length / totalTrades) * 100,
            avgWin,
            avgLoss,
            profitFactor,
            sharpeRatio,
        };
    }
    /**
     * Check if we can enter a new position
     */
    canEnterNewPosition() {
        return (this.portfolio.activePositions.length < this.config.maxPositions &&
            this.portfolio.availableCash >= this.config.positionSize &&
            this.portfolio.totalInvested < this.config.maxTotalInvestment);
    }
    /**
     * Check if we already have a position in a specific pool
     */
    hasPositionInPool(poolId) {
        return this.portfolio.activePositions.some(p => p.poolId === poolId);
    }
    /**
     * Log current portfolio status
     */
    logPortfolioStatus() {
        const summary = this.getPortfolioSummary();
        const stats = this.getPerformanceStats();
        console.log(chalk_1.default.blue('\n💼 PORTFOLIO STATUS'));
        console.log(chalk_1.default.white(`Total Value: $${summary.totalValue.toLocaleString()}`));
        console.log(chalk_1.default.white(`Available Cash: $${summary.availableCash.toLocaleString()}`));
        console.log(chalk_1.default.white(`Total Invested: $${summary.totalInvested.toLocaleString()}`));
        console.log(chalk_1.default.white(`Total P&L: ${summary.totalPnl >= 0 ? chalk_1.default.green('+') : chalk_1.default.red('')}$${summary.totalPnl.toFixed(2)} (${summary.totalPnlPercentage.toFixed(2)}%)`));
        console.log(chalk_1.default.white(`Active Positions: ${summary.activePositions.length}/${summary.maxPositions}`));
        if (stats.totalTrades > 0) {
            console.log(chalk_1.default.blue('\n📊 PERFORMANCE STATS'));
            console.log(chalk_1.default.white(`Total Trades: ${stats.totalTrades}`));
            console.log(chalk_1.default.white(`Win Rate: ${stats.winRate.toFixed(1)}%`));
            console.log(chalk_1.default.white(`Avg Win: $${stats.avgWin.toFixed(2)}`));
            console.log(chalk_1.default.white(`Avg Loss: $${stats.avgLoss.toFixed(2)}`));
            console.log(chalk_1.default.white(`Profit Factor: ${stats.profitFactor.toFixed(2)}`));
        }
    }
}
exports.PortfolioManager = PortfolioManager;
