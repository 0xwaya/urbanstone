import { execFile } from 'child_process';
import { createHash, randomUUID } from 'node:crypto';

import { getChatReply } from '../../lib/chatbot';
import { queryMemPalace } from '../../lib/mempalace';
import { chatbotPolicies } from '../../data/chatbot-knowledge';
import {
    buildEstimateSummary,
    detectGreetingIntent,
    extractEstimateIntake,
    getLiveEstimateRange,
    getMissingEstimateFields,
    getNextEstimateQuestion,
    shouldStartEstimateIntake,
    shouldSubmitIntake,
} from '../../lib/chat-intake';

const OLLAMA_MODEL_NAME = process.env.OLLAMA_MODEL_NAME || 'llama3.1:8b';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MAX_MESSAGE_LENGTH = 1200;
const ENABLE_CHAT_PRICE_PREVIEW = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.ENABLE_CHAT_PRICE_PREVIEW || 'false').toLowerCase()
);
const CONTACT = {
    phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840',
    email: process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co',
};

let ollamaAvailablePromise;

function respondWithKnowledge(res, message) {
    const kbReply = getChatReply(message);

    return res.status(200).json({
        reply: kbReply.reply,
        sources: kbReply.sources,
        contact: CONTACT,
        mode: 'knowledge-base',
    });
}

function buildCompanyPlaybook() {
    const approved = chatbotPolicies.approvedMessaging.map((item) => `- ${item}`).join('\n');
    const liability = chatbotPolicies.liabilityNotes.map((item) => `- ${item}`).join('\n');
    const removal = (chatbotPolicies.removalWaiverNotes || []).map((item) => `- ${item}`).join('\n');
    const handling = (chatbotPolicies.materialHandlingPolicies || []).map((item) => `- ${item}`).join('\n');

    return [
        `You are Stone Haven, the Urban Stone assistant for ${chatbotPolicies.owner}.`,
        'Follow Urban Stone operating model:',
        '- Keep guidance practical and specific to countertop projects.',
        '- Adapt guidance to segment: residential custom, contractor/home flipper, or builder/new construction multi-unit.',
        '- Workflow is shortlist slab direction -> on-site measurement/templating -> final quote confirmation -> fabrication -> install.',
        '- Ask for missing estimate essentials: contact details, segment, city, project type, project phase/status, tentative budget, rough measurements or sqft, material direction, and target timeline.',
        '- Do not invent pricing, supplier inventory, or timeline guarantees.',
        '- Do not provide price ranges in chat. Keep quote direction qualitative until onsite templating/measurement confirms final numbers.',
        '- If user asks something outside available context, say what is unknown and ask a direct follow-up question.',
        '- Keep responses concise and client-facing with natural language, not scripted copy.',
        '- Response format: up to 2 short paragraphs, then optionally one practical "Next step:" line only when useful.',
        `- Owner and accountability: ${chatbotPolicies.owner}.`,
        `- Company history: ${chatbotPolicies.companyHistory}.`,
        `- Service policy: ${chatbotPolicies.serviceAreaPolicy}.`,
        `- Quote policy: ${chatbotPolicies.quotePolicy}.`,
        'Approved messaging:',
        approved,
        'Liability notes to apply when relevant:',
        liability,
        'Removal/tear-out waiver notes to apply when relevant:',
        removal,
        'Material handling and operations policies to apply when relevant:',
        handling,
    ].join('\n');
}

function detectIntent(message) {
    const text = String(message || '').toLowerCase();
    const has = (words) => words.some((word) => text.includes(word));

    if (has(['commercial', 'contractor', 'multi-unit', 'builder', 'apartment', 'hotel', 'office'])) {
        return 'commercial';
    }
    if (has(['estimate', 'quote', 'price', 'pricing', 'budget', 'cost', 'bid'])) {
        return 'estimate';
    }
    if (has(['timeline', 'turnaround', 'fast', 'install', 'days', 'schedule', 'deposit', 'template'])) {
        return 'timeline';
    }
    if (has(['serve', 'service', 'coverage', 'travel', 'near me', 'city', 'location', 'zip'])) {
        return 'serviceArea';
    }
    if (has(['quartz', 'granite', 'quartzite', 'slab', 'material', 'stone', 'vein', 'seam'])) {
        return 'materials';
    }

    return 'general';
}

function getIntentCta(intent) {
    switch (intent) {
        case 'commercial':
            return 'Next step: send unit count, weekly install pace, city, and start date so we can route your project through commercial intake.';
        case 'estimate':
            return 'Next step: send project photos/layout and rough measurements so we can turn this into an estimate direction.';
        case 'timeline':
            return 'Next step: send city, sqft, and material lane so we can confirm a realistic install window.';
        case 'serviceArea':
            return 'Next step: send your city and project type so we can confirm service fit and scheduling path.';
        case 'materials':
            return 'Next step: send room type, city, and preferred material so we can narrow your slab lane quickly.';
        default:
            return 'Next step: share city, project type, rough measurements, material direction, and target timeline.';
    }
}

