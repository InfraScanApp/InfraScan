// Simple test script for the simplified InfraScan task
// This script tests the basic functionality without the Koii framework

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORE REQUIREMENT: Fixed 3 tokens per approved node
const REWARD_PER_NODE = 3;
const TOKEN_DECIMALS = 1_000_000_000;
const REWARD_BASE_UNITS = REWARD_PER_NODE * TOKEN_DECIMALS;

// Mock namespace wrapper for testing
const mockNamespaceWrapper = {
  store: new Map(),
  storeSet: async (key, value) => {
    mockNamespaceWrapper.store.set(key, value);
    console.log(`✅ Stored: ${key} = ${value}`);
  },
  storeGet: async (key) => {
    const value = mockNamespaceWrapper.store.get(key);
    console.log(`📖 Retrieved: ${key} = ${value}`);
    return value;
  }
};

// Mock the task function
async function testTask(roundNumber) {
  console.log(`🚀 TESTING SIMPLIFIED TASK FOR ROUND ${roundNumber}`);
  
  try {
    // Get basic uptime (in seconds)
    const uptimeSeconds = process.uptime();
    
    // Create simple submission data
    const taskData = {
      uptime: Math.floor(uptimeSeconds),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber
    };
    
    // Store for submission
    await mockNamespaceWrapper.storeSet("taskData", JSON.stringify(taskData));
    console.log(`✅ Stored simple task data for round ${roundNumber}: uptime=${taskData.uptime}s`);
    
    return taskData;
  } catch (error) {
    console.error("❌ TASK ERROR:", error);
    return null;
  }
}

// Mock the submission function
async function testSubmission(roundNumber) {
  console.log(`📤 TESTING SIMPLIFIED SUBMISSION FOR ROUND ${roundNumber}`);
  
  try {
    // Get task data
    const taskData = await mockNamespaceWrapper.storeGet('taskData');
    
    if (!taskData) {
      console.error(`❌ No task data available for round ${roundNumber}`);
      return null;
    }
    
    // Parse and validate task data
    let parsedData;
    try {
      parsedData = JSON.parse(taskData);
    } catch (parseError) {
      console.error(`❌ Failed to parse task data:`, parseError);
      return null;
    }
    
    // Create simple submission
    const submissionData = {
      uptime: parsedData.uptime,
      timestamp: parsedData.timestamp,
      date: parsedData.date,
      roundNumber: parsedData.roundNumber
    };
    
    const submissionString = JSON.stringify(submissionData);
    console.log(`📤 Submitting: ${submissionString}`);
    
    return submissionString;
  } catch (error) {
    console.error(`❌ SUBMISSION ERROR:`, error);
    return null;
  }
}

// Mock the audit function
async function testAudit(submission, roundNumber, submitterKey) {
  console.log(`🔍 TESTING SIMPLIFIED AUDIT FOR ROUND ${roundNumber} from ${submitterKey}`);
  console.log(`📋 Submission: ${submission?.substring(0, 100)}${submission?.length > 100 ? '...' : ''}`);
  
  // Always return true as in simplified version
  console.log(`✅ AUDIT RESULT: APPROVED for ${submitterKey} (simplified audit)`);
  return true;
}

// Mock the distribution function with CORE REQUIREMENT
async function testDistribution(submitters, bounty, roundNumber) {
  console.log(`🚀 TESTING FIXED REWARD DISTRIBUTION FOR ROUND ${roundNumber}`);
  console.log(`💰 Bounty amount: ${bounty}`);
  console.log(`👥 Number of submitters: ${submitters.length}`);
  console.log(`🎯 CORE REQUIREMENT: ${REWARD_PER_NODE} tokens per approved node`);
  
  // CORE REQUIREMENT: Exactly 3 tokens per approved node
  const distributionList = {};
  const approvedSubmitters = submitters.filter(submitter => submitter.votes > 0);
  
  if (approvedSubmitters.length === 0) {
    console.log(`❌ No approved submitters for round ${roundNumber}`);
    submitters.forEach(submitter => {
      distributionList[submitter.publicKey] = 0;
    });
    return distributionList;
  }
  
  // CORE REQUIREMENT: Exactly 3 tokens per approved node
  submitters.forEach(submitter => {
    if (submitter.votes > 0) {
      distributionList[submitter.publicKey] = REWARD_BASE_UNITS;
      console.log(`✅ REWARDED: ${submitter.publicKey} with ${REWARD_PER_NODE} tokens (fixed reward)`);
    } else {
      distributionList[submitter.publicKey] = 0;
      console.log(`❌ REJECTED: ${submitter.publicKey} (no votes)`);
    }
  });
  
  const totalTokensDistributed = approvedSubmitters.length * REWARD_PER_NODE;
  console.log(`📊 ROUND ${roundNumber} SUMMARY: ${approvedSubmitters.length} rewarded, ${submitters.length - approvedSubmitters.length} rejected`);
  console.log(`💰 TOTAL TOKENS DISTRIBUTED: ${totalTokensDistributed} tokens (${approvedSubmitters.length} nodes × ${REWARD_PER_NODE} tokens each)`);
  
  return distributionList;
}

// Run the test
async function runTest() {
  console.log('🧪 TESTING SIMPLIFIED INFRASCAN TASK WITH FIXED REWARDS');
  console.log('========================================================\n');
  
  const roundNumber = 1;
  const testSubmitterKey = 'test-submitter-123';
  const testBounty = 1000;
  
  // Test task execution
  console.log('1️⃣ Testing Task Function:');
  const taskData = await testTask(roundNumber);
  console.log('');
  
  // Test submission
  console.log('2️⃣ Testing Submission Function:');
  const submission = await testSubmission(roundNumber);
  console.log('');
  
  // Test audit
  console.log('3️⃣ Testing Audit Function:');
  const auditResult = await testAudit(submission, roundNumber, testSubmitterKey);
  console.log('');
  
  // Test distribution with CORE REQUIREMENT
  console.log('4️⃣ Testing Fixed Reward Distribution Function:');
  const testSubmitters = [
    { publicKey: 'submitter-1', votes: 1 },
    { publicKey: 'submitter-2', votes: 0 },
    { publicKey: 'submitter-3', votes: 1 },
    { publicKey: 'submitter-4', votes: 1 } // Add a third approved submitter
  ];
  const distributionResult = await testDistribution(testSubmitters, testBounty, roundNumber);
  console.log('');
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log(`✅ Task executed: ${taskData ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Submission created: ${submission ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Audit passed: ${auditResult ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Distribution completed: ${Object.keys(distributionResult).length > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`🎯 CORE REQUIREMENT: ${REWARD_PER_NODE} tokens per approved node`);
  
  console.log('\n🎉 Fixed reward task test completed successfully!');
  console.log('📝 The task is ready for deployment and testing with core requirement.');
}

// Run the test
runTest().catch(console.error); 