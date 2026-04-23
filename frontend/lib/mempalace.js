// Node.js MemPalace Adapter
// Calls the MemPalace CLI and returns context for injection into chatbot/LLM requests

const { execFile } = require('child_process');
const { createHash } = require('node:crypto');
const { promises: fs } = require('node:fs');
const path = require('path');

const MEMPALACE_BIN = process.env.ECHO_MEMPALACE_BIN || '/Users/pc/.openclaw/tools/echo-mempalace.sh';
const MEMPALACE_TIMEOUT_MS = parseInt(process.env.ECHO_MEMPALACE_TIMEOUT_MS || '8000', 10);
const MEMPALACE_WING = process.env.ECHO_MEMPALACE_WING || 'workspace';
const MEMPALACE_MEMORY_DIR = process.env.ECHO_MEMPALACE_MEMORY_DIR
    || path.join(process.cwd(), '.mempalace-intake-memory');

function compact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max = 260) {
    return String(value || '').slice(0, max);
}

function buildMemoryKey(payload = {}) {
    const signature = [
        String(payload.requestId || ''),
        String(payload.dedupeKey || ''),
        String(payload.email || '').toLowerCase().trim(),
        String(payload.phone || '').replace(/\D+/g, ''),
        String(payload.city || '').toLowerCase().trim(),
    ].join('|');

    return createHash('sha256').update(signature).digest('hex').slice(0, 20);
}

function buildMemoryDocument({ memoryKey, payload, updatedAt, existingTurnLines = [] }) {
    const turns = [
        ...existingTurnLines.slice(-30),
        `- [${updatedAt}] user="${truncate(payload.message, 200)}" card="${truncate(payload.memoryCard, 320)}" stage="${payload.stage || ''}"`,
    ].join('\n');

    return [
        '# Stone Haven Intake Memory',
        '',
        `- memoryKey: ${memoryKey}`,
        `- updatedAt: ${updatedAt}`,
        `- source: ${payload.source || 'urban-stone-chat'}`,
        `- requestId: ${payload.requestId || ''}`,
        `- dedupeKey: ${payload.dedupeKey || ''}`,
        '',
        '## Latest Memory Card',
        payload.memoryCard || '',
        '',
        '## Latest Fields',
        `- projectType: ${payload.projectType || ''}`,
        `- city: ${payload.city || ''}`,
        `- squareFootage: ${payload.squareFootage || ''}`,
        `- material: ${payload.material || ''}`,
        `- timeline: ${payload.timeline || ''}`,
        `- name: ${payload.name || ''}`,
        `- email: ${payload.email || ''}`,
        `- phone: ${payload.phone || ''}`,
        '',
        '## Turns',
        turns,
        '',
    ].join('\n');
}

function parseTurns(content) {
    const lines = String(content || '').split('\n');
    const turnIndex = lines.findIndex((line) => line.trim() === '## Turns');
    if (turnIndex < 0) {
        return [];
    }

    return lines.slice(turnIndex + 1).filter((line) => line.trim().startsWith('- ['));
}

function runMemPalace(args, timeout) {
    return new Promise((resolve, reject) => {
        execFile(MEMPALACE_BIN, args, { timeout }, (err, stdout, stderr) => {
            if (err) {
                reject(stderr || err.message);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

function queryMemPalace(query, opts = {}) {
    const args = ['search', '--wing', MEMPALACE_WING, query];
    const timeout = opts.timeout || MEMPALACE_TIMEOUT_MS;
    return runMemPalace(args, timeout);
}

async function persistIntakeMemoryCard(payload = {}, opts = {}) {
    if (!payload || !compact(payload.memoryCard)) {
        return { ok: false, reason: 'empty_memory_card' };
    }

    const timeout = opts.timeout || 1800;
    const memoryKey = buildMemoryKey(payload);
    const filePath = path.join(MEMPALACE_MEMORY_DIR, `${memoryKey}.md`);
    const updatedAt = new Date().toISOString();

    try {
        await fs.mkdir(MEMPALACE_MEMORY_DIR, { recursive: true });
        let existing = '';
        try {
            existing = await fs.readFile(filePath, 'utf8');
        } catch {
            existing = '';
        }

        const nextDoc = buildMemoryDocument({
            memoryKey,
            payload,
            updatedAt,
            existingTurnLines: parseTurns(existing),
        });
        await fs.writeFile(filePath, nextDoc, 'utf8');

        // Lightweight append/update hook: persist card to local file, then re-mine only this memory folder.
        await runMemPalace(
            ['mine', MEMPALACE_MEMORY_DIR, '--mode', 'convos', '--wing', MEMPALACE_WING, '--extract', 'general', '--limit', '0', '--agent', 'stone-haven'],
            timeout
        );

        return { ok: true, memoryKey, filePath };
    } catch (error) {
        return { ok: false, reason: 'persist_failed', error: String(error || '') };
    }
}

module.exports = { queryMemPalace, persistIntakeMemoryCard };
