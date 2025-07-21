/**
 * Audit function for InfraScan task
 * Phase 1: Uptime tracking validation
 * Future phases: Hardware and reporting data validation
 * 
 * NOTE: You may see "SUBMIT AUDIT TRIGGER undefined" messages in logs.
 * This is a cosmetic framework-level logging issue that doesn't affect
 * the actual audit process or rewards. The audit logic below works correctly.
 */

interface UptimeSubmissionData {
  uptime: number;
  monthlyUptime?: number;
  timestamp: number;
  date: string;
}

interface HardwareSubmissionData {
  // Future phase: Hardware data structure
  cpu?: string;
  memory?: number;
  storage?: number;
  network?: string;
  uptime?: number;
  timestamp?: number;
  date?: string;
}

// New optimized submission format with short property names
interface OptimizedSubmissionData {
  s?: { // static hardware data
    w: string; // WAN IP
    l: string; // LAN IP
    c: string; // CPU model
    cp: number; // CPU cores physical
    r: number; // RAM size in GB
    rt: string; // RAM type
    st: number; // Storage total GB
    sd: number; // Storage device count
    g: number; // GPU present (0/1)
    gv: string; // GPU vendor
    o: string; // OS platform
    v: number; // Is virtual (0/1)
    n: string; // Network interface
    a: string; // Architecture
    h: string; // Hostname
  };
  d: { // dynamic data
    u: number; // uptime in seconds
  };
  m: { // metadata
    sc: boolean; // static changed flag
    t: number; // timestamp
    r: number; // round number
  };
  w?: string; // wallet address
}

type SubmissionData = UptimeSubmissionData | HardwareSubmissionData | OptimizedSubmissionData | string;

