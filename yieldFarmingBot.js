"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YieldFarmingBot = void 0;
const poolDataService_1 = require("./poolDataService");
const poolEvaluator_1 = require("./poolEvaluator");
const portfolioManager_1 = require("./portfolioManager");
const constants_1 = require("./constants");
const config_1 = require("./config");
const demoData_1 = require("./demoData");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class YieldFarmingBot {
    constructor(config = config_1.DEFAULT_BOT_CONFIG, enableDemoMode = false) {
        this.isRunning = false;
        this.actions = [];
        this.poolCache = new Map();
        this.lastPoolScan = 0;
        this.lastPerformanceLog = 0;
        this.demoMode = false;
        this.apiFailureCount = 0;
        this.config = config;
        this.demoMode = enableDemoMode;
        this.poolDataService = new poolDataService_1.PoolDataService(constants_1.solanaConnection);
        this.poolEvaluator = new poolEvaluator_1.PoolEvaluator(config, this.logAction.bind(this));
        this.portfolioManager = new portfolioManager_1.PortfolioManager(config, this.logAction.bind(this), config.maxTotalInvestment);
        console.log(chalk_1.default.blue('🤖 Yield Farming Bot Initialized'));
        if (this.demoMode) {
            console.log(chalk_1.default.yellow('📍 Demo Mode: Using simulated pool data'));
        }
        console.log(chalk_1.default.white(`Config: Min APY ${config.minApy}%, Min TVL $${config.minTvl.toLocaleString()}`));
        console.log(chalk_1.default.white(`Position Size: $${config.positionSize.toLocaleString()}, Max Positions: ${config.maxPositions}`));
    }
    /**
     * Start the yield farming bot
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log(chalk_1.default.yellow('Bot is already running'));
                return;
            }
            this.isRunning = true;
            console.log(chalk_1.default.green('\n🚀 Starting Yield Farming Bot...'));
            // Initial portfolio log
            this.portfolioManager.logPortfolioStatus();
            // Start main monitoring loop
            this.startMonitoringLoop();
            // Start position monitoring loop
            this.startPositionMonitoringLoop();
            // Start performance logging loop
            this.startPerformanceLoggingLoop();
            console.log(chalk_1.default.green('✅ Bot started successfully'));
        });
    }
    /**
     * Stop the yield farming bot
     */
    stop() {
        this.isRunning = false;
        console.log(chalk_1.default.red('🛑 Yield Farming Bot stopped'));
        // Save final state
        this.saveState();
        this.portfolioManager.logPortfolioStatus();
    }
    /**
     * Main monitoring loop - scans for new pools
     */
    startMonitoringLoop() {
        const monitoringInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning) {
                clearInterval(monitoringInterval);
                return;
            }
            try {
                yield this.scanForNewPools();
            }
            catch (error) {
                console.error(chalk_1.default.red('Error in monitoring loop:'), error);
                this.logAction({
                    id: `error_${Date.now()}`,
                    timestamp: new Date(),
                    type: 'pool_detected',
                    poolId: 'unknown',
                    details: { error: error.message },
                    success: false,
                    error: error.message,
                });
            }
        }), config_1.MONITORING.POOL_SCAN_INTERVAL);
    }
    /**
     * Position monitoring loop - updates active positions
     */
    startPositionMonitoringLoop() {
        const positionInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning) {
                clearInterval(positionInterval);
                return;
            }
            try {
                yield this.monitorActivePositions();
            }
            catch (error) {
                console.error(chalk_1.default.red('Error in position monitoring:'), error);
            }
        }), config_1.MONITORING.POSITION_UPDATE_INTERVAL);
    }
    /**
     * Performance logging loop
     */
    startPerformanceLoggingLoop() {
        const performanceInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(performanceInterval);
                return;
            }
            try {
                this.logPerformance();
            }
            catch (error) {
                console.error(chalk_1.default.red('Error in performance logging:'), error);
            }
        }, config_1.MONITORING.PERFORMANCE_LOG_INTERVAL);
    }
    /**
     * Scan for new pools and evaluate them
     */
    scanForNewPools() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            // Rate limiting
            if (now - this.lastPoolScan < config_1.MONITORING.POOL_SCAN_INTERVAL) {
                return;
            }
            this.lastPoolScan = now;
            console.log(chalk_1.default.blue('\n🔍 Scanning for new pools...'));
            try {
                let allPools = [];
                if (this.demoMode || this.apiFailureCount > 3) {
                    // Use demo data if in demo mode or APIs are consistently failing
                    console.log(chalk_1.default.yellow('📋 Using demo pool data...'));
                    allPools = (0, demoData_1.getRandomDemoPools)(4);
                    this.apiFailureCount = 0; // Reset failure count when using demo
                }
                else {
                    // Try to fetch from real APIs with the new methods
                    console.log(chalk_1.default.white('📡 Fetching from Raydium API V3...'));
                    const raydiumPools = yield this.poolDataService.fetchRaydiumPools();
                    allPools.push(...raydiumPools);
                    console.log(chalk_1.default.green(`✅ Raydium: ${raydiumPools.length} pools`));
                    // Get pools from Jupiter (secondary source)
                    console.log(chalk_1.default.white('📡 Fetching from Jupiter...'));
                    const jupiterPools = yield this.poolDataService.fetchJupiterData();
                    allPools.push(...jupiterPools);
                    console.log(chalk_1.default.green(`✅ Jupiter: ${jupiterPools.length} pools`));
                    // Get pools from Birdeye (tertiary source)
                    console.log(chalk_1.default.white('📡 Fetching from Birdeye...'));
                    const birdeyePools = yield this.poolDataService.fetchBirdeyePools();
                    allPools.push(...birdeyePools);
                    console.log(chalk_1.default.green(`✅ Birdeye: ${birdeyePools.length} pools`));
                    // Get token prices for all pools
                    const tokenAddresses = [
                        ...allPools.map(p => p.baseToken.mint),
                        ...allPools.map(p => p.quoteToken.mint),
                    ];
                    const uniqueAddresses = [...new Set(tokenAddresses)];
                    if (uniqueAddresses.length > 0) {
                        console.log(chalk_1.default.white('💰 Fetching token prices from CoinGecko...'));
                        const prices = yield this.poolDataService.fetchCoinGeckoPrices(uniqueAddresses);
                        // Update pool prices if available
                        allPools.forEach(pool => {
                            const basePrice = prices.get(pool.baseToken.mint);
                            const quotePrice = prices.get(pool.quoteToken.mint);
                            if (basePrice && quotePrice && quotePrice > 0) {
                                pool.price = basePrice / quotePrice;
                            }
                        });
                        console.log(chalk_1.default.green(`✅ Updated prices for ${prices.size} tokens`));
                    }
                    // If no pools from APIs, fall back to demo
                    if (allPools.length === 0) {
                        console.log(chalk_1.default.yellow('🔄 Falling back to demo data due to API issues...'));
                        allPools = (0, demoData_1.getRandomDemoPools)(3);
                    }
                }
                // Remove duplicates and filter valid pools
                const uniquePools = this.deduplicatePools(allPools);
                const validPools = uniquePools.filter(pool => this.poolDataService.validatePoolData(pool));
                console.log(chalk_1.default.white(`Found ${validPools.length} valid pools`));
                // Evaluate each pool
                for (const pool of validPools) {
                    yield this.evaluateAndEnterPool(pool);
                    // Small delay to avoid overwhelming APIs
                    yield this.sleep(100);
                }
            }
            catch (error) {
                console.error(chalk_1.default.red('Error scanning pools:'), error);
                this.apiFailureCount++;
                // Fall back to demo data on error
                if (this.apiFailureCount > 2) {
                    console.log(chalk_1.default.yellow('🔄 Too many API failures, switching to demo mode...'));
                    const demoPools = (0, demoData_1.getRandomDemoPools)(2);
                    for (const pool of demoPools) {
                        yield this.evaluateAndEnterPool(pool);
                    }
                }
            }
        });
    }
    /**
     * Evaluate a pool and potentially enter a position
     */
    evaluateAndEnterPool(pool) {
        return __awaiter(this, void 0, void 0, function* () {
            // Skip if we already evaluated this pool recently
            if (this.poolCache.has(pool.poolId)) {
                return;
            }
            // Cache the pool
            this.poolCache.set(pool.poolId, pool);
            // Log pool detection
            this.logAction({
                id: `detect_${pool.poolId}_${Date.now()}`,
                timestamp: new Date(),
                type: 'pool_detected',
                poolId: pool.poolId,
                details: {
                    symbols: `${pool.baseToken.symbol}/${pool.quoteToken.symbol}`,
                    apy: pool.apy,
                    tvl: pool.tvl,
                    volume24h: pool.volume24h,
                },
                success: true,
            });
            // Evaluate pool
            const evaluation = this.poolEvaluator.evaluatePoolForEntry(pool);
            if (evaluation.shouldEnter) {
                // Try to enter position
                const position = this.portfolioManager.enterPosition(pool);
                if (position) {
                    console.log(chalk_1.default.green(`🎯 Successfully entered position in ${pool.baseToken.symbol}/${pool.quoteToken.symbol}`));
                    console.log(chalk_1.default.white(`   Score: ${evaluation.score}/100`));
                    evaluation.reasons.forEach(reason => console.log(chalk_1.default.gray(`   ${reason}`)));
                    if (evaluation.warnings.length > 0) {
                        evaluation.warnings.forEach(warning => console.log(chalk_1.default.yellow(`   ${warning}`)));
                    }
                }
            }
            else {
                console.log(chalk_1.default.gray(`⏭️  Skipped ${pool.baseToken.symbol}/${pool.quoteToken.symbol} (Score: ${evaluation.score}/100)`));
            }
        });
    }
    /**
     * Monitor active positions and check for exit conditions
     */
    monitorActivePositions() {
        return __awaiter(this, void 0, void 0, function* () {
            const activePositions = this.portfolioManager.getActivePositions();
            if (activePositions.length === 0) {
                return;
            }
            console.log(chalk_1.default.blue(`\n👁️  Monitoring ${activePositions.length} active positions...`));
            for (const position of activePositions) {
                try {
                    let currentPool = null;
                    if (this.demoMode || this.apiFailureCount > 2) {
                        // Simulate pool changes in demo mode
                        const cachedPool = this.poolCache.get(position.poolId);
                        if (cachedPool) {
                            const simulatedPool = (0, demoData_1.simulatePoolChanges)(cachedPool);
                            this.poolCache.set(position.poolId, simulatedPool);
                            currentPool = {
                                poolId: position.poolId,
                                timestamp: new Date(),
                                apy: simulatedPool.apy,
                                tvl: simulatedPool.tvl,
                                volume24h: simulatedPool.volume24h,
                                price: simulatedPool.price,
                                fees24h: simulatedPool.fees24h,
                                priceChange24h: 0,
                                apyChange24h: 0,
                            };
                        }
                    }
                    else {
                        // Get current pool data from APIs
                        currentPool = yield this.poolDataService.getPoolMetrics(position.poolId);
                    }
                    if (!currentPool) {
                        console.log(chalk_1.default.yellow(`⚠️  Could not get data for pool ${position.poolId}`));
                        continue;
                    }
                    // Convert metrics to PoolInfo format (simplified)
                    const poolInfo = {
                        poolId: position.poolId,
                        baseToken: { mint: '', symbol: 'BASE', decimals: 9, amount: 0 },
                        quoteToken: { mint: '', symbol: 'QUOTE', decimals: 9, amount: 0 },
                        tvl: currentPool.tvl,
                        volume24h: currentPool.volume24h,
                        fees24h: currentPool.fees24h,
                        apy: currentPool.apy,
                        createdAt: new Date(),
                        lpTokenSupply: 0,
                        price: currentPool.price,
                    };
                    // Update position value
                    this.portfolioManager.updatePosition(position, poolInfo);
                    // Log position monitoring
                    this.logAction({
                        id: `monitor_${position.id}_${Date.now()}`,
                        timestamp: new Date(),
                        type: 'position_monitored',
                        poolId: position.poolId,
                        details: {
                            positionId: position.id,
                            currentValue: position.currentValue,
                            pnl: position.pnl,
                            pnlPercentage: position.pnlPercentage,
                            currentApy: currentPool.apy,
                        },
                        success: true,
                    });
                    // Check exit conditions
                    const exitEvaluation = this.poolEvaluator.evaluatePositionForExit(position, poolInfo);
                    if (exitEvaluation.shouldExit) {
                        const success = this.portfolioManager.exitPosition(position.id, poolInfo, exitEvaluation.reason);
                        if (success) {
                            console.log(chalk_1.default.cyan(`📤 Position exit - ${exitEvaluation.reason}`));
                            console.log(chalk_1.default.white(`   Urgency: ${exitEvaluation.urgency}`));
                        }
                    }
                }
                catch (error) {
                    console.error(chalk_1.default.red(`Error monitoring position ${position.id}:`), error);
                }
            }
        });
    }
    /**
     * Log performance metrics
     */
    logPerformance() {
        const now = Date.now();
        if (now - this.lastPerformanceLog < config_1.MONITORING.PERFORMANCE_LOG_INTERVAL) {
            return;
        }
        this.lastPerformanceLog = now;
        console.log(chalk_1.default.magenta('\n📈 PERFORMANCE UPDATE'));
        this.portfolioManager.logPortfolioStatus();
        // Save performance data
        const summary = this.portfolioManager.getPortfolioSummary();
        const stats = this.portfolioManager.getPerformanceStats();
        this.savePerformanceData({
            timestamp: new Date(),
            portfolio: summary,
            stats,
        });
    }
    /**
     * Log bot actions
     */
    logAction(action) {
        this.actions.push(action);
        // Keep only last 1000 actions to manage memory
        if (this.actions.length > 1000) {
            this.actions = this.actions.slice(-1000);
        }
    }
    /**
     * Remove duplicate pools based on pool ID
     */
    deduplicatePools(pools) {
        const uniquePoolsMap = new Map();
        pools.forEach(pool => {
            if (!uniquePoolsMap.has(pool.poolId) ||
                uniquePoolsMap.get(pool.poolId).createdAt < pool.createdAt) {
                uniquePoolsMap.set(pool.poolId, pool);
            }
        });
        return Array.from(uniquePoolsMap.values());
    }
    /**
     * Save bot state to files
     */
    saveState() {
        try {
            const dataDir = path_1.default.join(__dirname, 'data');
            // Ensure data directory exists
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            // Save actions
            const actionsPath = path_1.default.join(dataDir, 'bot_actions.json');
            fs_1.default.writeFileSync(actionsPath, JSON.stringify(this.actions, null, 2));
            // Save portfolio
            const portfolioPath = path_1.default.join(dataDir, 'portfolio_state.json');
            const portfolio = this.portfolioManager.getPortfolioSummary();
            fs_1.default.writeFileSync(portfolioPath, JSON.stringify(portfolio, null, 2));
            console.log(chalk_1.default.white('💾 State saved successfully'));
        }
        catch (error) {
            console.error(chalk_1.default.red('Error saving state:'), error);
        }
    }
    /**
     * Save performance data
     */
    savePerformanceData(data) {
        try {
            const dataDir = path_1.default.join(__dirname, 'data');
            const performancePath = path_1.default.join(dataDir, 'performance_log.json');
            let performanceLog = [];
            if (fs_1.default.existsSync(performancePath)) {
                const existingData = fs_1.default.readFileSync(performancePath, 'utf8');
                performanceLog = JSON.parse(existingData);
            }
            performanceLog.push(data);
            // Keep only last 100 entries
            if (performanceLog.length > 100) {
                performanceLog = performanceLog.slice(-100);
            }
            fs_1.default.writeFileSync(performancePath, JSON.stringify(performanceLog, null, 2));
        }
        catch (error) {
            console.error(chalk_1.default.red('Error saving performance data:'), error);
        }
    }
    /**
     * Utility function to add delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get bot statistics
     */
    getBotStats() {
        return {
            uptime: this.isRunning ? Date.now() - this.lastPoolScan : 0,
            totalActions: this.actions.length,
            poolsEvaluated: this.actions.filter(a => a.type === 'pool_evaluated').length,
            positionsEntered: this.actions.filter(a => a.type === 'position_entered').length,
            positionsExited: this.actions.filter(a => a.type === 'position_exited').length,
            currentPositions: this.portfolioManager.getActivePositions().length,
        };
    }
}
exports.YieldFarmingBot = YieldFarmingBot;
