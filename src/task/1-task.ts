import { namespaceWrapper } from "@_koii/task-manager/namespace-wrapper";
import { UptimeTracker } from './uptime-tracker';

export async function task(roundNumber: number): Promise<void> {
  // Run your task and store the proofs to be submitted for auditing
  // The submission of the proofs is done in the submission function
  try {
    console.log(`EXECUTE TASK FOR ROUND ${roundNumber}`);
    
    // Record uptime for this round
    const uptimeTracker = UptimeTracker.getInstance();
    const uptimeRecord = await uptimeTracker.recordUptime(roundNumber);
    
    console.log(`Node uptime: ${uptimeRecord.uptimeDays}d ${uptimeRecord.uptimeHours % 24}h ${uptimeRecord.uptimeMinutes % 60}m`);
    console.log(`Monthly uptime: ${(await uptimeTracker.calculateUptimeStats()).monthly[new Date().getFullYear() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0')]?.percentage?.toFixed(2) || 0}%`);
    
    // Store uptime data for submission
    const uptimeSubmissionData = await uptimeTracker.getUptimeSubmissionData();
    await namespaceWrapper.storeSet("uptimeData", uptimeSubmissionData);
    
    // you can optionally return this value to be used in debugging
    await namespaceWrapper.storeSet("value", "Hello, World!");
  } catch (error) {
    console.error("EXECUTE TASK ERROR:", error);
  }
}
