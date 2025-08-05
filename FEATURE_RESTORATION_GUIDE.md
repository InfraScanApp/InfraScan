# InfraScan Feature Restoration Guide

## Overview
This guide provides step-by-step instructions for gradually adding back features from the original complex implementation. Each phase builds upon the previous one, allowing for incremental testing and validation.

## Phase 1: Basic Hardware Detection

### Step 1.1: Add Hardware Detection Import
**File:** `src/task/1-task.ts`

**Add this import at the top:**
```typescript
import { HardwareDetection } from './hardware-detection';
```

**Reference:** See `hardware-detection.ts` lines 1-100 for the complete interface and class structure.

### Step 1.2: Modify Task Function
**Replace the current simple task function with:**

```typescript
export async function task(roundNumber: number): Promise<void> {
  console.log(`🚀 TASK WITH HARDWARE DETECTION FOR ROUND ${roundNumber}`);
  
  try {
    // Get basic uptime (in seconds)
    const uptimeSeconds = process.uptime();
    
    // Collect basic hardware data
    const hardwareDetection = HardwareDetection.getInstance();
    const hardwareData = await hardwareDetection.collectStaticData();
    
    // Create enhanced submission data
    const taskData = {
      uptime: Math.floor(uptimeSeconds),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber,
      // Add basic hardware info
      hardware: {
        cpu: hardwareData.cpu.model,
        cores: hardwareData.cpu.coresPhysical,
        ram: Math.round(hardwareData.ram.totalMB / 1024), // Convert to GB
        storage: hardwareData.storage.totalGB,
        os: hardwareData.os.platform,
        arch: hardwareData.system.arch
      }
    };
    
    // Store for submission
    await namespaceWrapper.storeSet("taskData", JSON.stringify(taskData));
    console.log(`✅ Stored enhanced task data for round ${roundNumber}: uptime=${taskData.uptime}s, cpu=${taskData.hardware.cpu}`);
    
  } catch (error) {
    console.error("❌ TASK ERROR:", error);
    
    // Fallback data in case of error
    const fallbackData = {
      uptime: 0,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber,
      hardware: null
    };
    
    await namespaceWrapper.storeSet("taskData", JSON.stringify(fallbackData));
    console.log('📤 Stored fallback task data due to error');
  }
}
```

**Reference:** See `hardware-detection.ts` lines 1100-1115 for the main collection function.

### Step 1.3: Update Submission Function
**File:** `src/task/2-submission.ts`

**Modify the submission data creation:**
```typescript
// Create enhanced submission
const submissionData = {
  uptime: parsedData.uptime,
  timestamp: parsedData.timestamp,
  date: parsedData.date,
  roundNumber: parsedData.roundNumber,
  hardware: parsedData.hardware // Include hardware data
};
```

## Phase 2: Enhanced Audit Logic

### Step 2.1: Add Basic Validation
**File:** `src/task/3-audit.ts`

**Replace the current simple audit with:**

```typescript
export async function audit(
  submission: string,
  roundNumber: number,
  submitterKey: string,
): Promise<boolean> {
  console.log(`🔍 ENHANCED AUDIT FOR ROUND ${roundNumber} from ${submitterKey}`);
  
  try {
    // Parse submission
    const submissionData = JSON.parse(submission);
    
    // Basic validation
    if (!submissionData.uptime || typeof submissionData.uptime !== 'number') {
      console.log(`❌ Invalid uptime from ${submitterKey}`);
      return false;
    }
    
    // Uptime must be positive and reasonable (max 1 year)
    if (submissionData.uptime <= 0 || submissionData.uptime > 31536000) {
      console.log(`❌ Uptime out of range from ${submitterKey}: ${submissionData.uptime}`);
      return false;
    }
    
    // Timestamp validation (within 6 hours)
    const now = Date.now();
    const timeDiff = Math.abs(now - submissionData.timestamp);
    const maxTimeDiff = 6 * 60 * 60 * 1000; // 6 hours
    
    if (timeDiff > maxTimeDiff) {
      console.log(`❌ Timestamp out of range from ${submitterKey}`);
      return false;
    }
    
    console.log(`✅ AUDIT PASSED for ${submitterKey}`);
    return true;
    
  } catch (error) {
    console.error(`❌ AUDIT ERROR for ${submitterKey}:`, error);
    return false;
  }
}
```

**Reference:** See original `3-audit.ts` lines 400-500 for more advanced validation logic.

## Phase 3: Advanced Uptime Tracking

