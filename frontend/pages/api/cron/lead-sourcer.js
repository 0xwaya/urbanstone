function getBearerToken(authorizationHeader) {
    const value = String(authorizationHeader || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) return '';
    return value.slice(7).trim();
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cronSecret = String(process.env.CRON_SECRET || '').trim();
    if (cronSecret) {
        const callerToken = getBearerToken(req.headers.authorization);
        if (!callerToken || callerToken !== cronSecret) {
            return res.status(401).json({ error: 'Unauthorized cron request' });
        }
    }

    const triggerUrl = String(process.env.LEAD_SOURCER_TRIGGER_URL || '').trim();
    if (!triggerUrl) {
        return res.status(500).json({
            error: 'LEAD_SOURCER_TRIGGER_URL is not configured',
            hint: 'Set LEAD_SOURCER_TRIGGER_URL to your lead-sourcer runner endpoint.',
        });
    }

    const requestHeaders = {
        'content-type': 'application/json',
        'user-agent': 'urbanstone-vercel-cron/lead-sourcer',
    };

    const triggerSecret = String(process.env.LEAD_SOURCER_TRIGGER_SECRET || '').trim();
    if (triggerSecret) {
        requestHeaders.authorization = `Bearer ${triggerSecret}`;
    }

    const payload = {
        source: 'vercel-cron',
        mode: 'live',
        triggeredAt: new Date().toISOString(),
    };

    try {
        const upstreamResponse = await fetch(triggerUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(payload),
        });

        const upstreamText = await upstreamResponse.text();
        if (!upstreamResponse.ok) {
            return res.status(502).json({
                error: 'Lead sourcer trigger failed',
                upstreamStatus: upstreamResponse.status,
                upstreamBody: upstreamText.slice(0, 1000),
            });
        }

        return res.status(200).json({
            ok: true,
            message: 'Lead sourcer trigger accepted',
            upstreamStatus: upstreamResponse.status,
            upstreamBody: upstreamText.slice(0, 1000),
        });
    } catch (error) {
        return res.status(502).json({
            error: 'Lead sourcer trigger request failed',
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
