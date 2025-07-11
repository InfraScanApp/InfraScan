import { handleCheckinSubmission } from '../src/task/checkin-task';
import { rewardNode, setPayoutPerRoundInTokens } from '../src/task/reward';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Simulate a node check-in
const nodeId = 'node-001';
const timestamp = Math.floor(Date.now() / 1000);
const data = `${nodeId}:${timestamp}`;
const hash = crypto.createHash('sha256').update(data).digest('hex');
const signature = 'dummy-signature'; // Placeholder for real signature

const payload = {
  nodeId,
  timestamp,
  signature,
  hash,
};

console.log('Simulating check-in payload:', payload);

// Process the check-in
const valid = handleCheckinSubmission(payload);

if (valid) {
  // Set payout to 3 tokens to match the task configuration
  setPayoutPerRoundInTokens(3); // Use 3 tokens as per task configuration
  const reward = rewardNode(nodeId, timestamp);
  console.log('Reward issued:', reward);
} else {
  console.log('No reward issued due to invalid check-in.');
}

// Show log file outputs
const SUBMISSION_LOG = path.resolve(process.cwd(), 'submissions.json');
const REWARD_LOG = path.resolve(process.cwd(), 'rewards.json');

if (fs.existsSync(SUBMISSION_LOG)) {
  console.log('\nSubmission Log:');
  console.log(fs.readFileSync(SUBMISSION_LOG, 'utf-8'));
}
if (fs.existsSync(REWARD_LOG)) {
  console.log('\nReward Log:');
  console.log(fs.readFileSync(REWARD_LOG, 'utf-8'));
} 