### Step 3.1: Add Uptime Tracker
**File:** `src/task/1-task.ts`

**Add this import:**
```typescript
import { UptimeTracker } from './uptime-tracker';
```

**Reference:** See `uptime-tracker.ts` lines 1-100 for the complete uptime tracking interface.

### Step 3.2: Enhance Task Function
**Modify the task function to use uptime tracker:**

```typescript
export async function task(roundNumber: number): Promise<void> {
  console.log(`🚀 TASK WITH ADVANCED UPTIME TRACKING FOR ROUND ${roundNumber}`);
  
  try {
    // Initialize uptime tracker
    const uptimeTracker = UptimeTracker.getInstance();
    await uptimeTracker.initialize();
    
    // Record uptime for this round
    const uptimeRecord = await uptimeTracker.recordUptime(roundNumber);
    const currentUptimeSeconds = await uptimeTracker.getCurrentUptimeSeconds();
    
    // Collect hardware data
    const hardwareDetection = HardwareDetection.getInstance();
    const hardwareData = await hardwareDetection.collectStaticData();
    
    // Create comprehensive submission data
    const taskData = {
      uptime: currentUptimeSeconds,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber,
      uptimeRecord: {
        uptimeDays: uptimeRecord.uptimeDays,
        uptimeHours: uptimeRecord.uptimeHours,
        uptimeMinutes: uptimeRecord.uptimeMinutes,
        cumulativeRounds: uptimeRecord.cumulativeRounds
      },
      hardware: {
        cpu: hardwareData.cpu.model,
        cores: hardwareData.cpu.coresPhysical,
        ram: Math.round(hardwareData.ram.totalMB / 1024),
        storage: hardwareData.storage.totalGB,
        os: hardwareData.os.platform,
        arch: hardwareData.system.arch
      }
    };
    
    // Store for submission
    await namespaceWrapper.storeSet("taskData", JSON.stringify(taskData));
    console.log(`✅ Stored comprehensive task data for round ${roundNumber}`);
    
  } catch (error) {
    console.error("❌ TASK ERROR:", error);
    // Fallback logic...
  }
}
```

**Reference:** See `uptime-tracker.ts` lines 60-110 for the recordUptime method.

## Phase 4: Hardware Change Detection

### Step 4.1: Add Static Cache Manager
**File:** `src/task/1-task.ts`

**Add this import:**
```typescript
import { StaticCacheManager } from './static-cache-manager';
```

**Reference:** See `static-cache-manager.ts` for the complete caching system.

### Step 4.2: Implement Change Detection
**Modify the task function to include change detection:**

```typescript
export async function task(roundNumber: number): Promise<void> {
  console.log(`🚀 TASK WITH HARDWARE CHANGE DETECTION FOR ROUND ${roundNumber}`);
  
  try {
    // Initialize managers
    const uptimeTracker = UptimeTracker.getInstance();
    const staticCacheManager = StaticCacheManager.getInstance();
    
    await uptimeTracker.initialize();
    const uptimeRecord = await uptimeTracker.recordUptime(roundNumber);
    const currentUptimeSeconds = await uptimeTracker.getCurrentUptimeSeconds();
    
    // Check for hardware changes
    const staticChangeResult = await staticCacheManager.checkForStaticChanges();
    
    // Collect hardware data
    const hardwareDetection = HardwareDetection.getInstance();
    const hardwareData = await hardwareDetection.collectStaticData();
    
    // Create submission data with change detection
    const taskData = {
      uptime: currentUptimeSeconds,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber,
      uptimeRecord: {
        uptimeDays: uptimeRecord.uptimeDays,
        uptimeHours: uptimeRecord.uptimeHours,
        uptimeMinutes: uptimeRecord.uptimeMinutes,
        cumulativeRounds: uptimeRecord.cumulativeRounds
      },
      hardware: {
        cpu: hardwareData.cpu.model,
        cores: hardwareData.cpu.coresPhysical,
        ram: Math.round(hardwareData.ram.totalMB / 1024),
        storage: hardwareData.storage.totalGB,
        os: hardwareData.os.platform,
        arch: hardwareData.system.arch
      },
      staticChanged: staticChangeResult.hasChanged,
      changeReason: staticChangeResult.reason
    };
    
    // Store for submission
    await namespaceWrapper.storeSet("taskData", JSON.stringify(taskData));
    console.log(`✅ Stored task data with change detection for round ${roundNumber}`);
    
  } catch (error) {
    console.error("❌ TASK ERROR:", error);
    // Fallback logic...
  }
}
```

