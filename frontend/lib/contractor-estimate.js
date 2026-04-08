import { createHash, randomUUID } from 'node:crypto';
import { getClientIp } from './lead';
import { CONTRACTOR_TIERS } from './contractor-deals';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9()+.\-\s]{7,24}$/;
const PROPERTY_TYPES = new Set([
    'apartment',
    'mixed-use',
    'hospitality',
    'student-housing',
    'senior-living',
    'office',
]);
const MATERIAL_OPTIONS = new Set(CONTRACTOR_TIERS.map(tier => tier.name.toLowerCase()));

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
    const normalized = normalizeField(value, 64).toLowerCase();
    return allowedValues.has(normalized) ? normalized : '';
}

function normalizePositiveInteger(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return NaN;
    }

    return parsed;
}

function normalizePositiveNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number.parseFloat(String(value));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return NaN;
    }

    return Number.parseFloat(parsed.toFixed(2));
}

function normalizeDate(value) {
    const normalized = normalizeField(value, 32);
    if (!normalized) {
        return '';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return 'invalid';
    }

    const timestamp = Date.parse(`${normalized}T00:00:00.000Z`);
    if (!Number.isFinite(timestamp)) {
        return 'invalid';
    }

    return normalized;
}

function normalizeMaterials(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(entry => normalizeField(entry, 80).toLowerCase())
        .filter(entry => MATERIAL_OPTIONS.has(entry))
        .filter((entry, index, all) => all.indexOf(entry) === index)
        .slice(0, 3);
}

function normalizeForDedupe(value, maxLength) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export function sanitizeContractorEstimatePayload(payload = {}) {
    const estimate = {
        name: normalizeField(payload.name, 80),
        email: normalizeField(payload.email, 120).toLowerCase(),
        phone: normalizeField(payload.phone, 24),
        companyName: normalizeField(payload.companyName, 120),
        projectName: normalizeField(payload.projectName, 120),
        projectLocation: normalizeField(payload.projectLocation, 120),
        propertyType: normalizeEnum(payload.propertyType, PROPERTY_TYPES),
        numberOfUnits: normalizePositiveInteger(payload.numberOfUnits),
        averageUnitSquareFootage: normalizePositiveNumber(payload.averageUnitSquareFootage),
        unitsPerWeek: normalizePositiveNumber(payload.unitsPerWeek),
        fabricationLeadWeeks: normalizePositiveInteger(payload.fabricationLeadWeeks),
        installationLeadWeeks: normalizePositiveInteger(payload.installationLeadWeeks),
        projectStartDate: normalizeDate(payload.projectStartDate),
        completionGoal: normalizeDate(payload.completionGoal),
        materialInterests: normalizeMaterials(payload.materialInterests),
        projectDetails: normalizeMultiline(payload.projectDetails, 1600),
        routeId: normalizeField(payload.routeId, 80) || 'contractor-portal',
        website: normalizeField(payload.website, 120),
    };

    const errors = {};
    const today = new Date().toISOString().slice(0, 10);

    if (estimate.website) {
        errors.website = 'Spam protection triggered.';
    }
    if (estimate.name.length < 2) {
        errors.name = 'Enter the contact name.';
    }
    if (!EMAIL_PATTERN.test(estimate.email)) {
        errors.email = 'Enter a valid email address.';
    }
    if (!PHONE_PATTERN.test(estimate.phone)) {
        errors.phone = 'Enter a valid phone number.';
    }
    if (estimate.companyName.length < 2) {
        errors.companyName = 'Enter the company name.';
    }
    if (estimate.projectName.length < 2) {
        errors.projectName = 'Enter the project name.';
    }
    if (estimate.projectLocation.length < 2) {
        errors.projectLocation = 'Enter the project location.';
    }
    if (!estimate.propertyType) {
        errors.propertyType = 'Select the property type.';
    }
    if (Number.isNaN(estimate.numberOfUnits) || estimate.numberOfUnits === null || estimate.numberOfUnits < 3 || estimate.numberOfUnits > 5000) {
        errors.numberOfUnits = 'Enter a unit count between 3 and 5000.';
    }
    if (Number.isNaN(estimate.averageUnitSquareFootage) || estimate.averageUnitSquareFootage === null || estimate.averageUnitSquareFootage < 50 || estimate.averageUnitSquareFootage > 10000) {
        errors.averageUnitSquareFootage = 'Enter average square footage per unit.';
    }
    if (Number.isNaN(estimate.unitsPerWeek) || estimate.unitsPerWeek === null || estimate.unitsPerWeek < 1 || estimate.unitsPerWeek > 500) {
        errors.unitsPerWeek = 'Enter a production pace between 1 and 500 units per week.';
    }
    if (Number.isNaN(estimate.fabricationLeadWeeks) || estimate.fabricationLeadWeeks === null || estimate.fabricationLeadWeeks < 1 || estimate.fabricationLeadWeeks > 52) {
        errors.fabricationLeadWeeks = 'Enter fabrication lead time in weeks.';
    }
    if (Number.isNaN(estimate.installationLeadWeeks) || estimate.installationLeadWeeks === null || estimate.installationLeadWeeks < 1 || estimate.installationLeadWeeks > 52) {
        errors.installationLeadWeeks = 'Enter installation lead time in weeks.';
    }
    if (!estimate.projectStartDate || estimate.projectStartDate === 'invalid') {
        errors.projectStartDate = 'Enter a valid project start date.';
    } else if (estimate.projectStartDate < today) {
        errors.projectStartDate = 'Project start date should be today or later.';
    }
    if (!estimate.completionGoal || estimate.completionGoal === 'invalid') {
        errors.completionGoal = 'Enter a valid completion goal.';
    } else if (estimate.projectStartDate && estimate.projectStartDate !== 'invalid' && estimate.completionGoal < estimate.projectStartDate) {
        errors.completionGoal = 'Completion goal must be after the project start date.';
    }
    if (estimate.materialInterests.length === 0) {
        errors.materialInterests = 'Select at least one material target.';
    }
    if (estimate.projectDetails.length < 20) {
        errors.projectDetails = 'Share scope, site access, and scheduling details.';
    }

    return {
        data: estimate,
        errors,
        ok: Object.keys(errors).length === 0,
    };
}

