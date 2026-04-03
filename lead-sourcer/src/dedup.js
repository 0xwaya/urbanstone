import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.resolve(__dirname, '..', 'seen-ids.json');

function load() {
    try {
        return new Set(JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')));
    } catch {
        return new Set();
    }
}

function save(set) {
    // Keep only the most recent 5000 IDs to prevent unbounded growth
    const entries = [...set].slice(-5000);
    fs.writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2));
}

const seen = load();

export function isSeen(id) {
    return seen.has(id);
}

export function markSeen(id) {
    seen.add(id);
    save(seen);
}
