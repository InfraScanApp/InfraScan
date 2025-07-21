import { namespaceWrapper } from "@_koii/task-manager/namespace-wrapper";
import { UptimeTracker } from './uptime-tracker';
import { StaticCacheManager } from './static-cache-manager';

export interface TaskSubmissionData {
  static: {
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
      deviceCount: number;
    };
    gpu: {
      present: boolean;
      vendor?: string;
      model?: string;
    };
    os: {
      platform: string;
      distro?: string;
      isVirtual: boolean;
      virtualPlatform?: string;
    };
    network: {
      nicModel?: string;
    };
    system: {
      arch: string;
      hostname: string;
    };
  } | null;
  dynamic: {
    uptime: number;
  };
  metadata: {
    staticChanged: boolean;
    nodeWallet: string;
    timestamp: number;
    date: string;
    roundNumber: number;
  };
}

export async function task(roundNumber: number): Promise<void> {
  // Run your task and store the proofs to be submitted for auditing
  // The submission of the proofs is done in the submission function
  try {
    console.log(`EXECUTE TASK FOR ROUND ${roundNumber}`);
    
    // Initialize managers
    const uptimeTracker = UptimeTracker.getInstance();
    const staticCacheManager = StaticCacheManager.getInstance();
    
    // Collect dynamic data (uptime)
    console.log('📊 Collecting dynamic metrics...');
    const uptimeRecord = await uptimeTracker.recordUptime(roundNumber);
    const currentUptimeSeconds = uptimeTracker.getCurrentUptimeSeconds();
    
    console.log(`Node uptime: ${uptimeRecord.uptimeDays}d ${uptimeRecord.uptimeHours % 24}h ${uptimeRecord.uptimeMinutes % 60}m`);
    
    // Check for static hardware changes
    console.log('🔍 Checking for static hardware changes...');
    const staticChangeResult = await staticCacheManager.checkForStaticChanges();
    
    if (staticChangeResult.hasChanged) {
      console.log(`✅ Static data changed: ${staticChangeResult.reason}`);
    } else {
      console.log(`➡️ No static changes: ${staticChangeResult.reason}`);
    }
    
    // Get node wallet from environment or context
    const nodeWallet = await getNodeWallet();
    
    // Create structured submission data
    const submissionData: TaskSubmissionData = {
      static: staticChangeResult.hasChanged ? {
        wanIp: staticChangeResult.currentData.wanIp,
        lanIp: staticChangeResult.currentData.lanIp,
        cpu: {
          model: staticChangeResult.currentData.cpu.model,
          coresPhysical: staticChangeResult.currentData.cpu.coresPhysical,
          coresLogical: staticChangeResult.currentData.cpu.coresLogical,
          frequencyGHz: staticChangeResult.currentData.cpu.frequencyGHz
        },
        ram: {
          totalMB: staticChangeResult.currentData.ram.totalMB,
          type: staticChangeResult.currentData.ram.type
        },
        storage: {
          totalGB: staticChangeResult.currentData.storage.totalGB,
          deviceCount: staticChangeResult.currentData.storage.devices.length
        },
        gpu: {
          present: staticChangeResult.currentData.gpu.present,
          vendor: staticChangeResult.currentData.gpu.vendor,
          model: staticChangeResult.currentData.gpu.model
        },
        os: {
          platform: staticChangeResult.currentData.os.platform,
          distro: staticChangeResult.currentData.os.distro,
          isVirtual: staticChangeResult.currentData.os.isVirtual,
          virtualPlatform: staticChangeResult.currentData.os.virtualPlatform
        },
        network: {
          nicModel: staticChangeResult.currentData.network.nicModel
        },
        system: {
          arch: staticChangeResult.currentData.system.arch,
          hostname: staticChangeResult.currentData.system.hostname
        }
      } : null,
      dynamic: {
        uptime: currentUptimeSeconds
      },
      metadata: {
        staticChanged: staticChangeResult.hasChanged,
        nodeWallet,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        roundNumber
      }
    };
    
    // Store submission data
    await namespaceWrapper.storeSet("taskSubmissionData", JSON.stringify(submissionData));
    
    // Legacy compatibility - also store uptime data in old format
    const uptimeSubmissionData = await uptimeTracker.getUptimeSubmissionData();
    await namespaceWrapper.storeSet("uptimeData", uptimeSubmissionData);
    
    console.log(`📤 Prepared submission data - Static: ${staticChangeResult.hasChanged ? 'Included' : 'Omitted'}, Dynamic: Uptime ${currentUptimeSeconds}s`);
    
    // Optional debug value
    await namespaceWrapper.storeSet("value", "InfraScan Task Running");
    
  } catch (error) {
    console.error("EXECUTE TASK ERROR:", error);
    
    // In case of error, create minimal submission data
    try {
      const fallbackSubmission: TaskSubmissionData = {
        static: null,
        dynamic: {
          uptime: 0
        },
        metadata: {
          staticChanged: false,
          nodeWallet: await getNodeWallet(),
          timestamp: Date.now(),
          date: new Date().toISOString().split('T')[0],
          roundNumber
        }
      };
      
      await namespaceWrapper.storeSet("taskSubmissionData", JSON.stringify(fallbackSubmission));
      console.log('📤 Stored fallback submission data due to error');
    } catch (fallbackError) {
      console.error('Failed to store fallback submission data:', fallbackError);
    }
  }
}

/**
 * Get node wallet address from environment or namespace
 */
async function getNodeWallet(): Promise<string> {
  try {
    // Try to get from environment first
    if (process.env.TASK_NODE_WALLET) {
      return process.env.TASK_NODE_WALLET;
    }
    
    // Try to get from namespace wrapper
    const storedWallet = await namespaceWrapper.storeGet("nodeWallet");
    if (storedWallet) {
      return storedWallet;
    }
    
    // Try to get from config or public key
    try {
      const publicKey = await namespaceWrapper.getMainAccountPubkey();
      if (publicKey) {
        return publicKey.toString();
      }
    } catch (pubkeyError) {
      console.warn('Could not get public key from namespace wrapper:', pubkeyError);
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Failed to get node wallet:', error);
    return 'unknown';
  }
}
