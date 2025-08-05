# Quick Reference Card - Original Code Snippets

## Phase 1: Hardware Detection

### From `hardware-detection.ts`
**Lines 1-50:** Interface and class definition
```typescript
export interface StaticHardwareData {
  wanIp: string;
  lanIp: string;
  cpu: {
    model: string;
    coresPhysical: number;
    coresLogical: number;
    frequencyGHz?: number;
  };
  ram: {
    totalMB: number;
    type?: string;
  };
  storage: {
    totalGB: number;
    devices: object[];
  };
  // ... rest of interface
}
```

**Lines 1100-1115:** Main collection function
```typescript
export default async function collectHardwareData(): Promise<StaticHardwareData> {
  const detector = HardwareDetection.getInstance();
  return await detector.collectStaticData();
}
```

## Phase 2: Enhanced Audit

### From Original `3-audit.ts`
**Lines 400-450:** Basic validation logic
```typescript
function validateUptimeSubmission(data: UptimeSubmissionData, submitterKey: string): boolean {
  // Check if uptime values are reasonable
  if (typeof data.uptime !== 'number' || data.uptime <= 0 || data.uptime > 31536000) {
    console.log(`❌ Invalid uptime value from ${submitterKey}: ${data.uptime}`);
    return false;
  }
  
  // Enhanced timestamp validation
  const now = Date.now();
  const timeDiff = Math.abs(now - data.timestamp);
  const maxTimeDiff = 6 * 60 * 60 * 1000; // 6 hours tolerance
  
  if (timeDiff > maxTimeDiff) {
    console.log(`❌ Timestamp out of range from ${submitterKey}`);
    return false;
  }
  
  return true;
}
```

## Phase 3: Uptime Tracking

### From `uptime-tracker.ts`
**Lines 60-110:** Record uptime method
```typescript
public async recordUptime(roundNumber: number): Promise<UptimeRecord> {
  const now = Date.now();
  
  // Get cumulative stats
  const cumulativeRounds = await this.getCumulativeRounds();
  const totalUptimeHours = await this.getTotalUptimeHours();
  
  // Calculate actual uptime based on round participation
  const actualUptimeHours = cumulativeRounds + 1;
  const actualUptimeSeconds = actualUptimeHours * 3600;
  
  const record: UptimeRecord = {
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    roundNumber,
    uptimeSeconds: actualUptimeSeconds,
    uptimeMinutes: Math.floor(actualUptimeSeconds / 60),
    uptimeHours: actualUptimeHours,
    uptimeDays: Math.floor(actualUptimeHours / 24),
    nodeStartTime: this.nodeStartTime,
    isOnline: true,
    roundParticipation: true,
    cumulativeRounds: actualUptimeHours,
    totalUptimeHours: actualUptimeHours
  };

  // Update cumulative stats
  await this.updateCumulativeStats(actualUptimeHours);
  
  // Store the record
  await this.storeUptimeRecord(record);
  
  return record;
}
```

## Phase 4: Hardware Change Detection

### From `static-cache-manager.ts`
**Lines 1-50:** Cache manager interface
```typescript
export interface StaticChangeResult {
  hasChanged: boolean;
  reason: string;
  currentData?: StaticHardwareData;
  previousData?: StaticHardwareData;
}

export class StaticCacheManager {
  private static instance: StaticCacheManager;
  private readonly CACHE_KEY = 'static_hardware_cache';
  private readonly CACHE_HASH_KEY = 'static_hardware_hash';
  
  public static getInstance(): StaticCacheManager {
    if (!StaticCacheManager.instance) {
      StaticCacheManager.instance = new StaticCacheManager();
    }
    return StaticCacheManager.instance;
  }
}
```

## Phase 5: Custom Distribution

### From Original `4-distribution.ts`
**Lines 50-100:** Reward constants and structure
```typescript
// ENHANCED REWARD SYSTEM CONSTANTS
const MINIMUM_ROUND_FOR_REWARDS = 4;
const REWARD_PER_NODE = 3;
const TOKEN_DECIMALS = 1_000_000_000; // 1 billion base units = 1 token
const REWARD_BASE_UNITS = REWARD_PER_NODE * TOKEN_DECIMALS;

// PRODUCTION CONSTANTS
const TOKENS_PER_ROUND = 3; // 3 tokens per approved node per round
const MAX_BOUNTY_PER_ROUND = 4000; // 4000 tokens maximum per round
```