export async function audit(
  submission: string,
  roundNumber: number,
  submitterKey: string,
): Promise<boolean> {
  /**
   * Audit a submission
   * This function should return true if the submission is correct, false otherwise
   * CRITICAL: This function MUST always return a boolean, never undefined or throw
   */
  console.log(`🔍 AUDIT SUBMISSION FOR ROUND ${roundNumber} from ${submitterKey}`);
  console.log(`📋 AUDIT INPUT: submission=${submission?.substring(0, 100)}${submission?.length > 100 ? '...' : ''}, round=${roundNumber}, submitter=${submitterKey}`);
  
  // Wrap everything in try-catch to ensure we ALWAYS return a boolean
  try {
    // Validate input parameters
    if (!submission || typeof submission !== 'string') {
      console.log(`❌ Invalid submission parameter from ${submitterKey}: ${typeof submission}`);
      console.log(`🔄 AUDIT RESULT: Returning FALSE for ${submitterKey} (invalid submission)`);
      console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
      return false;
    }
    
    if (typeof roundNumber !== 'number' || roundNumber < 0) {
      console.log(`❌ Invalid round number from ${submitterKey}: ${roundNumber}`);
      console.log(`🔄 AUDIT RESULT: Returning FALSE for ${submitterKey} (invalid round)`);
      console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
      return false;
    }
    
    if (!submitterKey || typeof submitterKey !== 'string') {
      console.log(`❌ Invalid submitter key: ${typeof submitterKey}`);
      console.log(`🔄 AUDIT RESULT: Returning FALSE for ${submitterKey} (invalid key)`);
      console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
      return false;
    }

    // Try to parse as JSON first (for structured data)
    try {
      const submissionData = JSON.parse(submission);
      
      // Check for new optimized submission format
      if (isOptimizedSubmission(submissionData)) {
        const result = validateOptimizedSubmission(submissionData, submitterKey);
        console.log(`🎯 FINAL AUDIT DECISION: ${result ? 'APPROVE' : 'REJECT'} for ${submitterKey} (optimized format)`);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey} (optimized format)`);
        
        // Enhanced logging for rewards tracking
        if (result) {
          console.log(`✅ AUDIT PASSED: ${submitterKey}`);
        } else {
          console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
        }
        
        return result;
      }
      
      // Phase 1: Validate uptime data (legacy format)
      if (isUptimeSubmission(submissionData)) {
        const result = validateUptimeSubmission(submissionData, submitterKey);
        console.log(`🎯 FINAL AUDIT DECISION: ${result ? 'APPROVE' : 'REJECT'} for ${submitterKey} (legacy uptime)`);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey} (legacy uptime)`);
        
        // Enhanced logging for rewards tracking
        if (result) {
          console.log(`✅ AUDIT PASSED: ${submitterKey}`);
        } else {
          console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
        }
        
        return result;
      }
      
      // Future Phase: Validate hardware data
      if (isHardwareSubmission(submissionData)) {
        const result = validateHardwareSubmission(submissionData, submitterKey);
        console.log(`🎯 FINAL AUDIT DECISION: ${result ? 'APPROVE' : 'REJECT'} for ${submitterKey} (hardware)`);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey} (hardware)`);
        
        // Enhanced logging for rewards tracking
        if (result) {
          console.log(`✅ AUDIT PASSED: ${submitterKey}`);
        } else {
          console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
        }
        
        return result;
      }
      
      // If it's valid JSON but unknown structure, reject
      console.log(`Unknown submission structure from ${submitterKey}:`, submissionData);
      console.log(`🎯 FINAL AUDIT DECISION: REJECT for ${submitterKey} (unknown structure)`);
      console.log(`🔄 Main audit function returning: false for ${submitterKey} (unknown structure)`);
      
      // Enhanced logging for rewards tracking
      console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
      
      return false;
      
    } catch (jsonError) {
      // If JSON parsing fails, try fallback validations
      console.log(`JSON parsing failed for ${submitterKey}, trying fallback validations`);
      
      // Fallback: Check for simple string submissions
      if (typeof submission === 'string') {
        const result = validateStringSubmission(submission, submitterKey);
        console.log(`🎯 FINAL AUDIT DECISION: ${result ? 'APPROVE' : 'REJECT'} for ${submitterKey} (string validation)`);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey} (string validation)`);
        
        // Enhanced logging for rewards tracking
        if (result) {
          console.log(`✅ AUDIT PASSED: ${submitterKey}`);
        } else {
          console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
        }
        
        return result;
      }
      
      console.log(`Invalid submission format from ${submitterKey}`);
      console.log(`🎯 FINAL AUDIT DECISION: REJECT for ${submitterKey} (invalid format)`);
      console.log(`🔄 Main audit function returning: false for ${submitterKey} (invalid format)`);
      
      // Enhanced logging for rewards tracking
      console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
      
      return false;
    }
    
  } catch (error) {
    // CRITICAL: Catch ANY error and return false instead of undefined
    console.error(`🚨 CRITICAL ERROR in audit function for ${submitterKey}:`, error);
    console.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    console.log(`🎯 FINAL AUDIT DECISION: REJECT for ${submitterKey} (critical error)`);
    console.log(`🔄 Main audit function returning: false for ${submitterKey} (critical error caught)`);
    
    // Enhanced logging for rewards tracking
    console.warn(`❌ AUDIT REJECTED: ${submitterKey}`);
    
    return false;
  }
}

/**
 * Check if submission is uptime data (Phase 1)
 */
function isUptimeSubmission(data: any): data is UptimeSubmissionData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.uptime === 'number' &&
    typeof data.monthlyUptime === 'number' &&
    typeof data.timestamp === 'number' &&
    typeof data.date === 'string' &&
    // Ensure it doesn't have hardware-specific fields
    !data.cpu && !data.memory && !data.storage && !data.network
  );
}

/**
 * Check if submission is hardware data (Future Phase)
 */
