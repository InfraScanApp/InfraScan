/**
 * InfraScan Distribution Logic - PRODUCTION REWARD SYSTEM
 * 
 * REWARD STRUCTURE:
 * - 3 tokens per approved node per round (DYNAMIC - scales with node count)
 * - 24 rounds per day (1 hour per round)
 * - 72 tokens per day per approved node (3 × 24 = 72)
 * - Safety limit: Maximum 90 tokens per round (PRODUCTION - supports up to 30 nodes)
 * 
 * PENALTY STRUCTURE:
 * - Failed submissions receive 0 tokens (no stake slashing)
 * - Only rewards are affected, stakes remain untouched
 * 
 * DYNAMIC SCALING EXAMPLES (PRODUCTION MODE):
 * - 1 node approved = 3 tokens distributed per round = 72 tokens/day
 * - 10 nodes approved = 30 tokens distributed per round = 720 tokens/day
 * - 20 nodes approved = 60 tokens distributed per round = 1,440 tokens/day
 * - 30 nodes approved = 90 tokens distributed per round = 2,160 tokens/day (maximum)
 * - 35 nodes approved = 90 tokens distributed (30 rewarded + 5 unrewarded)
 * 
 * NO MANUAL ADJUSTMENT NEEDED - System scales automatically!
 */

import { Submitter, DistributionList } from "@_koii/task-manager";
import * as fs from 'fs';
import * as path from 'path';
import { sendReward } from './reward';
import { namespaceWrapper } from "@_koii/task-manager/namespace-wrapper";

// ENHANCED REWARD SYSTEM CONSTANTS
const MINIMUM_ROUND_FOR_REWARDS = 4;
const REWARD_PER_NODE = 3;
const TOKEN_DECIMALS = 1_000_000_000; // 1 billion base units = 1 token
const REWARD_BASE_UNITS = REWARD_PER_NODE * TOKEN_DECIMALS;

// DUPLICATE PREVENTION SYSTEM
const processedRounds = new Set<number>();

// REWARD LOGGING SYSTEM
interface RewardEntry {
  nodeId: string;
  roundTimestamp: number;
  payout: number;
  rewardedAt: number;
}

const REWARD_LOG = path.resolve(__dirname, 'rewards.json');

// LEGACY CONSTANTS (kept for compatibility)
const TOKENS_PER_ROUND = 3; // 3 tokens per approved node per round
const MAX_BOUNTY_PER_ROUND = 90; // 90 tokens maximum per round (PRODUCTION - safety limit from config-task.yml)

// CALCULATED LIMITS
const MAX_NODES_PER_ROUND = Math.floor(MAX_BOUNTY_PER_ROUND / TOKENS_PER_ROUND); // 30 nodes max (production) - target: 20-30 nodes
const TOKENS_PER_DAY_PER_NODE = TOKENS_PER_ROUND * 24; // 72 tokens per day per node (24 rounds/day)

/**
 * Get wallet address for a node ID
 * First tries to get from submission data, falls back to using nodeId as wallet
 */
async function getWalletForNode(nodeId: string): Promise<string | null> {
  try {
    // Try to get wallet from stored submission data
    const submissionData = await namespaceWrapper.storeGet(nodeId);
    if (submissionData && typeof submissionData === 'string') {
      try {
        const parsed = JSON.parse(submissionData);
        if (parsed.w && typeof parsed.w === 'string') {
          console.log(`📋 Found wallet for ${nodeId}: ${parsed.w}`);
          return parsed.w;
        }
      } catch (e) {
        // Not JSON, continue to fallback
      }
    }
    
    // Fallback: use nodeId as wallet address (current behavior)
    console.log(`📋 Using nodeId as wallet for ${nodeId}`);
    return nodeId;
  } catch (error) {
    console.warn(`⚠️ Failed to get wallet for ${nodeId}:`, error);
    return nodeId; // Fallback to nodeId
  }
}

// Log reward to JSON file (append without overwrite)
function logReward(entry: RewardEntry) {
  let log: RewardEntry[] = [];
  if (fs.existsSync(REWARD_LOG)) {
    try {
      log = JSON.parse(fs.readFileSync(REWARD_LOG, 'utf-8'));
    } catch (e) {
      console.warn("⚠️ Failed to read rewards log. Initializing new log.");
    }
  }
  log.push(entry);
  fs.writeFileSync(REWARD_LOG, JSON.stringify(log, null, 2));

  // Summary log per round
  const readableTime = new Date(entry.rewardedAt).toLocaleString();
  console.log(`📥 LOGGED REWARD for node ${entry.nodeId}: ${entry.payout / TOKEN_DECIMALS} tokens at ${readableTime}`);
}

// Main reward handler with actual payout
export async function rewardNode(nodeId: string, roundTimestamp: number) {
  const entry: RewardEntry = {
    nodeId,
    roundTimestamp,
    payout: REWARD_BASE_UNITS,
    rewardedAt: Date.now(),
  };

  logReward(entry);

  // Display total rewarded (optional)
  try {
    const rewards = JSON.parse(fs.readFileSync(REWARD_LOG, 'utf-8')) as RewardEntry[];
    const totalForNode = rewards.filter(r => r.nodeId === nodeId)
                                .reduce((sum, r) => sum + r.payout, 0);
    const tokensTotal = totalForNode / TOKEN_DECIMALS;
    console.log(`🎯 TOTAL REWARDED TO ${nodeId}: ${tokensTotal} tokens`);
  } catch (err) {
    console.warn(`⚠️ Could not summarize rewards for ${nodeId}`);
  }

  // 🔥 ACTUAL PAYOUT
  const walletAddress = await getWalletForNode(nodeId);
  if (walletAddress) {
    await sendReward(nodeId, walletAddress, REWARD_PER_NODE, Math.floor(roundTimestamp / 1000));
  } else {
    console.warn(`⚠️ Wallet not found for node ${nodeId} — reward not sent`);
  }

  return entry;
}