export function buildContractorEstimateDedupeKey(estimate) {
    const signature = [
        normalizeForDedupe(estimate.email, 120),
        normalizeForDedupe(estimate.companyName, 120),
        normalizeForDedupe(estimate.projectName, 120),
        normalizeForDedupe(estimate.projectLocation, 120),
        normalizeForDedupe(estimate.numberOfUnits, 12),
        normalizeForDedupe(estimate.projectStartDate, 24),
    ].join('|');

    return createHash('sha256').update(signature).digest('hex').slice(0, 24);
}

export function buildContractorEstimateForwardPayload(estimate, request) {
    const requestId = normalizeField(request.headers['x-request-id'] || randomUUID(), 64);
    const dedupeKey = buildContractorEstimateDedupeKey(estimate);

    return {
        type: 'contractor_estimate',
        submittedAt: new Date().toISOString(),
        source: 'urban-stone-contractor-portal',
        requestId,
        dedupeKey,
        routeId: estimate.routeId || 'contractor-portal',
        automated: false,
        estimate: {
            name: estimate.name,
            email: estimate.email,
            phone: estimate.phone,
            companyName: estimate.companyName,
            projectName: estimate.projectName,
            projectLocation: estimate.projectLocation,
            propertyType: estimate.propertyType,
            numberOfUnits: estimate.numberOfUnits,
            averageUnitSquareFootage: estimate.averageUnitSquareFootage,
            unitsPerWeek: estimate.unitsPerWeek,
            fabricationLeadWeeks: estimate.fabricationLeadWeeks,
            installationLeadWeeks: estimate.installationLeadWeeks,
            projectStartDate: estimate.projectStartDate,
            completionGoal: estimate.completionGoal,
            materialInterests: estimate.materialInterests,
            projectDetails: estimate.projectDetails,
        },
        metadata: {
            requestId,
            dedupeKey,
            automated: false,
            ip: getClientIp(request),
            userAgent: request.headers['user-agent'] || 'unknown',
            referer: request.headers.referer || null,
            routeId: estimate.routeId || 'contractor-portal',
        },
    };
}