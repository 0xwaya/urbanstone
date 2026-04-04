import { createHash, randomUUID } from 'node:crypto';
import { curatedSlabOptionValues } from '../data/curated-slab-options';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9()+.\-\s]{7,24}$/;

const MATERIAL_OPTIONS = curatedSlabOptionValues;
const REMOVAL_OPTIONS = new Set(['yes', 'no', 'unsure']);
const BASIN_OPTIONS = new Set(['single', 'double', 'reuse-existing']);
const MOUNT_OPTIONS = new Set(['undermount', 'topmount', 'reuse-existing']);
const SINK_MATERIAL_OPTIONS = new Set(['stainless-steel', 'composite', 'reuse-existing']);
const BACKSPLASH_OPTIONS = new Set(['4-inch', 'full-height', 'none']);
const TIMEFRAME_OPTIONS = new Set(['1-week', '2-weeks', '1-month']);
const MAX_DRAWING_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

function parsePositiveIntEnv(name, fallback) {
    const raw = String(process.env[name] || '').trim();
    if (!raw) {
        return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

function normalizeForDedupe(value, maxLength) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizePhoneForDedupe(phone) {
    return String(phone || '').replace(/\D+/g, '').slice(0, 24);
}

export function buildLeadDedupeKey(lead) {
    const signature = [
        normalizeForDedupe(lead.email, 120),
        normalizePhoneForDedupe(lead.phone),
        normalizeForDedupe(lead.routeId || 'homepage', 80),
        normalizeForDedupe(lead.projectDetails, 1200),
        normalizeForDedupe(lead.currentTopMaterial, 80),
        normalizeForDedupe(lead.totalSquareFootage ?? '', 40),
    ].join('|');

    return createHash('sha256').update(signature).digest('hex').slice(0, 24);
}

function normalizeField(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizeMultiline(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxLength);
}

function normalizeEnum(value, allowedValues) {
    const normalized = normalizeField(value, 40).toLowerCase();
    return allowedValues.has(normalized) ? normalized : '';
}

function normalizeMaterialPreferences(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => normalizeField(entry, 80).toLowerCase())
        .filter((entry) => MATERIAL_OPTIONS.has(entry))
        .filter((entry, index, entries) => entries.indexOf(entry) === index)
        .slice(0, 6);
}

function normalizeSquareFootage(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number.parseFloat(String(value));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return NaN;
    }

    return Number.parseFloat(parsed.toFixed(2));
}

function normalizeDrawingImage(value) {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const name = normalizeField(value.name, 120);
    const type = normalizeField(value.type, 80).toLowerCase();
    const dataUrl = String(value.dataUrl || '').trim();
    const size = Number.parseInt(String(value.size || ''), 10);

    if (!name || !type || !dataUrl || !Number.isFinite(size) || size <= 0) {
        return null;
    }

    return {
        name,
        type,
        size,
        dataUrl,
    };
}

export function sanitizeLeadPayload(payload = {}) {
    const lead = {
        name: normalizeField(payload.name, 80),
        email: normalizeField(payload.email, 120).toLowerCase(),
        phone: normalizeField(payload.phone, 24),
        projectDetails: normalizeMultiline(payload.projectDetails, 1200),
        totalSquareFootage: normalizeSquareFootage(payload.totalSquareFootage),
        currentTopRemoval: normalizeEnum(payload.currentTopRemoval, REMOVAL_OPTIONS),
        currentTopMaterial: normalizeField(payload.currentTopMaterial, 80),
        sinkBasinPreference: normalizeEnum(payload.sinkBasinPreference, BASIN_OPTIONS),
        sinkMountPreference: normalizeEnum(payload.sinkMountPreference, MOUNT_OPTIONS),
        sinkMaterialPreference: normalizeEnum(payload.sinkMaterialPreference, SINK_MATERIAL_OPTIONS),
        backsplashPreference: normalizeEnum(payload.backsplashPreference, BACKSPLASH_OPTIONS),
        timeframeGoal: normalizeEnum(payload.timeframeGoal, TIMEFRAME_OPTIONS),
        materialPreferences: normalizeMaterialPreferences(payload.materialPreferences),
        drawingImage: normalizeDrawingImage(payload.drawingImage),
        routeId: normalizeField(payload.routeId, 80),
        website: normalizeField(payload.website, 120),
    };

    const errors = {};

    if (lead.website) {
        errors.website = 'Spam protection triggered.';
    }
    if (lead.name.length < 2) {
        errors.name = 'Enter the customer name.';
    }
    if (!EMAIL_PATTERN.test(lead.email)) {
        errors.email = 'Enter a valid email address.';
    }
    if (!PHONE_PATTERN.test(lead.phone)) {
        errors.phone = 'Enter a valid phone number.';
    }
    if (!lead.drawingImage && !lead.totalSquareFootage) {
        errors.totalSquareFootage = 'Upload a rough drawing image or enter total square footage.';
    }
    if (Number.isNaN(lead.totalSquareFootage)) {
        errors.totalSquareFootage = 'Enter a valid square-footage number.';
    }
    if (lead.totalSquareFootage && lead.totalSquareFootage > 50000) {
        errors.totalSquareFootage = 'Square footage looks too high. Please verify the number.';
    }
    if (!lead.currentTopRemoval) {
        errors.currentTopRemoval = 'Select whether current tops should be removed.';
    }
    if (lead.currentTopRemoval === 'yes' && lead.currentTopMaterial.length < 2) {
        errors.currentTopMaterial = 'Enter the current top material.';
    }
    if (!lead.sinkBasinPreference) {
        errors.sinkBasinPreference = 'Select a sink basin preference.';
    }
    if (!lead.sinkMountPreference) {
        errors.sinkMountPreference = 'Select a sink mount preference.';
    }
    if (!lead.sinkMaterialPreference) {
        errors.sinkMaterialPreference = 'Select a sink material preference.';
    }
    if (!lead.backsplashPreference) {
        errors.backsplashPreference = 'Select a backsplash preference.';
    }
    if (!lead.timeframeGoal) {
        errors.timeframeGoal = 'Select your target timeframe.';
    }
    if (lead.materialPreferences.length === 0) {
        errors.materialPreferences = 'Select at least one material preference.';
    }
    if (lead.drawingImage) {
        if (!IMAGE_DATA_URL_PATTERN.test(lead.drawingImage.dataUrl)) {
            errors.drawingImage = 'Upload a valid image file (PNG or JPG).';
        }
        if (!lead.drawingImage.type.startsWith('image/')) {
            errors.drawingImage = 'Uploaded file must be an image.';
        }
        if (lead.drawingImage.size > MAX_DRAWING_BYTES) {
            errors.drawingImage = 'Image must be 5 MB or smaller.';
        }
        if (lead.drawingImage.dataUrl.length > MAX_DRAWING_BYTES * 2) {
            errors.drawingImage = 'Image payload is too large. Use a smaller file.';
        }
    }

    return {
        data: lead,
        errors,
        ok: Object.keys(errors).length === 0,
    };
}

