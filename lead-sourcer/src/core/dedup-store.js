import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CAP = 5000;

function loadSet(storePath) {
    try {
        return new Set(JSON.parse(fs.readFileSync(storePath, 'utf8')));
    } catch {
        return new Set();
    }
}

function saveSet(storePath, ids, cap) {
    const entries = [...ids].slice(-cap);
    fs.writeFileSync(storePath, JSON.stringify(entries, null, 2));
}

function trimSet(ids, cap) {
    while (ids.size > cap) {
        const oldest = ids.values().next().value;
        ids.delete(oldest);
    }
}

export function createDedupStore({ storePath, cap = DEFAULT_CAP }) {
    const resolvedPath = path.resolve(storePath);
    const seen = loadSet(resolvedPath);
    trimSet(seen, cap);

    return {
        storePath: resolvedPath,
        cap,
        isSeen(id) {
            return seen.has(id);
        },
        markSeen(id) {
            seen.add(id);
            trimSet(seen, cap);
            saveSet(resolvedPath, seen, cap);
        },
        snapshot() {
            return [...seen];
        },
    };
}