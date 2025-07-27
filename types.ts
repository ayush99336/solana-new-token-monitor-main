// Type definitions for the yield farming bot

export interface PoolInfo {
  poolId: string;
  baseToken: {
    mint: string;
    symbol: string;
    decimals: number;
    amount: number;
  };
  quoteToken: {
    mint: string;
    symbol: string;
    decimals: number;
    amount: number;
  };
  tvl: number;
  volume24h: number;
  fees24h: number;
  apy: number;
  createdAt: Date;
  lpTokenSupply: number;
  price: number;
}

export interface Position {
  id: string;
  poolId: string;
  entryTime: Date;
  entryPrice: number;
  entryApy: number;
  amount: number; // Simulated amount in USD
  currentValue: number;
  currentApy: number;
  pnl: number;
  pnlPercentage: number;
  status: 'active' | 'exited';
  exitTime?: Date;
  exitPrice?: number;
  exitReason?: string;
}

export interface Portfolio {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercentage: number;
  activePositions: Position[];
  closedPositions: Position[];
  availableCash: number;
  maxPositions: number;
}

export interface BotConfig {
  // Entry criteria
  minApy: number; // Minimum APY to consider entering
  minTvl: number; // Minimum TVL to consider entering
  minVolume24h: number; // Minimum 24h volume
  maxPositions: number; // Maximum concurrent positions
  positionSize: number; // Size per position in USD
  
  // Exit criteria
  exitApyThreshold: number; // Exit if APY drops below this
  stopLossPercentage: number; // Exit if loss exceeds this percentage
  takeProfitPercentage: number; // Exit if profit exceeds this percentage
  maxHoldingTime: number; // Max time to hold position (hours)
  
  // Risk management
  maxTotalInvestment: number; // Maximum total amount to invest
  riskPerPosition: number; // Maximum risk per position (percentage)
}

export interface BotAction {
  id: string;
  timestamp: Date;
  type: 'pool_detected' | 'pool_evaluated' | 'position_entered' | 'position_monitored' | 'position_exited';
  poolId: string;
  details: any;
  success: boolean;
  error?: string;
}

export interface PoolPerformanceMetrics {
  poolId: string;
  timestamp: Date;
  apy: number;
  tvl: number;
  volume24h: number;
  price: number;
  fees24h: number;
  priceChange24h: number;
  apyChange24h: number;
}
