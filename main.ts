import { YieldFarmingBot } from './yieldFarmingBot';
import { DEFAULT_BOT_CONFIG } from './config';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Yield Farming Bot
 * This script demonstrates the bot's capabilities in a simulated environment
 */
async function main() {
  console.log(chalk.blue('🌾 SOLANA YIELD FARMING BOT'));
  console.log(chalk.blue('================================'));
  console.log(chalk.white('Simulated automated yield farming on Solana'));
  console.log(chalk.white('Monitoring liquidity pools for high APY opportunities\n'));

  // You can customize the bot configuration here
  const customConfig = {
    ...DEFAULT_BOT_CONFIG,
    minApy: 12.0, // Lower minimum APY for more opportunities
    positionSize: 500, // Smaller position size for demo
    maxPositions: 3, // Fewer positions for clearer tracking
  };

  // Enable demo mode for reliable demonstration (set to false for live trading)
  const enableDemoMode = false; // Now using real APIs with fallbacks

  // Create and start the bot
  const bot = new YieldFarmingBot(customConfig, enableDemoMode);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Received shutdown signal...'));
    bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Received termination signal...'));
    bot.stop();
    process.exit(0);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    bot.stop();
    process.exit(1);
  });

  try {
    // Start the bot
    await bot.start();

    // Log bot statistics periodically
    setInterval(() => {
      const stats = bot.getBotStats();
      console.log(chalk.blue('\n📊 BOT STATISTICS'));
      console.log(chalk.white(`Pools Evaluated: ${stats.poolsEvaluated}`));
      console.log(chalk.white(`Positions Entered: ${stats.positionsEntered}`));
      console.log(chalk.white(`Positions Exited: ${stats.positionsExited}`));
      console.log(chalk.white(`Current Positions: ${stats.currentPositions}`));
      console.log(chalk.white(`Total Actions: ${stats.totalActions}`));
    }, 300000); // Every 5 minutes

    // Keep the process running
    console.log(chalk.green('✅ Bot is now running. Press Ctrl+C to stop.'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error starting bot:'), error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  });
}

export { main };
