const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9()+.\-\s]{7,24}$/;

const MATERIAL_OPTIONS = new Set(['granite', 'marble', 'quartzite', 'quartz']);
const REMOVAL_OPTIONS = new Set(['yes', 'no', 'unsure']);
const BASIN_OPTIONS = new Set(['single', 'double', 'reuse-existing']);
const MOUNT_OPTIONS = new Set(['undermount', 'topmount', 'reuse-existing']);
const SINK_MATERIAL_OPTIONS = new Set(['stainless-steel', 'composite', 'reuse-existing']);
const BACKSPLASH_OPTIONS = new Set(['4-inch', 'full-height', 'none']);
const TIMEFRAME_OPTIONS = new Set(['1-week', '2-weeks', '1-month']);
const MAX_DRAWING_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

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
        .map((entry) => normalizeField(entry, 24).toLowerCase())
        .filter((entry) => MATERIAL_OPTIONS.has(entry))
        .filter((entry, index, entries) => entries.indexOf(entry) === index)
        .slice(0, MATERIAL_OPTIONS.size);
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
    if (lead.currentTopMaterial.length < 2) {
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

export function isRateLimited(store, key, limit, windowMs) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (entry.count >= limit) {
        return true;
    }

    entry.count += 1;
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
    return {
        submittedAt: new Date().toISOString(),
        source: 'urban-stone-site',
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
            ip: getClientIp(request),
            userAgent: request.headers['user-agent'] || 'unknown',
            referer: request.headers.referer || null,
            routeId: lead.routeId || 'homepage',
        },
    };
}