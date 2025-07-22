import { UptimeTracker } from './uptime-tracker';

export const setup = async () => {
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

  console.log('🛠️ Task setup complete. Delayed audit/reward will activate per round.');
};
