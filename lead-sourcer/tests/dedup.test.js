import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createDedupStore } from '../src/dedup.js';

async function makeTempDedup() {
    const dir = await mkdtemp(join(tmpdir(), 'dedup-test-'));
    const file = join(dir, 'seen-ids.json');
    return { dir, file };
}

async function cleanupTemp(dir) {
    await rm(dir, { recursive: true, force: true });
}

describe('dedup logic', () => {
    let dir, file, store;

    beforeEach(async () => {
        ({ dir, file } = await makeTempDedup());
        store = createDedupStore({ storePath: file, cap: 5 });
    });

    afterEach(async () => {
        await cleanupTemp(dir);
    });

    test('isSeen returns false when file does not exist', async () => {
        expect(store.isSeen('id-1')).toBe(false);
    });

    test('markSeen then isSeen returns true', async () => {
        store.markSeen('id-1');
        expect(store.isSeen('id-1')).toBe(true);
    });

    test('isSeen returns false for unseen id after markSeen of different id', async () => {
        store.markSeen('id-1');
        expect(store.isSeen('id-2')).toBe(false);
    });

    test('markSeen is idempotent — does not duplicate entries', async () => {
        store.markSeen('dup-id');
        store.markSeen('dup-id');
        expect(store.snapshot().filter((id) => id === 'dup-id').length).toBe(1);
    });

    test('enforces cap by dropping oldest entries', async () => {
        for (let i = 0; i < 7; i++) {
            store.markSeen(`id-${i}`);
        }
        const snapshot = store.snapshot();
        expect(snapshot.length).toBe(5);
        expect(snapshot).not.toContain('id-0');
        expect(snapshot).not.toContain('id-1');
        expect(snapshot).toContain('id-6');
    });
});