export function getClientIp(request) {
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }

    return request.socket?.remoteAddress || 'unknown';
}

export function getRateLimitStore() {
    if (!globalThis.__urbanStoneLeadRateLimitStore) {
        globalThis.__urbanStoneLeadRateLimitStore = new Map();
    }

    return globalThis.__urbanStoneLeadRateLimitStore;
}

export function getLeadApiRuntimeConfig() {
    return {
        rateLimitMax: parsePositiveIntEnv('RATE_LIMIT_MAX', 5),
        rateLimitWindowMs: parsePositiveIntEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
        leadDedupeWindowMs: parsePositiveIntEnv('LEAD_DEDUPE_WINDOW_MS', 60 * 60 * 1000),
    };
}

export function consumeRateLimit(store, key, limit, windowMs) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
        const nextEntry = { count: 1, resetAt: now + windowMs };
        store.set(key, nextEntry);
        return {
            limited: false,
            count: nextEntry.count,
            remaining: Math.max(limit - nextEntry.count, 0),
            resetAt: nextEntry.resetAt,
            retryAfterSeconds: Math.max(Math.ceil(windowMs / 1000), 1),
        };
    }

    if (entry.count >= limit) {
        return {
            limited: true,
            count: entry.count,
            remaining: 0,
            resetAt: entry.resetAt,
            retryAfterSeconds: Math.max(Math.ceil((entry.resetAt - now) / 1000), 1),
        };
    }

    entry.count += 1;
    return {
        limited: false,
        count: entry.count,
        remaining: Math.max(limit - entry.count, 0),
        resetAt: entry.resetAt,
        retryAfterSeconds: Math.max(Math.ceil((entry.resetAt - now) / 1000), 1),
    };
}

export function isRateLimited(store, key, limit, windowMs) {
    return consumeRateLimit(store, key, limit, windowMs).limited;
}

export function getLeadDedupeStore() {
    if (!globalThis.__urbanStoneLeadDedupeStore) {
        globalThis.__urbanStoneLeadDedupeStore = new Map();
    }

    return globalThis.__urbanStoneLeadDedupeStore;
}

// Returns true (and records the key) when the dedupeKey has not been seen
// within windowMs. Returns true (duplicate, skip relay) on repeat submissions.
export function isLeadDuplicate(store, dedupeKey, windowMs) {
    const now = Date.now();
    const expiresAt = store.get(dedupeKey);

    if (expiresAt !== undefined && expiresAt > now) {
        return true;
    }

    store.set(dedupeKey, now + windowMs);
    return false;
}

export function isSameOriginRequest(request) {
    const originHeader = request.headers.origin;

    if (!originHeader) {
        return true;
    }

    const host = request.headers['x-forwarded-host'] || request.headers.host;

    if (!host) {
        return false;
    }

    try {
        const origin = new URL(originHeader);
        return origin.host === host;
    } catch {
        return false;
    }
}

export function buildLeadForwardPayload(lead, request) {
    const requestId = normalizeField(request.headers['x-request-id'] || randomUUID(), 64);
    const dedupeKey = buildLeadDedupeKey(lead);
    const routeId = lead.routeId || 'homepage';

    return {
        submittedAt: new Date().toISOString(),
        source: 'urban-stone-site',
        requestId,
        dedupeKey,
        routeId,
        automated: false,
        lead: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            projectDetails: lead.projectDetails,
            totalSquareFootage: lead.totalSquareFootage,
            currentTopRemoval: lead.currentTopRemoval,
            currentTopMaterial: lead.currentTopMaterial,
            sinkBasinPreference: lead.sinkBasinPreference,
            sinkMountPreference: lead.sinkMountPreference,
            sinkMaterialPreference: lead.sinkMaterialPreference,
            backsplashPreference: lead.backsplashPreference,
            timeframeGoal: lead.timeframeGoal,
            materialPreferences: lead.materialPreferences,
            drawingImage: lead.drawingImage,
        },
        metadata: {
            requestId,
            dedupeKey,
            automated: false,
            ip: getClientIp(request),
            userAgent: request.headers['user-agent'] || 'unknown',
            referer: request.headers.referer || null,
            routeId,
        },
    };
}