function isHardwareSubmission(data: any): data is HardwareSubmissionData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data.cpu || data.memory || data.storage || data.network) &&
    typeof data.timestamp === 'number' &&
    typeof data.date === 'string'
  );
}

/**
 * Check if submission is new optimized format
 */
function isOptimizedSubmission(data: any): data is OptimizedSubmissionData {
  return (
    typeof data === 'object' &&
    data !== null &&
    // Must have dynamic data
    data.d &&
    typeof data.d === 'object' &&
    typeof data.d.u === 'number' &&
    // Must have metadata
    data.m &&
    typeof data.m === 'object' &&
    typeof data.m.sc === 'boolean' &&
    typeof data.m.t === 'number' &&
    typeof data.m.r === 'number' &&
    // Static data is optional but if present, must be valid
    (data.s === undefined || (
      typeof data.s === 'object' &&
      typeof data.s.w === 'string' &&
      typeof data.s.l === 'string' &&
      typeof data.s.c === 'string' &&
      typeof data.s.cp === 'number' &&
      typeof data.s.r === 'number' &&
      typeof data.s.rt === 'string' &&
      typeof data.s.st === 'number' &&
      typeof data.s.o === 'string' &&
      typeof data.s.a === 'string'
    ))
  );
}

/**
 * Validate optimized submission data (New format)
 */
