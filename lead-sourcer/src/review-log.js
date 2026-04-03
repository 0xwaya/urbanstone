import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REVIEW_LOG = path.resolve(__dirname, '..', 'runs', 'review-candidates.jsonl');

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function getReviewLogPath() {
    return process.env.LEAD_SOURCER_REVIEW_LOG_FILE || DEFAULT_REVIEW_LOG;
}

export function logReviewCandidate({ mode, source, post, classification, reason }) {
    const filePath = getReviewLogPath();
    ensureParentDir(filePath);

    const payload = {
        loggedAt: new Date().toISOString(),
        mode,
        source,
        reason,
        post: {
            id: post.id,
            title: post.title,
            url: post.url,
            createdAt: post.createdAt,
        },
        classification,
    };

    fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}