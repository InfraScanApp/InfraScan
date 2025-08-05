/**
 * MINIMAL REWARD TEST - TypeScript Version
 * 
 * This test focuses ONLY on the reward mechanism to verify if tokens are actually being sent.
 * It uses the actual Koii task framework distribution system but with simplified logic.
 */

import { initializeTaskManager } from "@_koii/task-manager";
import * as fs from 'fs';
import * as path from 'path';

// Simplified task functions that focus only on rewards
const minimalSetup = async () => {
  console.log('🎯 MINIMAL SETUP: Reward-focused configuration');
  return { success: true };
};

const minimalTask = async (round: number) => {
  console.log(`🎯 MINIMAL TASK ROUND ${round}: Simple uptime check`);
  return { uptime: 3600, timestamp: Date.now(), round };
};

const minimalSubmission = async (round: number) => {
  console.log(`🎯 MINIMAL SUBMISSION ROUND ${round}: Submitting uptime data`);
  return { uptime: 3600, timestamp: Date.now(), round };
};

const minimalAudit = async (round: number) => {
  console.log(`🎯 MINIMAL AUDIT ROUND ${round}: Approving all submissions`);
  return true; // Always approve for testing
};

// FOCUS: Simplified distribution that actually sends rewards
const minimalDistribution = async (submitters: any[], bounty: number, roundNumber: number) => {
  console.log(`🚀 MINIMAL REWARD DISTRIBUTION FOR ROUND ${roundNumber}`);
  console.log(`💰 Bounty: ${bounty}, Submitters: ${submitters.length}`);
  
  const distributionList: any = {};
  const REWARD_PER_NODE = 3;
  const TOKEN_DECIMALS = 1_000_000_000;
  const REWARD_BASE_UNITS = REWARD_PER_NODE * TOKEN_DECIMALS;
  
  // Reward all submitters for testing
  submitters.forEach(submitter => {
    distributionList[submitter.publicKey] = REWARD_BASE_UNITS;
    console.log(`🎁 REWARDING: ${submitter.publicKey} with ${REWARD_PER_NODE} tokens`);
    
    // Log the reward attempt
    logRewardAttempt(submitter.publicKey, REWARD_PER_NODE, roundNumber);
  });
  
  console.log(`📊 MINIMAL ROUND ${roundNumber}: ${submitters.length} nodes rewarded`);
  return distributionList;
};

const minimalRoutes = async () => {
  console.log('🎯 MINIMAL ROUTES: Basic health check');
  return { status: 'healthy' };
};

// Reward logging function
function logRewardAttempt(nodeId: string, amount: number, round: number) {
  const rewardLog = path.resolve(process.cwd(), 'minimal-rewards.json');
  const rewardEntry = {
    nodeId,
    amount,
    round,
    timestamp: Date.now(),
    status: 'ATTEMPTED',
    note: 'Minimal test - check if actual tokens were sent'
  };
  
  let existingRewards: any[] = [];
  if (fs.existsSync(rewardLog)) {
    existingRewards = JSON.parse(fs.readFileSync(rewardLog, 'utf-8'));
  }
  existingRewards.push(rewardEntry);
  fs.writeFileSync(rewardLog, JSON.stringify(existingRewards, null, 2));
}

// Initialize minimal task manager
initializeTaskManager({
  setup: minimalSetup,
  task: minimalTask,
  submission: minimalSubmission,
  audit: minimalAudit,
  distribution: minimalDistribution,
  routes: minimalRoutes,
});

console.log('🎯 MINIMAL REWARD TEST INITIALIZED');
console.log('This version focuses ONLY on reward distribution');
console.log('Check minimal-rewards.json for reward attempts'); 