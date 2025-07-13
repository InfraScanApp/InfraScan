import * as fs from 'fs';
import * as path from 'path';

// Token decimal places (9 is standard for SPL tokens)
const TOKEN_DECIMALS = 9;
const TOKENS_PER_ROUND = 3; // 3 tokens per approved node per round

// Configurable payout per round (in base units)
export let PAYOUT_PER_ROUND = TOKENS_PER_ROUND * Math.pow(10, TOKEN_DECIMALS); // 3 tokens = 3,000,000,000 base units

// Export functions for desktop node interface
export function getExpectedRewardPerNode(): number {
  return TOKENS_PER_ROUND; // Return 3 tokens per node
}

export function getExpectedRewardPerNodeInBaseUnits(): number {
  return PAYOUT_PER_ROUND; // Return 3 tokens in base units
}

// Comprehensive task reward information for desktop node interface
export function getTaskRewardInfo() {
  return {
    tokensPerRound: TOKENS_PER_ROUND,
    tokensPerDay: TOKENS_PER_ROUND * 24, // 24 rounds per day
    tokensPerRoundBaseUnits: PAYOUT_PER_ROUND,
    roundDurationHours: 1,
    roundsPerDay: 24,
    description: "3 tokens per successful node per round",
    dynamic: true,
    testing: true
  };
}

// Log file path
const REWARD_LOG = path.resolve(process.cwd(), 'rewards.json');

// Reward payload interface
interface RewardEntry {
  nodeId: string;
  roundTimestamp: number;
  payout: number;
  rewardedAt: number;
}

// Function to set payout (amount should be in base units)
export function setPayoutPerRound(amount: number) {
  PAYOUT_PER_ROUND = amount;
}

// Function to set payout in tokens (converts to base units)
export function setPayoutPerRoundInTokens(tokens: number) {
  PAYOUT_PER_ROUND = tokens * Math.pow(10, TOKEN_DECIMALS);
}

// Log reward to JSON file
function logReward(entry: RewardEntry) {
  let log: any[] = [];
  if (fs.existsSync(REWARD_LOG)) {
    log = JSON.parse(fs.readFileSync(REWARD_LOG, 'utf-8'));
  }
  log.push(entry);
  fs.writeFileSync(REWARD_LOG, JSON.stringify(log, null, 2));
}

// Main reward handler
export function rewardNode(nodeId: string, roundTimestamp: number) {
  const entry: RewardEntry = {
    nodeId,
    roundTimestamp,
    payout: PAYOUT_PER_ROUND,
    rewardedAt: Date.now(),
  };
  logReward(entry);
  
  // Log human-readable amount
  const tokensAmount = PAYOUT_PER_ROUND / Math.pow(10, TOKEN_DECIMALS);
  console.log(`Rewarded ${nodeId} with ${PAYOUT_PER_ROUND} base units (${tokensAmount} tokens)`);
  
  return entry;
}

// Example usage:
// rewardNode('node-123', 1712345678);
// setPayoutPerRoundInTokens(3); // Set to 3 tokens
// setPayoutPerRound(3000000000); // Set to 3 tokens in base units 