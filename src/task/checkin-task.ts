import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Version for future expansion
export const TASK_VERSION = '1.0.0';

// Submission payload interface
interface CheckinPayload {
  nodeId: string;
  timestamp: number;
  signature: string;
  hash: string;
}

// Log file path (use process.cwd() for compatibility)
const SUBMISSION_LOG = path.resolve(process.cwd(), 'submissions.json');

// Verify the payload format and signature (placeholder for now)
function verifyPayload(payload: CheckinPayload): boolean {
  // TODO: Implement real signature verification
  if (!payload.nodeId || !payload.timestamp || !payload.signature || !payload.hash) return false;
  // Simple hash check (for demonstration)
  const data = `${payload.nodeId}:${payload.timestamp}`;
  const expectedHash = crypto.createHash('sha256').update(data).digest('hex');
  return payload.hash === expectedHash;
}

// Log submission to JSON file
function logSubmission(payload: CheckinPayload, valid: boolean) {
  let log: any[] = [];
  if (fs.existsSync(SUBMISSION_LOG)) {
    log = JSON.parse(fs.readFileSync(SUBMISSION_LOG, 'utf-8'));
  }
  log.push({ ...payload, valid, receivedAt: Date.now() });
  fs.writeFileSync(SUBMISSION_LOG, JSON.stringify(log, null, 2));
}

// Main handler (to be called by the task runner)
export function handleCheckinSubmission(payload: CheckinPayload) {
  const valid = verifyPayload(payload);
  logSubmission(payload, valid);
  return valid;
} 