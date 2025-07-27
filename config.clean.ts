// Configuration for pool monitoring (listening and decision phases only)

// Pool evaluation thresholds
export const POOL_EVALUATION = {
  // Entry criteria for decision phase
  MIN_APY: 100.0,           // Minimum APY to consider (100%+)
  MIN_TVL: 50,              // Minimum TVL ($50+)  
  MIN_VOLUME_24H: 500,      // Minimum daily volume ($500+)
  
  // Pool age filtering
  MIN_AGE_HOURS: 1,         // Pool must be at least 1h old
  MAX_AGE_HOURS: 72,        // Pool must be less than 72h old
  SWEET_SPOT_AGE_HOURS: 24, // Ideal age for incentive pools
  
  // Quality scoring
  HIGH_INCENTIVE_THRESHOLD: 200.0, // Ultra high APY threshold
  HIGH_VOLUME_THRESHOLD: 5000,     // High volume threshold
  MIN_SCORE_TO_ENTER: 100,         // Minimum score to recommend entry
} as const;

// API endpoints
export const API_ENDPOINTS = {
  RAYDIUM: 'https://api-v3.raydium.io',
} as const;

// Monitoring intervals
export const MONITORING = {
  POOL_SCAN_INTERVAL: 30000,        // Scan for new pools every 30 seconds
  WATCHLIST_UPDATE_INTERVAL: 60000, // Update watchlist every minute
} as const;
