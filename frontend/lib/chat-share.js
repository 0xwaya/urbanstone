import { extractEstimateIntakeFromHistory } from './chat-intake';
import { saveCrmIntake } from './crm-intake';
import { buildLeadEmail, sendLeadEmail } from './lead-email';
import { researchVisit } from './visit-research';

function cleanId(value) {
    return String(value || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
}

function segmentType(segment) {
    const text = String(segment || '');
    if (/builder|contractor|flipper/i.test(text)) return 'contractor';
    if (/homeowner|residential/i.test(text)) return 'homeowner';
    return 'unknown';
}

export function buildChatTurnShare({ conversationId, message, history = [], visit, intake }) {
    const id = cleanId(conversationId) || 'anon';
    const priorUserTurns = history.filter((entry) => entry?.role === 'user').length;
    const turn = priorUserTurns + 1;
    const known = intake || {};
    const hasIdentity = Boolean(known.email || known.phone || (known.name && known.name.length > 1));
    const transcript = [...history, { role: 'user', content: message }]
        .slice(-12)
        .map((entry) => `${entry.role}: ${String(entry.content || '').slice(0, 500)}`)
        .join('\n');

    const crmBody = {
        contact: {
            contact_type: segmentType(known.customerSegment),
            person_name: hasIdentity ? (known.name || null) : null,
            email: known.email || null,
            phone: known.phone || null,
            company_name: hasIdentity ? null : `Onyx chat ${id.slice(0, 12)}`,
            city: known.city || visit?.city || null,
            state: visit?.region || null,
            notes: 'Website chat. Anonymous turns stay on this conversation until a real name, email, or phone is given.',
        },
        intake: {
            source_channel: 'website_chat',
            sub_source: 'onyx-turn',
            source_ref: `onyx-${id}-t${turn}`,
            received_at: new Date().toISOString(),
            project_city: known.city || visit?.city || null,
            project_state: visit?.region || null,
            scope: String(message || '').slice(0, 500),
            raw: {
                conversationId: id,
                turn,
                visit: visit || null,
                transcript,
            },
        },
    };

    const email = buildLeadEmail({
        source: 'Chat',
        name: known.name || (visit?.city ? `Visitor in ${visit.city}` : 'New chat visitor'),
        email: known.email || '',
        phone: known.phone || '',
        details: String(message || '').slice(0, 1500),
        city: known.city || visit?.city || '',
        projectType: known.projectType || visit?.intent || '',
        material: known.material || '',
        channel: `Onyx turn ${turn}`,
        submittedAt: crmBody.intake.received_at,
        specsTitle: 'Visit research and transcript',
        specRows: [
            ['Research', visit?.summary || ''],
            ['Landing', visit?.path || ''],
            ['Referrer', visit?.referrer || ''],
            ['Service fit', visit?.serviceFit || ''],
            ['Intent', visit?.intent || ''],
            ['Campaign', [visit?.utm?.source, visit?.utm?.medium, visit?.utm?.campaign].filter(Boolean).join(' / ')],
            ['Transcript', transcript],
        ],
    });
    email.subject = `Chat ${id.slice(0, 8)} | turn ${turn}${known.name ? ` | ${known.name}` : ''}`;

    return { crmBody, email, idempotencyKey: `onyx-${id}-t${turn}` };
}

/**
 * Log one visitor message to the CRM and email sales@. Never throws.
 * Visit research is attached so the first message carries the on-the-job read.
 */
export async function shareChatTurn({ request, conversationId, message, history = [], visit: clientVisit }) {
    try {
        const headerBag = request?.headers || {};
        const visit = researchVisit({
            headers: headerBag,
            visit: {
                ...(clientVisit || {}),
                referrer: clientVisit?.referrer || headerBag.referer || headerBag.referrer || '',
            },
        });
        const intake = extractEstimateIntakeFromHistory([...(history || []), { role: 'user', content: message }]);
        const { crmBody, email, idempotencyKey } = buildChatTurnShare({
            conversationId,
            message,
            history,
            visit,
            intake,
        });
        const crm = await saveCrmIntake(crmBody);
        let emailed = false;
        try {
            await sendLeadEmail(email, { idempotencyKey });
            emailed = true;
        } catch (error) {
            if (error?.code !== 'missing_resend_api_key') {
                console.error('chat_turn_email_failed', { error: String(error?.message || error).slice(0, 180) });
            }
        }
        return { ok: true, crmSaved: Boolean(crm?.ok), emailed, visit };
    } catch (error) {
        console.error('chat_turn_share_failed', { error: String(error?.message || error).slice(0, 180) });
        return { ok: false };
    }
}