function buildPrompt(message, mempalaceContext) {
    const intent = detectIntent(message);
    const intentCta = getIntentCta(intent);
    const contextBlock = mempalaceContext && mempalaceContext.trim().length > 0
        ? `Workspace context:\n${mempalaceContext.trim()}\n`
        : 'Workspace context:\n(none)\n';

    return [
        '[SYSTEM]',
        buildCompanyPlaybook(),
        `Intent focus: ${intent}.`,
        `Suggested next-step focus: ${intentCta}`,
        '[/SYSTEM]',
        '',
        '[CONTEXT]',
        contextBlock,
        '[/CONTEXT]',
        '',
        '[USER]',
        message,
        '[/USER]',
    ].join('\n');
}

function getClientIp(request) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }

    return request.socket?.remoteAddress || 'unknown';
}

function buildChatDedupeKey(intake) {
    const signature = [
        String(intake.email || '').toLowerCase().trim(),
        String(intake.phone || '').replace(/\D+/g, ''),
        String(intake.city || '').toLowerCase().trim(),
        String(intake.projectType || '').toLowerCase().trim(),
        String(intake.squareFootage || ''),
        String(intake.material || '').toLowerCase().trim(),
    ].join('|');

    return createHash('sha256').update(signature).digest('hex').slice(0, 24);
}

function normalizeModelReply(rawReply) {
    const cleaned = String(rawReply || '').trim();
    if (!cleaned) {
        return '';
    }

    const withoutAiPreface = cleaned
        .replace(/^as an ai language model[:,]?\s*/i, '')
        .replace(/^as an ai[:,]?\s*/i, '')
        .trim();

    return withoutAiPreface;
}

function resolveWebhookUrl(request) {
    if (process.env.LEAD_WEBHOOK_URL) {
        return process.env.LEAD_WEBHOOK_URL;
    }

    if (process.env.NODE_ENV === 'production') {
        return '';
    }

    const host = request.headers['x-forwarded-host'] || request.headers.host;
    const proto = request.headers['x-forwarded-proto'] || 'http';

    if (host) {
        return `${proto}://${host}/api/lead-dev-webhook`;
    }

    return 'http://127.0.0.1:3001/api/lead-dev-webhook';
}

async function relayChatIntake(request, intake, conversation) {
    const webhookUrl = resolveWebhookUrl(request);
    if (!webhookUrl) {
        return { ok: false, reason: 'missing_webhook' };
    }

    const requestId = String(request.headers['x-request-id'] || randomUUID()).slice(0, 64);
    const dedupeKey = buildChatDedupeKey(intake);
    const routeId = 'ai-chat';

    const payload = {
        type: 'chat_estimate_intake',
        submittedAt: new Date().toISOString(),
        source: 'urban-stone-chat',
        requestId,
        dedupeKey,
        routeId,
        automated: true,
        lead: {
            name: intake.name,
            email: intake.email,
            phone: intake.phone,
            projectDetails: intake.notes,
            totalSquareFootage: intake.squareFootage,
            currentTopRemoval: 'unsure',
            currentTopMaterial: '',
            sinkBasinPreference: 'reuse-existing',
            sinkMountPreference: 'reuse-existing',
            sinkMaterialPreference: 'reuse-existing',
            backsplashPreference: 'none',
            timeframeGoal: '1-month',
            materialPreferences: [],
            drawingImage: null,
        },
        chatIntake: {
            customerSegment: intake.customerSegment,
            city: intake.city,
            projectType: intake.projectType,
            projectPhase: intake.projectPhase,
            projectStatus: intake.projectStatus,
            tentativeBudget: intake.tentativeBudget,
            material: intake.material,
            materialGroup: intake.materialGroup,
            supplier: intake.supplier,
            timeline: intake.timeline,
            summary: buildEstimateSummary(intake),
            transcript: conversation.slice(-12),
            ownerFollowUp: 'Final estimate subject to on-site measurement by Edward.',
        },
        metadata: {
            requestId,
            dedupeKey,
            routeId,
            automated: true,
            ip: getClientIp(request),
            userAgent: request.headers['user-agent'] || 'unknown',
            referer: request.headers.referer || '',
            verdict: 'chat-intake',
            scoreBand: '',
            score: '',
        },
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        return { ok: response.ok };
    } catch {
        return { ok: false, reason: 'relay_failed' };
    }
}

function getSegmentLabel(segment) {
    switch (segment) {
        case 'builder-multi-unit':
            return 'builder/new construction multi-unit';
        case 'contractor-flipper':
            return 'contractor/home flipper';
        case 'residential-custom':
            return 'residential custom';
        default:
            return 'project';
    }
}

