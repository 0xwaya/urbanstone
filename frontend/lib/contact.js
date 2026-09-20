const DEFAULT_SMS_NUMBER = '+15133075840';

function normalizePhone(value) {
    const normalized = String(value || '').replace(/[^\d+]/g, '');
    return normalized || DEFAULT_SMS_NUMBER;
}

export function getSmsHref(message = '') {
    const number = normalizePhone(process.env.NEXT_PUBLIC_COMPANY_SMS || DEFAULT_SMS_NUMBER);
    const text = String(message || '').trim();
    return text ? `sms:${number}?body=${encodeURIComponent(text)}` : `sms:${number}`;
}

export function getSmsNumber() {
    return normalizePhone(process.env.NEXT_PUBLIC_COMPANY_SMS || DEFAULT_SMS_NUMBER);
}
