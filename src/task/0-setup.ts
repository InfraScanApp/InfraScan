import { UptimeTracker } from './uptime-tracker';

export async function setup(): Promise<void> {
  // define any steps that must be executed before the task starts
  console.log("CUSTOM SETUP");
  
  // Initialize uptime tracker
  try {
    const uptimeTracker = UptimeTracker.getInstance();
    await uptimeTracker.initialize();
    console.log("Uptime tracker initialized successfully");
  } catch (error) {
    console.error("Failed to initialize uptime tracker:", error);
  }
}
