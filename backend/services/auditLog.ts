/** Append-only audit log for SOP-sensitive actions (DSAR, admin). */
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.join(process.cwd(), 'data', 'audit');
const LOG_FILE = path.join(LOG_DIR, 'audit.jsonl');

export function audit(event: string, detail: Record<string, unknown> = {}) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      event,
      ...detail,
    });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
  } catch (e) {
    console.warn('[audit] write failed', e);
  }
}
