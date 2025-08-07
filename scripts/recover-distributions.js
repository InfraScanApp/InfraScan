#!/usr/bin/env node

/**
 * Distribution Recovery Script
 * 
 * This script helps recover failed distributions by manually triggering
 * distribution list generation for specific rounds.
 * 
 * Usage:
 *   node scripts/recover-distributions.js [round_number]
 *   node scripts/recover-distributions.js --all
 *   node scripts/recover-distributions.js --status
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RECOVERY_ROUNDS = 10; // Don't try to recover more than 10 rounds at once
const RECOVERY_DELAY = 30000; // 30 seconds between recovery attempts

class DistributionRecovery {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/recovery.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  async checkDistributionStatus() {
    return new Promise((resolve, reject) => {
      const child = spawn('curl', ['-s', 'http://localhost:3000/distribution/status']);
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        this.log(`Error checking status: ${data}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          try {
            const status = JSON.parse(output);
            resolve(status);
          } catch (error) {
            reject(new Error(`Failed to parse status: ${error.message}`));
          }
        } else {
          reject(new Error(`Status check failed with code ${code}`));
        }
      });
    });
  }

  async triggerDistribution(round) {
    return new Promise((resolve, reject) => {
      this.log(`Triggering distribution for round ${round}...`);
      
      const child = spawn('curl', [
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        `http://localhost:3000/distribution/trigger/${round}`
      ]);
      
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        this.log(`Error triggering distribution: ${data}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            if (result.success) {
              this.log(`✅ Successfully triggered distribution for round ${round}`);
              resolve(result);
            } else {
              reject(new Error(`Distribution trigger failed: ${result.error}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse result: ${error.message}`));
          }
        } else {
          reject(new Error(`Distribution trigger failed with code ${code}`));
        }
      });
    });
  }

  async recoverSpecificRound(round) {
    try {
      this.log(`🔄 Starting recovery for round ${round}...`);
      
      // Check current status
      const status = await this.checkDistributionStatus();
      this.log(`Current distribution status: ${status.summary.isHealthy ? 'Healthy' : 'Unhealthy'}`);
      
      // Trigger distribution
      await this.triggerDistribution(round);
      
      // Wait and check status again
      this.log(`⏳ Waiting ${RECOVERY_DELAY / 1000} seconds for distribution to process...`);
      await new Promise(resolve => setTimeout(resolve, RECOVERY_DELAY));
      
      const newStatus = await this.checkDistributionStatus();
      this.log(`Updated distribution status: ${newStatus.summary.isHealthy ? 'Healthy' : 'Unhealthy'}`);
      
      return true;
    } catch (error) {
      this.log(`❌ Recovery failed for round ${round}: ${error.message}`);
      return false;
    }
  }

  async recoverAllFailedRounds() {
    try {
      this.log('🔄 Starting recovery for all failed rounds...');
      
      const status = await this.checkDistributionStatus();
      const failedRounds = status.health.failedRounds;
      
      if (failedRounds.length === 0) {
        this.log('✅ No failed rounds to recover');
        return;
      }
      
      this.log(`Found ${failedRounds.length} failed rounds: ${failedRounds.join(', ')}`);
      
      if (failedRounds.length > MAX_RECOVERY_ROUNDS) {
        this.log(`⚠️ Too many failed rounds (${failedRounds.length}). Only recovering the most recent ${MAX_RECOVERY_ROUNDS}`);
        failedRounds.splice(0, failedRounds.length - MAX_RECOVERY_ROUNDS);
      }
      
      let successCount = 0;
      for (const round of failedRounds) {
        const success = await this.recoverSpecificRound(round);
        if (success) {
          successCount++;
        }
        
        // Wait between rounds to avoid overwhelming the system
        if (round !== failedRounds[failedRounds.length - 1]) {
          this.log(`⏳ Waiting ${RECOVERY_DELAY / 1000} seconds before next round...`);
          await new Promise(resolve => setTimeout(resolve, RECOVERY_DELAY));
        }
      }
      
      this.log(`✅ Recovery completed: ${successCount}/${failedRounds.length} rounds recovered successfully`);
      
    } catch (error) {
      this.log(`❌ Recovery process failed: ${error.message}`);
    }
  }

  async showStatus() {
    try {
      const status = await this.checkDistributionStatus();
      
      console.log('\n📊 DISTRIBUTION STATUS REPORT');
      console.log('============================');
      console.log(`Status: ${status.summary.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      console.log(`Last Successful Round: ${status.summary.lastSuccessfulRound}`);
      console.log(`Success Rate: ${status.summary.successRate}`);
      console.log(`Total Rounds: ${status.summary.totalRounds}`);
      console.log(`Failed Rounds: ${status.summary.failedRounds}`);
      
      if (status.recentAlerts && status.recentAlerts.length > 0) {
        console.log('\n🚨 RECENT ALERTS:');
        status.recentAlerts.forEach(alert => {
          const time = new Date(alert.timestamp).toLocaleString();
          console.log(`[${time}] ${alert.type}: ${alert.message}`);
        });
      }
      
      if (status.health.failedRounds && status.health.failedRounds.length > 0) {
        console.log(`\n⚠️ FAILED ROUNDS: ${status.health.failedRounds.join(', ')}`);
      }
      
    } catch (error) {
      this.log(`❌ Failed to get status: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const recovery = new DistributionRecovery();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/recover-distributions.js [round_number]');
    console.log('  node scripts/recover-distributions.js --all');
    console.log('  node scripts/recover-distributions.js --status');
    process.exit(1);
  }
  
  const command = args[0];
  
  try {
    if (command === '--status') {
      await recovery.showStatus();
    } else if (command === '--all') {
      await recovery.recoverAllFailedRounds();
    } else {
      const round = parseInt(command);
      if (isNaN(round) || round < 0) {
        console.error('Invalid round number. Please provide a positive integer.');
        process.exit(1);
      }
      await recovery.recoverSpecificRound(round);
    }
  } catch (error) {
    recovery.log(`❌ Recovery script failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DistributionRecovery; 