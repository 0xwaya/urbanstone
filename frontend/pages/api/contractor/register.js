import { getSupabase } from '../../../lib/supabase';
import { getEmailAccess, hasPrivateEmailDomain, hasBusinessWebsite } from '../../../lib/contractor-access';
import {
    buildContractorRegistrationEvent,
    relayContractorRegistrationEvent,
    sendContractorRegistrationNotification,
} from '../../../lib/contractor-notifications';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const ipTimestamps = new Map();

function checkRate(ip) {
    const now = Date.now();
    const times = (ipTimestamps.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
    times.push(now);
    ipTimestamps.set(ip, times);
    return times.length <= RATE_LIMIT;
}

function isValidUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).end();

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests' });

        const { email, company_name, website } = req.body || {};

        if (!email || !company_name || !website) {
            return res.status(400).json({ error: 'email, company_name, and website are required' });
        }
        if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        if (typeof company_name !== 'string' || company_name.trim().length < 2 || company_name.length > 120) {
            return res.status(400).json({ error: 'Invalid company name' });
        }
        if (!isValidUrl(website) || website.length > 512) {
            return res.status(400).json({ error: 'Invalid website URL' });
        }

        const emailAccess = getEmailAccess(email);
        const supabase = getSupabase();

        const autoApprove = emailAccess.isApproved
            || hasPrivateEmailDomain(email)
            || hasBusinessWebsite(website);

        const { data: contractor, error } = await supabase
            .from('contractors')
            .insert({
                email: emailAccess.normalizedEmail,
                company_name: company_name.trim(),
                website: website.trim(),
                approved: autoApprove,
            })
            .select('id, email, company_name, website, approved, created_at')
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(201).json({
                    message: autoApprove
                        ? 'Access is approved for this email. You can request a magic link now.'
                        : 'Application received. We will review and send a magic link when approved.',
                });
            }
            console.error('[contractor/register]', error.message);
            return res.status(500).json({ error: 'Registration failed. Please try again.' });
        }

        const event = buildContractorRegistrationEvent(contractor || {
            email: emailAccess.normalizedEmail,
            company_name: company_name.trim(),
            website: website.trim(),
            approved: autoApprove,
        }, req);

        const webhookUrl = process.env.CONTRACTOR_REGISTRATION_WEBHOOK_URL || process.env.LEAD_WEBHOOK_URL;
        const notificationJobs = [];

        if (webhookUrl) {
            notificationJobs.push(
                relayContractorRegistrationEvent(event, webhookUrl)
                    .then(() => ({ channel: 'webhook', ok: true }))
                    .catch((notifyError) => ({ channel: 'webhook', ok: false, error: notifyError }))
            );
        }

        notificationJobs.push(
            sendContractorRegistrationNotification(event)
                .then(result => ({ channel: 'email', ok: true, result }))
                .catch((notifyError) => ({ channel: 'email', ok: false, error: notifyError }))
        );

        const notificationResults = await Promise.all(notificationJobs);

        notificationResults.forEach((result) => {
            if (result.ok) {
                console.log('[contractor/register] notification delivered', {
                    channel: result.channel,
                    requestId: event.requestId,
                    email: event.contractor.email,
                    notificationId: result.result?.id || null,
                    skipped: result.result?.skipped || false,
                });
                return;
            }

            console.error('[contractor/register] notification failed', {
                channel: result.channel,
                requestId: event.requestId,
                email: event.contractor.email,
                message: result.error instanceof Error ? result.error.message : String(result.error),
            });
        });

        return res.status(201).json({
            message: autoApprove
                ? 'Access is approved for this email. You can request a magic link now.'
                : 'Application received. We will review and send a magic link when approved.',
        });
    } catch (error) {
        console.error('[contractor/register] fatal', error);
        const message = error instanceof Error && error.message.includes('Missing Supabase server environment variables')
            ? 'Server configuration error. Add SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.'
            : 'Registration failed. Please try again.';
        return res.status(500).json({ error: message });
    }
}
