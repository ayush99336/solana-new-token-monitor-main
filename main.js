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
exports.main = void 0;
const yieldFarmingBot_1 = require("./yieldFarmingBot");
const config_1 = require("./config");
const chalk_1 = __importDefault(require("chalk"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Main entry point for the Yield Farming Bot
 * This script demonstrates the bot's capabilities in a simulated environment
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(chalk_1.default.blue('🌾 SOLANA YIELD FARMING BOT'));
        console.log(chalk_1.default.blue('================================'));
        console.log(chalk_1.default.white('Simulated automated yield farming on Solana'));
        console.log(chalk_1.default.white('Monitoring liquidity pools for high APY opportunities\n'));
        // You can customize the bot configuration here
        const customConfig = Object.assign(Object.assign({}, config_1.DEFAULT_BOT_CONFIG), { minApy: 12.0, positionSize: 500, maxPositions: 3 });
        // Enable demo mode for reliable demonstration (set to false for live trading)
        const enableDemoMode = false; // Now using real APIs with fallbacks
        // Create and start the bot
        const bot = new yieldFarmingBot_1.YieldFarmingBot(customConfig, enableDemoMode);
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log(chalk_1.default.yellow('\n🛑 Received shutdown signal...'));
            bot.stop();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.log(chalk_1.default.yellow('\n🛑 Received termination signal...'));
            bot.stop();
            process.exit(0);
        });
        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error(chalk_1.default.red('Unhandled Rejection at:'), promise, chalk_1.default.red('reason:'), reason);
            bot.stop();
            process.exit(1);
        });
        try {
            // Start the bot
            yield bot.start();
            // Log bot statistics periodically
            setInterval(() => {
                const stats = bot.getBotStats();
                console.log(chalk_1.default.blue('\n📊 BOT STATISTICS'));
                console.log(chalk_1.default.white(`Pools Evaluated: ${stats.poolsEvaluated}`));
                console.log(chalk_1.default.white(`Positions Entered: ${stats.positionsEntered}`));
                console.log(chalk_1.default.white(`Positions Exited: ${stats.positionsExited}`));
                console.log(chalk_1.default.white(`Current Positions: ${stats.currentPositions}`));
                console.log(chalk_1.default.white(`Total Actions: ${stats.totalActions}`));
            }, 300000); // Every 5 minutes
            // Keep the process running
            console.log(chalk_1.default.green('✅ Bot is now running. Press Ctrl+C to stop.'));
        }
        catch (error) {
            console.error(chalk_1.default.red('❌ Error starting bot:'), error);
            process.exit(1);
        }
    });
}
exports.main = main;
// Run the main function
if (require.main === module) {
    main().catch(error => {
        console.error(chalk_1.default.red('❌ Fatal error:'), error);
        process.exit(1);
    });
}