// Natural LLM-powered greeting
async function maybeHandleGreeting(res, message, history) {
    if (!detectGreetingIntent(message)) {
        return false;
    }

    const priorUserTurns = history.filter((entry) => entry.role === 'user').length;
    const alreadyIntroduced = history.some((entry) =>
        entry?.role === 'assistant'
        && /i['’]?\s?m haven|i am haven/i.test(String(entry.content || ''))
    );
    if (priorUserTurns > 0 || alreadyIntroduced) {
        return false;
    }

    const reply = "Hey, I'm Haven. Glad you're here. What project are you planning?";

    return res.status(200).json({
        reply,
        sources: ['Stone Haven greeting protocol'],
        contact: CONTACT,
        mode: 'greeting',
    });
}

async function handleEstimateIntake(req, res, message, history) {
    if (!shouldStartEstimateIntake(message, history)) {
        return false;
    }

    const intake = extractEstimateIntake(message, history);
    const missing = getMissingEstimateFields(intake);

    if (missing.length > 0) {
        const question = getNextEstimateQuestion(missing);
        return res.status(200).json({
            reply: `I can run estimate intake here and hand it to Urban Stone.\n\n${question}`,
            sources: [],
            contact: CONTACT,
            mode: 'intake',
            intake: {
                missingFields: missing,
                collected: Object.keys(intake).filter((key) => intake[key]),
            },
        });
    }

    const readyToSubmit = shouldSubmitIntake(message);
    const liveEstimate = ENABLE_CHAT_PRICE_PREVIEW ? getLiveEstimateRange(intake) : null;
    const liveEstimateLine = liveEstimate
        ? `\n\nProvisional installed estimate: $${liveEstimate.low.toLocaleString()} - $${liveEstimate.high.toLocaleString()} (about $${liveEstimate.unitRateLow}-${liveEstimate.unitRateHigh}/sq ft, subject to final templating and Edward's on-site measurements).`
        : '';
    if (!readyToSubmit) {
        return res.status(200).json({
            reply: `I have enough to route this ${getSegmentLabel(intake.customerSegment)} estimate request.\n\n${buildEstimateSummary(intake)}${liveEstimateLine}\n\nReply with "send it" and I will submit this to admin for follow-up.`,
            sources: [],
            contact: CONTACT,
            mode: 'intake-review',
            intake: { missingFields: [], collected: Object.keys(intake).filter((key) => intake[key]) },
        });
    }

    const conversation = [...history, { role: 'user', content: message }];
    const relay = await relayChatIntake(req, intake, conversation);

    if (!relay.ok) {
        return res.status(200).json({
            reply: 'I have the intake details, but submission failed right now. Please call or email sales and we will route it manually immediately.',
            sources: [],
            contact: CONTACT,
            mode: 'intake-error',
        });
    }

    return res.status(200).json({
        reply: `Estimate intake sent to admin for ${getSegmentLabel(intake.customerSegment)} follow-up.${liveEstimateLine ? ` ${liveEstimateLine.trim()}` : ''} Edward will validate final pricing after physical measurements, and the team will follow up using your contact details.`,
        sources: [],
        contact: CONTACT,
        mode: 'intake-submitted',
    });
}

function checkOllamaAvailability() {
    if (!ollamaAvailablePromise) {
        ollamaAvailablePromise = new Promise((resolve) => {
            execFile('ollama', ['--version'], { timeout: 1500 }, (error) => {
                resolve(!error);
            });
        });
    }

    return ollamaAvailablePromise;
}

function callOllamaChat(message) {
    return new Promise((resolve, reject) => {
        const args = [
            'chat',
            OLLAMA_MODEL_NAME,
            '--base-url', OLLAMA_BASE_URL,
            '--no-stream',
            '--json',
        ];

        execFile(
            'ollama',
            args,
            {
                input: message,
                timeout: 8000,
                env: {
                    ...process.env,
                    OLLAMA_API_KEY: process.env.OLLAMA_API_KEY || '',
                },
            },
            (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }

                try {
                    const parsed = JSON.parse(stdout);
                    resolve(parsed.responses?.[0] || '');
                } catch {
                    resolve('');
                }
            }
        );
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history: rawHistory } = req.body || {};
    const history = Array.isArray(rawHistory)
        ? rawHistory
            .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
            .map((entry) => ({
                role: entry.role,
                content: String(entry.content || '').slice(0, 1200),
            }))
            .slice(-20)
        : [];

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters.` });
    }

    const greetingHandled = await maybeHandleGreeting(res, message, history);
    if (greetingHandled) {
        return greetingHandled;
    }

    const intakeHandled = await handleEstimateIntake(req, res, message, history);
    if (intakeHandled) {
        return intakeHandled;
    }

    let mempalaceContext = '';
    try {
        mempalaceContext = await queryMemPalace(message, { timeout: 1200 });
    } catch (error) {
        console.warn('MemPalace search unavailable:', error);
    }

    const hasOllama = await checkOllamaAvailability();
    if (!hasOllama) {
        return respondWithKnowledge(res, message);
    }

    const fullMessage = mempalaceContext && mempalaceContext.trim().length > 0
        ? buildPrompt(message, mempalaceContext)
        : buildPrompt(message, '');

    try {
        const ollamaReply = normalizeModelReply(await callOllamaChat(fullMessage));
        if (!ollamaReply) {
            return respondWithKnowledge(res, message);
        }

        return res.status(200).json({
            reply: ollamaReply,
            sources: mempalaceContext ? ['MemPalace workspace context'] : [],
            contact: CONTACT,
            mode: 'ollama',
        });
    } catch (error) {
        console.error('API /api/chat error:', error);
        return respondWithKnowledge(res, message);
    }
}