**Reference:** See `static-cache-manager.ts` for the complete change detection logic.

## Phase 5: Custom Distribution and Rewards

### Step 5.1: Add Reward System
**File:** `src/task/4-distribution.ts`

**Add this import:**
```typescript
import { sendReward } from './reward';
```

**Reference:** See `reward.ts` for the complete reward payout system.

### Step 5.2: Implement Custom Distribution
**Replace the current distribution function with:**

```typescript
export const distribution = async (
  submitters: Submitter[],
  bounty: number,
  roundNumber: number
): Promise<DistributionList> => {
  console.log(`🚀 CUSTOM DISTRIBUTION FOR ROUND ${roundNumber}`);
  
  // Warming period: no rewards for first 3 rounds
  if (roundNumber < 4) {
    console.log(`⏳ Warming period - no rewards for round ${roundNumber}`);
    const emptyDistribution: DistributionList = {};
    submitters.forEach(submitter => {
      emptyDistribution[submitter.publicKey] = 0;
    });
    return emptyDistribution;
  }
  
  const distributionList: DistributionList = {};
  const approvedSubmitters = submitters.filter(submitter => submitter.votes > 0);
  
  if (approvedSubmitters.length === 0) {
    console.log(`❌ No approved submitters for round ${roundNumber}`);
    submitters.forEach(submitter => {
      distributionList[submitter.publicKey] = 0;
    });
    return distributionList;
  }
  
  // Custom reward: 3 tokens per approved node
  const rewardPerNode = 3;
  const tokenDecimals = 1_000_000_000;
  const rewardBaseUnits = rewardPerNode * tokenDecimals;
  
  submitters.forEach(submitter => {
    if (submitter.votes > 0) {
      distributionList[submitter.publicKey] = rewardBaseUnits;
      console.log(`✅ REWARDED: ${submitter.publicKey} with ${rewardPerNode} tokens`);
      
      // Send actual reward
      sendReward(submitter.publicKey, submitter.publicKey, rewardPerNode, Math.floor(Date.now() / 1000))
        .then(() => console.log(`💰 Reward sent to ${submitter.publicKey}`))
        .catch(error => console.error(`❌ Failed to send reward to ${submitter.publicKey}:`, error));
    } else {
      distributionList[submitter.publicKey] = 0;
      console.log(`❌ REJECTED: ${submitter.publicKey} (no votes)`);
    }
  });
  
  console.log(`📊 ROUND ${roundNumber} SUMMARY: ${approvedSubmitters.length} rewarded`);
  return distributionList;
};
```

**Reference:** See original `4-distribution.ts` lines 50-150 for the complete reward system.

## Testing Each Phase

### Phase 1 Testing
```bash
# Test basic hardware detection
node test-simplified-task.js
# Check logs for hardware data collection
```

### Phase 2 Testing
```bash
# Test enhanced audit with invalid data
# Submit with uptime = 0, should be rejected
# Submit with old timestamp, should be rejected
```

### Phase 3 Testing
```bash
# Test uptime tracking across multiple rounds
# Verify cumulative uptime calculation
```

### Phase 4 Testing
```bash
# Test hardware change detection
# Modify system hardware and verify detection
```

### Phase 5 Testing
```bash
# Test custom distribution and rewards
# Verify warming period and token distribution
```

## Rollback Strategy

If any phase causes issues, you can quickly rollback by:

1. **Restore the simplified version** of the specific file
2. **Remove the new imports** that were added
3. **Test the rollback** to ensure stability
4. **Investigate the issue** before proceeding

## Code References

### Original Complex Files (Preserved)
- `hardware-detection.ts` - Complete hardware detection system
- `uptime-tracker.ts` - Advanced uptime tracking
- `static-cache-manager.ts` - Hardware change detection
- `reward.ts` - Custom reward payout system
- `uptime-utils.ts` - Uptime calculation utilities

### Simplified Files (Current)
- `1-task.ts` - Basic uptime collection
- `2-submission.ts` - Simple JSON submission
- `3-audit.ts` - Always returns true
- `4-distribution.ts` - Default distribution

## Next Steps

1. **Start with Phase 1** - Add basic hardware detection
2. **Test thoroughly** before proceeding to next phase
3. **Monitor logs** for any issues
4. **Gradually add features** one phase at a time
5. **Keep the simplified versions** as fallback options

---

**Status**: ✅ Ready for Phase 1 implementation
**Estimated Time per Phase**: 30-60 minutes
**Testing Time per Phase**: 1-2 rounds (1-2 hours) 