function validateOptimizedSubmission(data: OptimizedSubmissionData, submitterKey: string): boolean {
  console.log(`Validating optimized submission from ${submitterKey}:`, {
    uptime: data.d.u,
    staticChanged: data.m.sc,
    timestamp: data.m.t,
    roundNumber: data.m.r,
    hasStatic: !!data.s,
    hasWallet: !!data.w,
    submissionTime: new Date(data.m.t).toISOString(),
    currentTime: new Date().toISOString()
  });

  // Validate uptime - must be positive to avoid rewarding rebooted nodes
  if (typeof data.d.u !== 'number' || data.d.u <= 0 || data.d.u > 31536000) { // Max 1 year in seconds
    console.log(`❌ Invalid uptime value from ${submitterKey}: ${data.d.u} (must be positive number)`);
    return false;
  }

  // Validate timestamp (same rules as legacy format)
  const now = Date.now();
  const timeDiff = Math.abs(now - data.m.t);
  const maxTimeDiff = 6 * 60 * 60 * 1000; // 6 hours tolerance
  
  const timeDiffHours = timeDiff / (60 * 60 * 1000);
  console.log(`Time difference for ${submitterKey}: ${timeDiffHours.toFixed(2)} hours`);
  
  // Log whether submission age is valid or stale
  if (timeDiffHours <= 1.5 && timeDiffHours >= 0) {
    console.log(`⏱️ Submission age valid: ${timeDiffHours.toFixed(2)} hours`);
  } else {
    console.warn(`⚠️ Submission age STALE: ${timeDiffHours.toFixed(2)} hours — check node clock or network delay`);
  }
  
  if (timeDiff > maxTimeDiff) {
    console.log(`❌ Timestamp out of range from ${submitterKey}: ${new Date(data.m.t).toISOString()} (current: ${new Date(now).toISOString()}, diff: ${timeDiffHours.toFixed(2)} hours)`);
    return false;
  }

  // Validate that timestamp is not too far in the future or past
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  if (data.m.t > now + oneYearMs) {
    console.log(`❌ Timestamp too far in future from ${submitterKey}: ${new Date(data.m.t).toISOString()}`);
    return false;
  }
  
  if (data.m.t < now - oneYearMs) {
    console.log(`❌ Timestamp too far in past from ${submitterKey}: ${new Date(data.m.t).toISOString()}`);
    return false;
  }

  // Validate round number
  if (data.m.r < 0 || data.m.r > 1000000) { // Reasonable upper bound
    console.log(`❌ Invalid round number from ${submitterKey}: ${data.m.r}`);
    return false;
  }

  // Validate static data consistency
  if (data.m.sc && !data.s) {
    console.log(`❌ Static changed flag is true but no static data provided from ${submitterKey}`);
    return false;
  }

  if (!data.m.sc && data.s) {
    console.log(`❌ Static data provided but changed flag is false from ${submitterKey}`);
    return false;
  }

  // Validate static data if present
  if (data.s && typeof data.s === 'object') {
    // Validate IP addresses
    if (!data.s.w || data.s.w.length === 0 || data.s.w === 'unknown') {
      console.log(`❌ Invalid WAN IP from ${submitterKey}: ${data.s.w}`);
      return false;
    }

    if (!data.s.l || data.s.l.length === 0 || data.s.l === 'unknown') {
      console.log(`❌ Invalid LAN IP from ${submitterKey}: ${data.s.l}`);
      return false;
    }

    // Validate CPU model and cores
    if (!data.s.c || data.s.c.trim().length === 0 || data.s.c.length > 50) {
      console.log(`❌ Invalid CPU model from ${submitterKey}: ${data.s.c}`);
      return false;
    }

    if (data.s.cp < 1 || data.s.cp > 256) {
      console.log(`❌ Invalid CPU core count from ${submitterKey}: ${data.s.cp}`);
      return false;
    }

    // Validate RAM size (reasonable range: 1GB to 2TB)
    if (data.s.r < 1 || data.s.r > 2048) {
      console.log(`❌ Invalid RAM size from ${submitterKey}: ${data.s.r}GB`);
      return false;
    }

    // Validate RAM type
    if (!data.s.rt || data.s.rt.trim().length === 0) {
      console.log(`❌ Invalid RAM type from ${submitterKey}: ${data.s.rt}`);
      return false;
    }

    // Validate storage
    if (data.s.st < 1 || data.s.st > 100000) {
      console.log(`❌ Invalid storage size from ${submitterKey}: ${data.s.st}GB`);
      return false;
    }

    if (data.s.sd < 1 || data.s.sd > 20) {
      console.log(`❌ Invalid storage device count from ${submitterKey}: ${data.s.sd}`);
      return false;
    }

    // Validate GPU flag
    if (data.s.g !== 0 && data.s.g !== 1) {
      console.log(`❌ Invalid GPU present flag from ${submitterKey}: ${data.s.g}`);
      return false;
    }

    // Validate OS platform
    const validOSTypes = ['Linux', 'macOS', 'Windows'];
    if (!validOSTypes.some(os => data.s!.o.includes(os))) {
      console.log(`❌ Invalid OS platform from ${submitterKey}: ${data.s!.o}`);
      return false;
    }

    // Validate virtualization flag
    if (data.s.v !== 0 && data.s.v !== 1) {
      console.log(`❌ Invalid virtualization flag from ${submitterKey}: ${data.s.v}`);
      return false;
    }

    // Validate architecture
    const validArchs = ['x64', 'arm64', 'ia32', 'arm', 's390x', 'ppc64'];
    if (!validArchs.includes(data.s.a)) {
      console.log(`❌ Invalid architecture from ${submitterKey}: ${data.s.a}`);
      return false;
    }

    // Validate hostname
    if (!data.s.h || data.s.h.trim().length === 0 || data.s.h.length > 30) {
      console.log(`❌ Invalid hostname from ${submitterKey}: ${data.s.h}`);
      return false;
    }
  }

  // Validate wallet address if present (basic Solana pubkey format check)
  if (data.w) {
    if (data.w.length < 32 || data.w.length > 44) {
      console.log(`❌ Invalid wallet address length from ${submitterKey}: ${data.w.length}`);
      return false;
    }
  }

  console.log(`✅ Valid optimized submission from ${submitterKey}`);
  console.log(`🎯 OPTIMIZED AUDIT DECISION: APPROVE - Data passes all validation checks`);
  return true;
}

/**
 * Validate uptime submission data (Phase 1)
 */
