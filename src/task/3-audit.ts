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
  monthlyUptime: number;
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

type SubmissionData = UptimeSubmissionData | HardwareSubmissionData | string;

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
  console.log(`AUDIT SUBMISSION FOR ROUND ${roundNumber} from ${submitterKey}`);
  
  // Wrap everything in try-catch to ensure we ALWAYS return a boolean
  try {
    // Validate input parameters
    if (!submission || typeof submission !== 'string') {
      console.log(`❌ Invalid submission parameter from ${submitterKey}: ${typeof submission}`);
      return false;
    }
    
    if (typeof roundNumber !== 'number' || roundNumber < 0) {
      console.log(`❌ Invalid round number from ${submitterKey}: ${roundNumber}`);
      return false;
    }
    
    if (!submitterKey || typeof submitterKey !== 'string') {
      console.log(`❌ Invalid submitter key: ${typeof submitterKey}`);
      return false;
    }
    
    // Try to parse as JSON first (for structured data)
    try {
      const submissionData = JSON.parse(submission);
      
      // Phase 1: Validate uptime data
      if (isUptimeSubmission(submissionData)) {
        const result = validateUptimeSubmission(submissionData, submitterKey);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey}`);
        return result;
      }
      
      // Future Phase: Validate hardware data
      if (isHardwareSubmission(submissionData)) {
        const result = validateHardwareSubmission(submissionData, submitterKey);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey}`);
        return result;
      }
      
      // If it's valid JSON but unknown structure, reject
      console.log(`Unknown submission structure from ${submitterKey}:`, submissionData);
      console.log(`🔄 Main audit function returning: false for ${submitterKey} (unknown structure)`);
      return false;
      
    } catch (jsonError) {
      // If JSON parsing fails, try fallback validations
      console.log(`JSON parsing failed for ${submitterKey}, trying fallback validations`);
      
      // Fallback: Check for simple string submissions
      if (typeof submission === 'string') {
        const result = validateStringSubmission(submission, submitterKey);
        console.log(`🔄 Main audit function returning: ${result} for ${submitterKey} (string validation)`);
        return result;
      }
      
      console.log(`Invalid submission format from ${submitterKey}`);
      console.log(`🔄 Main audit function returning: false for ${submitterKey} (invalid format)`);
      return false;
    }
    
  } catch (error) {
    // CRITICAL: Catch ANY error and return false instead of undefined
    console.error(`🚨 CRITICAL ERROR in audit function for ${submitterKey}:`, error);
    console.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    console.log(`🔄 Main audit function returning: false for ${submitterKey} (critical error caught)`);
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

  // Check if uptime values are reasonable
  if (data.uptime < 0 || data.uptime > 31536000) { // Max 1 year in seconds
    console.log(`❌ Invalid uptime value from ${submitterKey}: ${data.uptime}`);
    console.log(`🔄 Audit function returning: false for ${submitterKey} (invalid uptime)`);
    return false;
  }
  
  // Check monthly uptime percentage
  if (data.monthlyUptime < 0 || data.monthlyUptime > 100) {
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
