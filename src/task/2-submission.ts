import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';
import { TaskSubmissionData } from './1-task';

export async function submission(roundNumber: number): Promise<string | void> {
  /**
   * Submit the task proofs for auditing
   * Must return a string of max 512 bytes to be submitted on chain
   * CRITICAL: This function should always return a valid string to avoid submission failures
   */
  try {
    console.log(`MAKE SUBMISSION FOR ROUND ${roundNumber}`);
    
    // Validate round number
    if (typeof roundNumber !== 'number' || roundNumber < 0) {
      console.error(`❌ Invalid round number: ${roundNumber}`);
      return JSON.stringify({ error: 'Invalid round number', timestamp: Date.now() });
    }
    
    // Get new structured task submission data first
    const taskSubmissionData = await namespaceWrapper.storeGet('taskSubmissionData');
    
    if (taskSubmissionData) {
      try {
        const parsedTaskData: TaskSubmissionData = JSON.parse(taskSubmissionData);
        
        // Create optimized submission for 512-byte limit
        const optimizedSubmission = createOptimizedSubmission(parsedTaskData);
        const submissionString = JSON.stringify(optimizedSubmission);
        
        if (submissionString.length <= 512) {
          console.log(`📤 Submitting structured data (${submissionString.length} bytes): ${submissionString}`);
          return submissionString;
        } else {
          console.warn(`⚠️ Structured submission too large (${submissionString.length} bytes), falling back to minimal format`);
          // Fall through to legacy format
        }
      } catch (parseError) {
        console.error(`❌ Failed to parse task submission data:`, parseError);
        // Fall through to legacy format
      }
    }
    
    // Fallback to legacy uptime data format
    console.log('📤 Using legacy uptime data format as fallback');
    const uptimeData = await namespaceWrapper.storeGet('uptimeData');
    
    if (!uptimeData) {
      console.error(`❌ No submission data available for round ${roundNumber}`);
      // Return a fallback submission instead of failing
      return JSON.stringify({ 
        error: 'No data available', 
        timestamp: Date.now(), 
        date: new Date().toISOString().split('T')[0] 
      });
    }
    
    // Parse uptime data if it's a string (JSON)
    let parsedUptimeData;
    if (typeof uptimeData === 'string') {
      try {
        parsedUptimeData = JSON.parse(uptimeData);
      } catch (parseError) {
        console.error(`❌ Failed to parse uptime data for round ${roundNumber}:`, parseError);
        return JSON.stringify({ 
          error: 'Invalid data format', 
          timestamp: Date.now(), 
          date: new Date().toISOString().split('T')[0] 
        });
      }
    } else if (typeof uptimeData === 'object' && uptimeData !== null) {
      parsedUptimeData = uptimeData;
    } else {
      console.error(`❌ Invalid uptime data structure for round ${roundNumber}:`, typeof uptimeData);
      return JSON.stringify({ 
        error: 'Invalid data structure', 
        timestamp: Date.now(), 
        date: new Date().toISOString().split('T')[0] 
      });
    }
    
    // Ensure the submission is a string and within size limits
    const submissionData = JSON.stringify(parsedUptimeData);
    
    if (submissionData.length > 512) {
      console.error(`❌ Submission too large: ${submissionData.length} bytes (max 512)`);
      // Return a truncated version
      const truncatedData = {
        uptime: parsedUptimeData.uptime || 0,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      return JSON.stringify(truncatedData);
    }
    
    console.log(`📤 Submitting legacy uptime data: ${submissionData}`);
    return submissionData;
    
  } catch (error) {
    // CRITICAL: Never let submission function fail completely
    console.error(`🚨 CRITICAL ERROR in submission function for round ${roundNumber}:`, error);
    console.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    
    // Return an error submission that can still be processed
    const errorSubmission = JSON.stringify({
      error: 'Submission function error',
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      round: roundNumber
    });
    
    console.log(`🔄 Returning error submission for round ${roundNumber}: ${errorSubmission}`);
    return errorSubmission;
  }
}

/**
 * Create an optimized submission that fits within 512 bytes
 */
function createOptimizedSubmission(data: TaskSubmissionData): any {
  const submission: any = {
    d: { // dynamic
      u: data.dynamic.uptime
    },
    m: { // metadata
      sc: data.metadata.staticChanged,
      t: data.metadata.timestamp,
      r: data.metadata.roundNumber
    }
  };
  
  // Only include static data if it changed
  if (data.static && data.metadata.staticChanged) {
    submission.s = { // static
      w: data.static.wanIp.substring(0, 15), // WAN IP
      l: data.static.lanIp.substring(0, 15), // LAN IP
      c: data.static.cpu.model.substring(0, 25), // CPU model (truncated)
      cp: data.static.cpu.coresPhysical, // CPU cores
      r: Math.round(data.static.ram.totalMB / 1024), // RAM in GB
      rt: data.static.ram.type?.substring(0, 10) || 'Unknown', // RAM type
      st: data.static.storage.totalGB, // Storage total
      sd: data.static.storage.deviceCount, // Storage device count
      g: data.static.gpu.present ? 1 : 0, // GPU present
      gv: data.static.gpu.vendor?.substring(0, 10) || '', // GPU vendor
      o: data.static.os.platform.substring(0, 10), // OS platform
      v: data.static.os.isVirtual ? 1 : 0, // Is virtual
      n: data.static.network.nicModel?.substring(0, 15) || '', // Network interface
      a: data.static.system.arch, // Architecture
      h: data.static.system.hostname.substring(0, 20) // Hostname
    };
  }
  
  // Include wallet if available and space permits
  if (data.metadata.nodeWallet && data.metadata.nodeWallet !== 'unknown') {
    submission.w = data.metadata.nodeWallet.substring(0, 44); // Solana pubkey length
  }
  
  return submission;
}
