/**
 * LOG ANALYSIS SCRIPT
 * 
 * This script analyzes the log files to extract key information about reward distribution.
 * Place your log files in the same directory as this script and run it.
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 LOG ANALYSIS SCRIPT');
console.log('======================');

// Log files to analyze
const logFiles = [
  'pedro.log',
  'node2.log', 
  'node3.log'
];

function analyzeLogFile(filename) {
  console.log(`\n📄 Analyzing: ${filename}`);
  console.log('='.repeat(50));
  
  if (!fs.existsSync(filename)) {
    console.log(`❌ File not found: ${filename}`);
    return;
  }
  
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n');
  
  // Key patterns to look for
  const patterns = {
    reward: /reward|REWARD|Reward/g,
    distribution: /distribution|DISTRIBUTION|Distribution/g,
    koii: /koii|KOII|Koii/g,
    framework: /framework|FRAMEWORK|Framework/g,
    round: /round|ROUND|Round/g,
    token: /token|TOKEN|Token/g,
    transfer: /transfer|TRANSFER|Transfer/g,
    transaction: /transaction|TRANSACTION|Transaction/g,
    error: /error|ERROR|Error/g,
    failed: /failed|FAILED|Failed/g
  };
  
  // Count occurrences
  const counts = {};
  Object.keys(patterns).forEach(key => {
    const matches = content.match(patterns[key]);
    counts[key] = matches ? matches.length : 0;
  });
  
  // Show counts
  Object.entries(counts).forEach(([key, count]) => {
    if (count > 0) {
      console.log(`📊 ${key.toUpperCase()}: ${count} occurrences`);
    }
  });
  
  // Find specific reward-related lines
  const rewardLines = lines.filter(line => 
    line.toLowerCase().includes('reward') || 
    line.toLowerCase().includes('distribution') ||
    line.toLowerCase().includes('token') ||
    line.toLowerCase().includes('koii framework')
  );
  
  if (rewardLines.length > 0) {
    console.log(`\n🎯 REWARD-RELATED LINES (last 10):`);
    rewardLines.slice(-10).forEach(line => {
      console.log(`   ${line.trim()}`);
    });
  }
  
  // Find error lines
  const errorLines = lines.filter(line => 
    line.toLowerCase().includes('error') || 
    line.toLowerCase().includes('failed') ||
    line.toLowerCase().includes('❌')
  );
  
  if (errorLines.length > 0) {
    console.log(`\n❌ ERROR LINES (last 10):`);
    errorLines.slice(-10).forEach(line => {
      console.log(`   ${line.trim()}`);
    });
  }
  
  // Find round information
  const roundLines = lines.filter(line => 
    line.toLowerCase().includes('round') && 
    /\d+/.test(line)
  );
  
  if (roundLines.length > 0) {
    console.log(`\n🔄 ROUND INFORMATION (last 10):`);
    roundLines.slice(-10).forEach(line => {
      console.log(`   ${line.trim()}`);
    });
  }
  
  // File stats
  console.log(`\n📈 FILE STATS:`);
  console.log(`   Total lines: ${lines.length}`);
  console.log(`   File size: ${(content.length / 1024).toFixed(2)} KB`);
  
  // Find timestamps
  const timestamps = lines.filter(line => 
    /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/.test(line)
  );
  
  if (timestamps.length > 0) {
    console.log(`   Lines with timestamps: ${timestamps.length}`);
    console.log(`   First timestamp: ${timestamps[0]?.trim()}`);
    console.log(`   Last timestamp: ${timestamps[timestamps.length - 1]?.trim()}`);
  }
}

// Analyze each log file
logFiles.forEach(analyzeLogFile);

console.log('\n🎯 ANALYSIS SUMMARY');
console.log('===================');
console.log('This script looks for:');
console.log('- Reward distribution messages');
console.log('- Koii framework integration');
console.log('- Error messages');
console.log('- Round progression');
console.log('- Token transfer attempts');

console.log('\n📝 NEXT STEPS:');
console.log('1. Copy your log files to this directory');
console.log('2. Run: node analyze-logs.js');
console.log('3. Look for "KOII FRAMEWORK" messages');
console.log('4. Check for actual token transfer attempts');
console.log('5. Verify round progression is working'); 