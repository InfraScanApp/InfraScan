// BACKUP: Complex submission implementation saved as backup
// Original file preserved in: 2-submission.ts.backup
// This simplified version focuses on basic data submission only

import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';
import { SimpleTaskData } from './1-task';

export async function submission(roundNumber: number): Promise<string> {
  console.log(`📤 IMPROVED SUBMISSION FOR ROUND ${roundNumber}`);
  
  try {
    // Get task data
    const taskData = await namespaceWrapper.storeGet('taskData');
    
    if (!taskData) {
      console.error(`❌ No task data available for round ${roundNumber}`);
      return JSON.stringify({
        uptime: 0,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        roundNumber
      });
    }
    
    // Parse and validate task data
    let parsedData: SimpleTaskData;
    try {
      parsedData = JSON.parse(taskData);
    } catch (parseError) {
      console.error(`❌ Failed to parse task data:`, parseError);
      return JSON.stringify({
        uptime: 0,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        roundNumber
      });
    }
    
    // Create simple submission
    const submissionData = {
      uptime: parsedData.uptime,
      timestamp: parsedData.timestamp,
      date: parsedData.date,
      roundNumber: parsedData.roundNumber
    };
    
    const submissionString = JSON.stringify(submissionData);
    
    // IMPROVED: Add byte limit validation (following default Koii pattern)
    const byteLength = Buffer.byteLength(submissionString, "utf8");
    if (byteLength > 512) {
      console.error(`❌ SUBMISSION EXCEEDS 512 BYTES: ${byteLength} bytes`);
      throw new Error("Submission exceeds 512 bytes");
    }
    
    console.log(`📤 Submitting: ${submissionString} (${byteLength} bytes)`);
    
    return submissionString;
    
  } catch (error) {
    console.error(`❌ SUBMISSION ERROR:`, error);
    
    // Return fallback submission
    return JSON.stringify({
      uptime: 0,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber
    });
  }
}