**Lines 150-200:** Main distribution logic
```typescript
export const distribution = async (
  submitters: Submitter[],
  bounty: number,
  roundNumber: number
): Promise<DistributionList> => {
  // Early return for warming up rounds
  if (roundNumber < MINIMUM_ROUND_FOR_REWARDS) {
    console.log(`⏳ Skipping distribution for round ${roundNumber} — warming up`);
    const emptyDistribution: DistributionList = {};
    submitters.forEach(submitter => {
      emptyDistribution[submitter.publicKey] = 0;
    });
    return emptyDistribution;
  }

  // Build approvedNodes structure
  const approvedNodes: Record<string, number> = {};
  submitters.forEach(submitter => {
    approvedNodes[submitter.publicKey] = submitter.votes;
  });
  
  // Main distribution logic
  const distributionList: Record<string, number> = {};
  let rewardedCount = 0;

  for (const [nodeId, votes] of Object.entries(approvedNodes)) {
    if (votes > 0) {
      distributionList[nodeId] = REWARD_BASE_UNITS;
      rewardedCount++;
      console.log(`🎁 REWARDED: ${nodeId} with ${REWARD_PER_NODE} tokens for round ${roundNumber}`);
    } else {
      distributionList[nodeId] = 0;
      console.log(`❌ REJECTED: ${nodeId} — audit failed or no quorum`);
    }
  }

  return distributionList;
};
```

## Reward System

### From `reward.ts`
**Lines 1-50:** Reward sending function
```typescript
export async function sendReward(
  nodeId: string,
  walletAddress: string,
  amount: number,
  timestamp: number
): Promise<void> {
  try {
    console.log(`💰 Sending reward: ${amount} tokens to ${walletAddress}`);
    
    // Convert to base units
    const baseUnits = amount * 1_000_000_000;
    
    // Log reward details
    console.log(`📊 Reward Details:`);
    console.log(`   Node ID: ${nodeId}`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Amount: ${amount} tokens (${baseUnits} base units)`);
    console.log(`   Timestamp: ${timestamp}`);
    
    // TODO: Implement actual reward sending logic
    // This would typically involve calling the Koii reward API
    
    console.log(`✅ Reward sent successfully to ${walletAddress}`);
    
  } catch (error) {
    console.error(`❌ Failed to send reward to ${walletAddress}:`, error);
    throw error;
  }
}
```

## Quick Copy Commands

### Phase 1: Hardware Detection
```bash
# Copy hardware detection interface
head -50 src/task/hardware-detection.ts > hardware-interface.txt

# Copy main collection function
tail -15 src/task/hardware-detection.ts > hardware-collection.txt
```

### Phase 2: Enhanced Audit
```bash
# Copy validation logic
sed -n '400,450p' src/task/3-audit.ts.backup > audit-validation.txt
```

### Phase 3: Uptime Tracking
```bash
# Copy uptime tracking method
sed -n '60,110p' src/task/uptime-tracker.ts > uptime-tracking.txt
```

### Phase 4: Change Detection
```bash
# Copy cache manager interface
head -50 src/task/static-cache-manager.ts > cache-manager.txt
```

### Phase 5: Custom Distribution
```bash
# Copy distribution logic
sed -n '150,200p' src/task/4-distribution.ts.backup > distribution-logic.txt
```

## File Structure Reference

```
src/task/
├── 1-task.ts                    # Current: Simplified
├── 2-submission.ts              # Current: Simplified  
├── 3-audit.ts                   # Current: Simplified
├── 4-distribution.ts            # Current: Simplified
├── hardware-detection.ts        # ✅ Preserved (1115 lines)
├── uptime-tracker.ts            # ✅ Preserved (331 lines)
├── static-cache-manager.ts      # ✅ Preserved (340 lines)
├── reward.ts                    # ✅ Preserved (144 lines)
├── uptime-utils.ts              # ✅ Preserved (310 lines)
├── 5-routes.ts                  # ✅ Preserved (289 lines)
└── checkin-task.ts              # ✅ Preserved (44 lines)
```

## Testing Commands

```bash
# Test current simplified version
node test-simplified-task.js

# Test after each phase
npm test

# Check logs
tail -f logs/task.log
```

---

**Status**: ✅ Ready for incremental restoration
**Backup Files**: All original complex implementations preserved
**Reference**: Use line numbers above to copy specific code sections 