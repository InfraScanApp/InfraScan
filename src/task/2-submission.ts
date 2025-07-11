import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';

export async function submission(roundNumber: number): Promise<string | void> {
  /**
   * Submit the task proofs for auditing
   * Must return a string of max 512 bytes to be submitted on chain
   */
  try {
    console.log(`MAKE SUBMISSION FOR ROUND ${roundNumber}`);
    
    // Get uptime data for submission
    const uptimeData = await namespaceWrapper.storeGet('uptimeData');
    
    if (uptimeData) {
      // Include uptime data in submission
      console.log('Submitting uptime data:', uptimeData);
      return uptimeData;
    } else {
      // Fallback to original behavior if no uptime data
      const value = await namespaceWrapper.storeGet('value');
      return value ?? '';
    }
  } catch (error) {
    console.error('MAKE SUBMISSION ERROR:', error);
    // Fallback to original behavior on error
    try {
      const value = await namespaceWrapper.storeGet('value');
      return value ?? '';
    } catch (fallbackError) {
      console.error('FALLBACK SUBMISSION ERROR:', fallbackError);
      return '';
    }
  }
}
