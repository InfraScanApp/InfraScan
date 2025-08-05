// BACKUP: Complex task implementation saved as backup
// Original file preserved in: 1-task.ts.backup
// This improved version focuses on basic data collection with better error handling

import { namespaceWrapper } from "@_koii/task-manager/namespace-wrapper";

export interface SimpleTaskData {
  uptime: number;
  timestamp: number;
  date: string;
  roundNumber: number;
}

export async function task(roundNumber: number): Promise<void> {
  console.log(`🚀 IMPROVED TASK FOR ROUND ${roundNumber}`);
  
  try {
    // IMPROVED: Get current slot (following default Koii pattern)
    const currentSlot = await namespaceWrapper.getSlot();
    console.log(`📊 Current slot: ${currentSlot}`);
    
    // Get basic uptime (in seconds)
    const uptimeSeconds = process.uptime();
    
    // Create simple submission data
    const taskData: SimpleTaskData = {
      uptime: Math.floor(uptimeSeconds),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber
    };
    
    // IMPROVED: Validate data before storing
    if (taskData.uptime < 0) {
      throw new Error("Invalid uptime value");
    }
    
    // Store for submission
    await namespaceWrapper.storeSet("taskData", JSON.stringify(taskData));
    console.log(`✅ Stored improved task data for round ${roundNumber}: uptime=${taskData.uptime}s, slot=${currentSlot}`);
    
    // IMPROVED: Also store a simple value for compatibility (following default template pattern)
    await namespaceWrapper.storeSet("value", `InfraScan-${roundNumber}-${taskData.uptime}s`);
    console.log(`📦 Stored compatibility value for round ${roundNumber}`);
    
  } catch (error) {
    console.error("❌ TASK ERROR:", error);
    
    // IMPROVED: Better fallback data in case of error
    const fallbackData: SimpleTaskData = {
      uptime: 0,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      roundNumber
    };
    
    try {
      await namespaceWrapper.storeSet("taskData", JSON.stringify(fallbackData));
      await namespaceWrapper.storeSet("value", `InfraScan-${roundNumber}-fallback`);
      console.log('📤 Stored fallback task data due to error');
    } catch (storeError) {
      console.error('❌ FAILED TO STORE FALLBACK DATA:', storeError);
    }
  }
}
