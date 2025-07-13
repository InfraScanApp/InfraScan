import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';

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
    
    // Get uptime data for submission
    const uptimeData = await namespaceWrapper.storeGet('uptimeData');
    
    if (!uptimeData) {
      console.error(`❌ No uptime data available for round ${roundNumber}`);
      // Return a fallback submission instead of failing
      return JSON.stringify({ 
        error: 'No uptime data', 
        timestamp: Date.now(), 
        date: new Date().toISOString().split('T')[0] 
      });
    }
    
    // Validate uptime data structure
    if (typeof uptimeData !== 'object' || uptimeData === null) {
      console.error(`❌ Invalid uptime data structure for round ${roundNumber}:`, typeof uptimeData);
      return JSON.stringify({ 
        error: 'Invalid uptime data structure', 
        timestamp: Date.now(), 
        date: new Date().toISOString().split('T')[0] 
      });
    }
    
    // Ensure the submission is a string and within size limits
    const submissionData = JSON.stringify(uptimeData);
    
    if (submissionData.length > 512) {
      console.error(`❌ Submission too large: ${submissionData.length} bytes (max 512)`);
      // Return a truncated version
      const uptimeDataTyped = uptimeData as any;
      const truncatedData = {
        uptime: uptimeDataTyped.uptime || 0,
        monthlyUptime: uptimeDataTyped.monthlyUptime || 0,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      return JSON.stringify(truncatedData);
    }
    
    console.log(`Submitting uptime data: ${submissionData}`);
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
