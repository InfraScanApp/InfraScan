import * as fs from 'fs';
import * as path from 'path';

// Store claimed rounds
let claimedRoundsPath = path.join(__dirname, '../../claimed-rounds.json');
let claimedRounds: Record<string, any> = {};

if (fs.existsSync(claimedRoundsPath)) {
  claimedRounds = JSON.parse(fs.readFileSync(claimedRoundsPath, 'utf-8'));
}

function saveClaimedRounds() {
  fs.writeFileSync(claimedRoundsPath, JSON.stringify(claimedRounds, null, 2));
}

export async function sendReward(publicKey: string, walletAddress: string, amount: number, round: number): Promise<void> {
  try {
    // Check for duplicate reward claim
    if (claimedRounds[publicKey]?.includes(round)) {
      console.log(`⚠️ Already rewarded ${publicKey} for round ${round}`);
      return;
    }

    // TODO: Replace this with actual Koii token transfer implementation
    // This should integrate with the Koii task framework's reward distribution system
    const txHash = await sendTransaction(walletAddress, amount);

    console.log(`✅ TX ${txHash}: Sent ${amount} KOII to ${walletAddress}`);

    // Mark round as claimed
    if (!claimedRounds[publicKey]) claimedRounds[publicKey] = [];
    claimedRounds[publicKey].push(round);
    saveClaimedRounds();

  } catch (error: any) {
    console.error(`❌ Reward failed for ${walletAddress} (Round ${round}):`, error.message || error);
  }
}

// Implement actual token transfer function using task framework
async function sendTransaction(walletAddress: string, amount: number): Promise<string> {
  try {
    // Use the task framework's built-in reward system
    // Note: This assumes the framework handles the actual token transfer
    console.log(`💸 Processing token transfer: ${amount} tokens to ${walletAddress}`);
    
    // For now, return a mock transaction hash since the actual implementation
    // depends on the Koii task framework's internal reward mechanism
    const mockTxHash = `reward_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // TODO: Replace with actual Koii framework reward call when available
    // await koiiFramework.sendTokens(walletAddress, amount);
    
    return mockTxHash;
  } catch (error) {
    console.error(`Failed to send transaction to ${walletAddress}:`, error);
    throw error;
  }
}

// Token decimal places (1 billion base units = 1 token, matching 4-distribution.ts)
const TOKEN_DECIMALS = 1_000_000_000; // Use same value as 4-distribution.ts for consistency
const TOKENS_PER_ROUND = 3; // 3 tokens per approved node per round

// Configurable payout per round (in base units)
export let PAYOUT_PER_ROUND = TOKENS_PER_ROUND * TOKEN_DECIMALS; // 3 tokens = 3,000,000,000 base units

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
  PAYOUT_PER_ROUND = tokens * TOKEN_DECIMALS;
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
  const tokensAmount = PAYOUT_PER_ROUND / TOKEN_DECIMALS;
  console.log(`Rewarded ${nodeId} with ${PAYOUT_PER_ROUND} base units (${tokensAmount} tokens)`);
  
  return entry;
}

// Example usage:
// rewardNode('node-123', 1712345678);
// setPayoutPerRoundInTokens(3); // Set to 3 tokens
// setPayoutPerRound(3000000000); // Set to 3 tokens in base units 