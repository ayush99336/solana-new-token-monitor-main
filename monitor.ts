import { PoolMonitor } from './poolMonitor';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log(chalk.blue('🌊 SOLANA POOL MONITOR'));
  console.log(chalk.blue('================================'));
  console.log(chalk.white('Real-time pool discovery and evaluation'));
  console.log(chalk.white('Focus: Listening Phase → Decision Phase'));
  console.log('');

  const monitor = new PoolMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Received shutdown signal...'));
    monitor.stop();
    process.exit(0);
  });

  try {
    await monitor.start();
    
    // Keep the process running
    console.log(chalk.green(' Monitor is running. Press Ctrl+C to stop.'));
    
  } catch (error) {
    console.error(chalk.red(' Failed to start monitor:'), error);
    process.exit(1);
  }
}

main().catch(console.error);
