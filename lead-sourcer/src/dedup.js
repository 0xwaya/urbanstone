import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDedupStore } from './core/dedup-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORE_PATH = process.env.LEAD_SOURCER_DEDUP_FILE || path.resolve(__dirname, '..', 'seen-ids.json');
const store = createDedupStore({ storePath: DEFAULT_STORE_PATH });

export function isSeen(id) {
    return store.isSeen(id);
}

export function markSeen(id) {
    store.markSeen(id);
}

export { createDedupStore };
