export const validateOptimizedSubmission = (submission: any, wallet: string): boolean => {
    try {
      if (!submission || typeof submission !== 'object') return false;
  
      const {
        wallet_address,
        uptime,
        timestamp,
        deviceType,
        cpu,
        ram,
        storage
      } = submission;
  
      if (!wallet_address || wallet_address !== wallet) return false;
      if (!timestamp || isNaN(timestamp)) return false;
      if (!uptime || typeof uptime !== 'number' || uptime <= 0) return false;
  
      const now = Date.now();
      const timeDrift = Math.abs(now - timestamp);
  
      // Allowable clock skew: 7 minutes
      if (timeDrift > 7 * 60 * 1000) return false;
  
      // Basic hardware presence checks
      if (!deviceType || !cpu || !ram || !storage) return false;
  
      return true;
    } catch (err) {
      console.warn(`🚫 Validation error:`, err);
      return false;
    }
  };
  