function validateUptimeSubmission(data: UptimeSubmissionData, submitterKey: string): boolean {
  console.log(`Validating submission from ${submitterKey}:`, {
    uptime: data.uptime,
    monthlyUptime: data.monthlyUptime,
    timestamp: data.timestamp,
    date: data.date,
    submissionTime: new Date(data.timestamp).toISOString(),
    currentTime: new Date().toISOString()
  });

  // Check if uptime values are reasonable - must be positive to avoid rewarding rebooted nodes
  if (typeof data.uptime !== 'number' || data.uptime <= 0 || data.uptime > 31536000) { // Max 1 year in seconds
    console.log(`❌ Invalid uptime value from ${submitterKey}: ${data.uptime} (must be positive number)`);
    console.log(`🔄 Audit function returning: false for ${submitterKey} (invalid uptime)`);
    return false;
  }
  
  // Check monthly uptime percentage (if provided)
  if (data.monthlyUptime !== undefined && (data.monthlyUptime < 0 || data.monthlyUptime > 100)) {
    console.log(`❌ Invalid monthly uptime percentage from ${submitterKey}: ${data.monthlyUptime}`);
    return false;
  }
  
  // Enhanced timestamp validation with global time zone support
  const now = Date.now();
  const timeDiff = Math.abs(now - data.timestamp);
  
  // Allow up to 6 hours difference to handle:
  // - Global time zones (up to UTC+14 to UTC-12 = 26 hours theoretical, but 6 hours covers most practical cases)
  // - Clock drift/sync issues
  // - Network delays
  const maxTimeDiff = 6 * 60 * 60 * 1000; // 6 hours tolerance
  
  // For debugging: log the time difference
  const timeDiffHours = timeDiff / (60 * 60 * 1000);
  console.log(`Time difference for ${submitterKey}: ${timeDiffHours.toFixed(2)} hours`);
  
  // Log whether submission age is valid or stale
  if (timeDiffHours <= 1.5 && timeDiffHours >= 0) {
    console.log(`⏱️ Submission age valid: ${timeDiffHours.toFixed(2)} hours`);
  } else {
    console.warn(`⚠️ Submission age STALE: ${timeDiffHours.toFixed(2)} hours — check node clock or network delay`);
  }
  
  if (timeDiff > maxTimeDiff) {
    console.log(`❌ Timestamp out of range from ${submitterKey}: ${new Date(data.timestamp).toISOString()} (current: ${new Date(now).toISOString()}, diff: ${timeDiffHours.toFixed(2)} hours)`);
    console.log(`🔄 Audit function returning: false for ${submitterKey} (timestamp out of range)`);
    return false;
  }
  
  // Enhanced date format validation - support multiple formats
  if (!isValidDateFormat(data.date)) {
    console.log(`❌ Invalid date format from ${submitterKey}: ${data.date}`);
    return false;
  }
  
  // Validate that date matches timestamp day (allowing for time zone differences)
  if (!isDateConsistentWithTimestamp(data.date, data.timestamp)) {
    console.log(`❌ Date/timestamp mismatch from ${submitterKey}: date=${data.date}, timestamp=${new Date(data.timestamp).toISOString()}`);
    return false;
  }
  
  // Additional validation: check if timestamp is not too far in the future or past
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  if (data.timestamp > now + oneYearMs) {
    console.log(`❌ Timestamp too far in future from ${submitterKey}: ${new Date(data.timestamp).toISOString()}`);
    return false;
  }
  
  if (data.timestamp < now - oneYearMs) {
    console.log(`❌ Timestamp too far in past from ${submitterKey}: ${new Date(data.timestamp).toISOString()}`);
    return false;
  }
  
  console.log(`✅ Valid uptime submission from ${submitterKey}`);
  console.log(`🎯 UPTIME AUDIT DECISION: APPROVE - Data passes all validation checks`);
  console.log(`🔄 Audit function returning: true for ${submitterKey}`);
  return true;
}

