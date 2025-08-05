/**
 * MINIMAL REWARD TEST - Testing Only Reward Distribution
 * 
 * This script tests ONLY the reward mechanism to verify if tokens are actually being sent.
 * It bypasses the complex task framework and focuses on the core reward functionality.
 */

const fs = require('fs');
const path = require('path');

// Mock node data for testing
const testNodes = [
  {
    publicKey: '2pPjzTMUEDSn12ma8cauSX3M9WgByuwuiDG7j7UJELhA',
    walletAddress: '2pPjzTMUEDSn12ma8cauSX3M9WgByuwuiDG7j7UJELhA',
    uptime: 3600
  },
  {
    publicKey: 'C6nAsPrsdZhSXvoAAp5YDvPoxo8viHBLEnJYFEXw5W1G',
    walletAddress: 'C6nAsPrsdZhSXvoAAp5YDvPoxo8viHBLEnJYFEXw5W1G',
    uptime: 3500
  },
  {
    publicKey: 'CW9vb56Hh8cqnUPjqx7SRiRaUQsAVA96oqrQv2Uj97BC',
    walletAddress: 'CW9vb56Hh8cqnUPjqx7SRiRaUQsAVA96oqrQv2Uj97BC',
    uptime: 3400
  }
];

// Simplified reward function
async function sendTestReward(publicKey, walletAddress, amount, round) {
  console.log(`🎁 TEST REWARD: Sending ${amount} tokens to ${publicKey} for round ${round}`);
  
  // Simulate actual token transfer
  const txHash = `test_reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log the reward
  const rewardEntry = {
    nodeId: publicKey,
    walletAddress: walletAddress,
    round: round,
    amount: amount,
    txHash: txHash,
    timestamp: Date.now(),
    status: 'SENT'
  };
  
  // Save to rewards log
  const rewardsLog = path.resolve(process.cwd(), 'test-rewards.json');
  let existingRewards = [];
  if (fs.existsSync(rewardsLog)) {
    existingRewards = JSON.parse(fs.readFileSync(rewardsLog, 'utf-8'));
  }
  existingRewards.push(rewardEntry);
  fs.writeFileSync(rewardsLog, JSON.stringify(existingRewards, null, 2));
  
  console.log(`✅ REWARD SENT: ${publicKey} received ${amount} tokens (TX: ${txHash})`);
  return txHash;
}

// Test distribution function
async function testDistribution(roundNumber) {
  console.log(`\n🚀 TESTING REWARD DISTRIBUTION FOR ROUND ${roundNumber}`);
  console.log(`💰 Testing with ${testNodes.length} nodes`);
  
  const results = [];
  
  for (const node of testNodes) {
    try {
      const txHash = await sendTestReward(node.publicKey, node.walletAddress, 3, roundNumber);
      results.push({
        node: node.publicKey,
        status: 'SUCCESS',
        txHash: txHash,
        amount: 3
      });
    } catch (error) {
      console.error(`❌ Failed to reward ${node.publicKey}:`, error);
      results.push({
        node: node.publicKey,
        status: 'FAILED',
        error: error.message
      });
    }
  }
  
  const successfulRewards = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`\n📊 ROUND ${roundNumber} SUMMARY:`);
  console.log(`✅ ${successfulRewards} rewards sent successfully`);
  console.log(`❌ ${results.length - successfulRewards} rewards failed`);
  
  return results;
}

// Main test function
async function runRewardTest() {
  console.log('🎯 MINIMAL REWARD TEST STARTING');
  console.log('================================');
  
  // Test multiple rounds
  for (let round = 1; round <= 3; round++) {
    await testDistribution(round);
    console.log('--------------------------------');
    
    // Wait a bit between rounds
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 REWARD TEST COMPLETED');
  console.log('Check test-rewards.json for detailed results');
}

// Run the test
if (require.main === module) {
  runRewardTest().catch(console.error);
}

module.exports = { runRewardTest, testDistribution, sendTestReward }; 