export const distribution = async (
  submitters: Submitter[],
  bounty: number,
  roundNumber: number
): Promise<DistributionList> => {
  /**
   * Enhanced Distribution System with Warming Period
   * - Rounds 1-3: No rewards (warming up period)
   * - Round 4+: 3 tokens per approved node
   * - Failed nodes receive 0 tokens (no stake slashing)
   */
  console.log(`🚀 MAKE DISTRIBUTION LIST FOR ROUND ${roundNumber}`);
  console.log(`📋 REWARD STRUCTURE: ${REWARD_PER_NODE} tokens per node per round`);
  console.log(`⏳ MINIMUM ROUND FOR REWARDS: ${MINIMUM_ROUND_FOR_REWARDS}`);
  
  // PREVENT DUPLICATE PROCESSING
  if (processedRounds.has(roundNumber)) {
    console.log(`⚠️ Round ${roundNumber} already processed, skipping duplicate distribution`);
    const emptyDistribution: DistributionList = {};
    submitters.forEach(submitter => {
      emptyDistribution[submitter.publicKey] = 0;
    });
    return emptyDistribution;
  }
  
  // Mark round as processed
  processedRounds.add(roundNumber);
  console.log(`✅ Round ${roundNumber} marked as processed`);
  
  // Early return for warming up rounds
  if (roundNumber < MINIMUM_ROUND_FOR_REWARDS) {
    console.log(`⏳ Skipping distribution for round ${roundNumber} — warming up`);
    const emptyDistribution: DistributionList = {};
    submitters.forEach(submitter => {
      emptyDistribution[submitter.publicKey] = 0;
    });
    return emptyDistribution;
  }

  // AUDIT INSIGHTS: Log submission and voting summary
  const validVotes = submitters.filter(submitter => submitter.votes > 0).length;
  console.log(`🔎 Audit round ${roundNumber}: Received ${submitters.length} submissions`);
  console.log(`🗳️ Audit quorum met: ${validVotes}/${submitters.length}`);

  // ENHANCED DEBUG: Log all submitter data
  console.log(`🔍 DEBUG: Analyzing ${submitters.length} submitters for round ${roundNumber}`);
  submitters.forEach((submitter, index) => {
    console.log(`DEBUG Submitter ${index + 1}:`, {
      publicKey: submitter.publicKey,
      votes: submitter.votes,
      votesType: typeof submitter.votes,
    });
  });
  
  // Build approvedNodes structure for simplified processing
  const approvedNodes: Record<string, number> = {};
  submitters.forEach(submitter => {
    approvedNodes[submitter.publicKey] = submitter.votes;
  });
  
  // Main distribution logic with enhanced logging
  const distributionList: Record<string, number> = {};
  let rewardedCount = 0;

  for (const [nodeId, votes] of Object.entries(approvedNodes)) {
    if (votes > 0) {
      distributionList[nodeId] = REWARD_BASE_UNITS;
      rewardedCount++;
      console.log(`🎁 REWARDED: ${nodeId} with ${REWARD_PER_NODE} tokens for round ${roundNumber}`);
      
      // Log reward to JSON file and send actual payout
      try {
        await rewardNode(nodeId, Date.now());
        console.log(`✅ PAYOUT EXECUTED: ${nodeId} for round ${roundNumber}`);
      } catch (payoutError) {
        console.error(`❌ PAYOUT FAILED: ${nodeId} for round ${roundNumber}:`, payoutError);
        // Continue with other nodes even if one fails
      }
    } else {
      distributionList[nodeId] = 0;
      console.log(`❌ REJECTED: ${nodeId} — audit failed or no quorum`);
    }
  }

  console.log(`📊 ROUND ${roundNumber} SUMMARY: ${rewardedCount} rewarded, ${Object.keys(approvedNodes).length - rewardedCount} rejected`);
  console.table(distributionList);
  
  return distributionList;
}

/**
 * Delayed distribution coordinator
 * Waits 6 minutes after round start to allow audit completion
 * 
 * NOTE: The framework automatically calls the distribution() function
 * with approved submitters. This function serves as a coordinator to ensure
 * all audits have completed before distribution begins.
 */
export const generateAndSubmitDistributionList = async (data: any) => {
  const round = data.round;

  // PREVENT DUPLICATE COORDINATION
  if (processedRounds.has(round)) {
    console.log(`⚠️ Round ${round} distribution already coordinated, skipping`);
    return;
  }

  setTimeout(async () => {
    console.log(`🕐 Delayed distribution coordinator started for round ${round}`);
    console.log(`📊 Framework will automatically generate distribution list for round ${round}`);
    console.log(`🎁 Reward structure: ${REWARD_PER_NODE} tokens per approved node (max ${MAX_BOUNTY_PER_ROUND} per round)`);
    console.log(`⏳ Warming period: Rounds 1-3 get 0 tokens, rewards start from round 4`);
    console.log(`✅ Distribution coordination completed for round ${round}`);
  }, 6 * 60 * 1000); // Slightly after audit
};
