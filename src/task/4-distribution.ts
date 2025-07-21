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

// Token decimal places (9 is standard for SPL tokens)
const TOKEN_DECIMALS = 9;

// CORE REWARD PARAMETERS
const TOKENS_PER_ROUND = 3; // 3 tokens per approved node per round
const MAX_BOUNTY_PER_ROUND = 90; // 90 tokens maximum per round (PRODUCTION - safety limit from config-task.yml)

// CALCULATED LIMITS
const MAX_NODES_PER_ROUND = Math.floor(MAX_BOUNTY_PER_ROUND / TOKENS_PER_ROUND); // 30 nodes max (production) - target: 20-30 nodes
const TOKENS_PER_DAY_PER_NODE = TOKENS_PER_ROUND * 24; // 72 tokens per day per node (24 rounds/day)

export const distribution = async (
  submitters: Submitter[],
  bounty: number,
  roundNumber: number
): Promise<DistributionList> => {
  /**
   * Generate the reward list for a given round
   * Each approved node receives exactly 3 tokens per round
   * Failed nodes receive 0 tokens (no stake slashing)
   */
  console.log(`MAKE DISTRIBUTION LIST FOR ROUND ${roundNumber}`);
  console.log(`REWARD STRUCTURE: ${TOKENS_PER_ROUND} tokens per node per round`);
  console.log(`DAILY EARNING POTENTIAL: ${TOKENS_PER_DAY_PER_NODE} tokens per node per day`);
  console.log(`PENALTY POLICY: Failed submissions get 0 tokens (no stake slashing)`);
  
  // ENHANCED DEBUG: Log all submitter data to identify vote calculation issues
  console.log(`🔍 DEBUG: Analyzing ${submitters.length} submitters for round ${roundNumber}`);
  submitters.forEach((submitter, index) => {
    console.log(`DEBUG Submitter ${index + 1}:`, {
      publicKey: submitter.publicKey,
      votes: submitter.votes,
      votesType: typeof submitter.votes,
      // Log any other available properties
      ...Object.keys(submitter).reduce((acc, key) => {
        if (key !== 'publicKey' && key !== 'votes') {
          acc[key] = submitter[key];
        }
        return acc;
      }, {} as any)
    });
  });
  
  const distributionList: DistributionList = {};
  const approvedSubmitters = [];
  const failedSubmitters = [];
  
  // Categorize submitters: approved get rewards, failed get zero (no slashing)
  for (const submitter of submitters) {
    console.log(`🔍 VOTE CHECK: ${submitter.publicKey} has ${submitter.votes} votes (type: ${typeof submitter.votes})`);
    
    if (submitter.votes > 0) {
      // Positive votes = approved submission (gets 3 tokens)
      console.log(`✅ APPROVED: ${submitter.publicKey} with ${submitter.votes} votes - WILL RECEIVE REWARDS`);
      approvedSubmitters.push(submitter.publicKey);
    } else {
      // Zero or negative votes = failed submission (gets 0 tokens, no slashing)
      console.log(`❌ REJECTED: ${submitter.publicKey} with ${submitter.votes} votes - NO REWARDS`);
      failedSubmitters.push(submitter.publicKey);
      distributionList[submitter.publicKey] = 0;
    }
  }
  
  console.log(`APPROVED NODES: ${approvedSubmitters.length}`);
  console.log(`FAILED NODES: ${failedSubmitters.length} (receiving 0 tokens, no stake penalty)`);
  console.log(`MAX NODES PER ROUND: ${MAX_NODES_PER_ROUND}`);
  
  // ADDITIONAL DEBUG: Show who specifically is approved/failed
  console.log(`🎯 APPROVED NODES LIST:`, approvedSubmitters);
  console.log(`⛔ FAILED NODES LIST:`, failedSubmitters);
  
  if (approvedSubmitters.length === 0) {
    console.log("NO NODES TO REWARD - All submissions failed audit");
    return distributionList;
  }
  
  // Safety check: ensure we don't exceed the maximum number of nodes per round
  if (approvedSubmitters.length > MAX_NODES_PER_ROUND) {
    console.warn(`WARNING: Too many approved nodes (${approvedSubmitters.length}) exceeds max nodes per round (${MAX_NODES_PER_ROUND})`);
    console.warn(`Only the first ${MAX_NODES_PER_ROUND} nodes will be rewarded this round`);
    
    // Only reward the first MAX_NODES_PER_ROUND nodes
    const rewardedNodes = approvedSubmitters.slice(0, MAX_NODES_PER_ROUND);
    const unrewardedNodes = approvedSubmitters.slice(MAX_NODES_PER_ROUND);
    
    // Give exactly 3 tokens to each of the first MAX_NODES_PER_ROUND nodes
    const rewardPerNode = TOKENS_PER_ROUND * Math.pow(10, TOKEN_DECIMALS); // 3 tokens = 3,000,000,000 base units
    rewardedNodes.forEach((candidate) => {
      distributionList[candidate] = rewardPerNode;
    });
    
    // Give 0 tokens to the remaining nodes (they won't be penalized, just not rewarded)
    unrewardedNodes.forEach((candidate) => {
      distributionList[candidate] = 0;
    });
    
    console.log(`REWARDED NODES: ${rewardedNodes.length} nodes with ${TOKENS_PER_ROUND} tokens each`);
    console.log(`UNREWARDED NODES: ${unrewardedNodes.length} nodes (exceeded round limit)`);
    console.log(`TOTAL TOKENS DISTRIBUTED THIS ROUND: ${rewardedNodes.length * TOKENS_PER_ROUND} tokens`);
    console.log(`TOTAL TOKENS DISTRIBUTED PER DAY: ${rewardedNodes.length * TOKENS_PER_DAY_PER_NODE} tokens`);
    
  } else {
    // Normal case: All approved nodes get exactly 3 tokens each
    const rewardPerNode = TOKENS_PER_ROUND * Math.pow(10, TOKEN_DECIMALS); // 3 tokens
    
    approvedSubmitters.forEach((candidate) => {
      distributionList[candidate] = rewardPerNode; // Each node gets exactly 3 tokens
    });
    
    const totalTokensDistributedThisRound = approvedSubmitters.length * TOKENS_PER_ROUND;
    
    console.log(`REWARD PER NODE: ${TOKENS_PER_ROUND} tokens (${rewardPerNode} base units)`);
    console.log(`TOTAL TOKENS DISTRIBUTED THIS ROUND: ${totalTokensDistributedThisRound} tokens`);
    console.log(`TOTAL TOKENS DISTRIBUTED PER DAY: ${approvedSubmitters.length * TOKENS_PER_DAY_PER_NODE} tokens`);
  }
  
  return distributionList;
}
