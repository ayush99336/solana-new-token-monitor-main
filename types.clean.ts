// Type definitions for pool monitoring (listening and decision phases only)

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

export interface PoolEvaluation {
  poolId: string;
  score: number;
  decision: 'ENTER' | 'SKIP';
  reasons: string[];
  warnings: string[];
  timestamp: Date;
}

export interface BotAction {
  id: string;
  timestamp: Date;
  type: 'pool_detected' | 'pool_evaluated';
  poolId: string;
  details: any;
  success: boolean;
  error?: string;
}