/**
 * Validate date format - supports multiple international formats
 */
function isValidDateFormat(dateStr: string): boolean {
  // Support multiple date formats commonly used worldwide
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/,      // YYYY-MM-DD (ISO standard)
    /^\d{2}\/\d{2}\/\d{4}$/,    // MM/DD/YYYY (US format)
    /^\d{2}\/\d{2}\/\d{2}$/,    // MM/DD/YY (US short format)
    /^\d{2}-\d{2}-\d{4}$/,      // DD-MM-YYYY (European format)
    /^\d{2}\.\d{2}\.\d{4}$/,    // DD.MM.YYYY (German format)
    /^\d{4}\/\d{2}\/\d{2}$/,    // YYYY/MM/DD (Alternative ISO)
  ];
  
  return formats.some(format => format.test(dateStr));
}

/**
 * Check if date string is consistent with timestamp (allowing for time zones)
 */
function isDateConsistentWithTimestamp(dateStr: string, timestamp: number): boolean {
  try {
    const submissionDate = new Date(timestamp);
    
    // Parse the date string based on detected format
    const parsedDate = parseFlexibleDate(dateStr);
    if (!parsedDate) {
      return false;
    }
    
    // Allow for time zone differences - check if they're within the same day
    // or adjacent days (to handle time zone boundaries)
    const timeDiff = Math.abs(submissionDate.getTime() - parsedDate.getTime());
    const maxDayDiff = 2 * 24 * 60 * 60 * 1000; // 2 days tolerance for time zones
    
    return timeDiff <= maxDayDiff;
  } catch (error) {
    console.log(`Error parsing date consistency:`, error);
    return false;
  }
}

/**
 * Parse date string in multiple formats
 */
function parseFlexibleDate(dateStr: string): Date | null {
  try {
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00.000Z');
    }
    
    // Try MM/DD/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try MM/DD/YY format
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      const fullYear = parseInt(year) + (parseInt(year) > 50 ? 1900 : 2000);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }
    
    // Try DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try YYYY/MM/DD format
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate hardware submission data (Future Phase)
 */
function validateHardwareSubmission(data: HardwareSubmissionData, submitterKey: string): boolean {
  // Future implementation for hardware data validation
  console.log(`Hardware submission validation not yet implemented for ${submitterKey}`);
  
  // Basic validation for now
  if (typeof data.timestamp !== 'number' || typeof data.date !== 'string') {
    console.log(`Missing required fields in hardware submission from ${submitterKey}`);
    return false;
  }
  
  // Timestamp validation
  const now = Date.now();
  const timeDiff = Math.abs(now - data.timestamp);
  const maxTimeDiff = 6 * 60 * 60 * 1000; // 6 hours tolerance
  
  if (timeDiff > maxTimeDiff) {
    console.log(`Hardware submission timestamp out of range from ${submitterKey}`);
    return false;
  }
  
  // TODO: Add specific hardware validation logic in future phases
  console.log(`✓ Valid hardware submission from ${submitterKey}`);
  return true;
}

/**
 * Validate string submissions (fallback for simple cases)
 */
function validateStringSubmission(submission: string, submitterKey: string): boolean {
  // Original "Hello, World!" validation for backward compatibility
  if (submission === "Hello, World!") {
    console.log(`✓ Valid Hello World submission from ${submitterKey}`);
    return true;
  }
  
  // Check for empty or invalid strings
  if (!submission || submission.trim().length === 0) {
    console.log(`Empty submission from ${submitterKey}`);
    return false;
  }
  
  // Check for extremely long submissions that might cause issues
  if (submission.length > 512) {
    console.log(`Submission too long from ${submitterKey}: ${submission.length} bytes`);
    return false;
  }
  
  console.log(`Unknown string submission from ${submitterKey}: ${submission}`);
  return false;
}
