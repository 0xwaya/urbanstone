// Node.js MemPalace Adapter
// Calls the MemPalace CLI and returns context for injection into chatbot/LLM requests

const { execFile } = require('child_process');
const path = require('path');

const MEMPALACE_BIN = process.env.ECHO_MEMPALACE_BIN || '/Users/pc/.openclaw/tools/echo-mempalace.sh';
const MEMPALACE_TIMEOUT_MS = parseInt(process.env.ECHO_MEMPALACE_TIMEOUT_MS || '8000', 10);
const MEMPALACE_WING = process.env.ECHO_MEMPALACE_WING || 'workspace';

function queryMemPalace(query, opts = {}) {
    return new Promise((resolve, reject) => {
        const args = ['query', '--wing', MEMPALACE_WING, '--', query];
        const timeout = opts.timeout || MEMPALACE_TIMEOUT_MS;
        execFile(MEMPALACE_BIN, args, { timeout }, (err, stdout, stderr) => {
            if (err) {
                return reject(stderr || err.message);
            }
            resolve(stdout.trim());
        });
    });
}

module.exports = { queryMemPalace };