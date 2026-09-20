import fs from 'node:fs';
import path from 'node:path';

export function buildPreDraft(payload) {
    const lead = payload?.lead || {};
    const metadata = payload?.metadata || {};
    const routeId = metadata.routeId || payload?.source || 'lead-sourcer/unknown';
    const subject = `[Lead Draft] ${lead.name || 'New lead'} • ${routeId}`;
    const text = [
        'Lead Draft',
        '',
        `Source: ${payload?.source || 'unknown'}`,
        `Route: ${routeId}`,
        `Request ID: ${metadata.requestId || payload?.requestId || 'n/a'}`,
        `Name: ${lead.name || 'Unknown'}`,
        `Email: ${lead.email || 'Not supplied'}`,
        `Phone: ${lead.phone || 'Not supplied'}`,
        `URL: ${lead.externalPostUrl || 'Not supplied'}`,
        '',
        'Project Details:',
        lead.projectDetails || 'No details captured.',
    ].join('\n');

    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:24px;">
        <h2 style="margin-bottom:8px;">Lead Draft</h2>
        <p><strong>Source:</strong> ${payload?.source || 'unknown'}<br>
        <strong>Route:</strong> ${routeId}<br>
        <strong>Request ID:</strong> ${metadata.requestId || payload?.requestId || 'n/a'}</p>
        <p><strong>Name:</strong> ${lead.name || 'Unknown'}<br>
        <strong>Email:</strong> ${lead.email || 'Not supplied'}<br>
        <strong>Phone:</strong> ${lead.phone || 'Not supplied'}<br>
        <strong>URL:</strong> ${lead.externalPostUrl || 'Not supplied'}</p>
        <div style="padding:12px 14px;border-left:4px solid #4f46e5;background:#f5f3ff;white-space:pre-wrap;">${String(lead.projectDetails || 'No details captured.').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </body></html>`;

    return { subject, text, html };
}

export function shouldRunDaily(state = {}, now = new Date()) {
    const lastRunAt = state?.lastRunAt ? new Date(state.lastRunAt) : null;
    if (!lastRunAt || Number.isNaN(lastRunAt.getTime())) return true;

    const lastStatus = String(state.lastStatus || '').toLowerCase();
    const minimumIntervalMs = 24 * 60 * 60 * 1000;
    const elapsedMs = now.getTime() - lastRunAt.getTime();
    const isRecentEnough = elapsedMs < minimumIntervalMs;

    if (lastStatus === 'failed') return true;
    return !isRecentEnough;
}

export function readDailyState(statePath) {
    const resolvedPath = path.resolve(statePath || './runs/daily-state.json');
    try {
        const raw = fs.readFileSync(resolvedPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { lastRunAt: null, lastStatus: 'never' };
    }
}

export function writeDailyState(statePath, nextState) {
    const resolvedPath = path.resolve(statePath || './runs/daily-state.json');
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, JSON.stringify(nextState, null, 2));
    return resolvedPath;
}
