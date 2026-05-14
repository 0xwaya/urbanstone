import { buildAutomatedLeadPayload } from '../src/core/payload.js';

describe('automated payload contract', () => {
    const originalEnv = {
        email: process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL,
        emailDomain: process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL_DOMAIN,
        phone: process.env.LEAD_SOURCER_AUTOMATED_CONTACT_PHONE,
    };

    afterEach(() => {
        if (originalEnv.email === undefined) {
            delete process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL;
        } else {
            process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL = originalEnv.email;
        }

        if (originalEnv.emailDomain === undefined) {
            delete process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL_DOMAIN;
        } else {
            process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL_DOMAIN = originalEnv.emailDomain;
        }

        if (originalEnv.phone === undefined) {
            delete process.env.LEAD_SOURCER_AUTOMATED_CONTACT_PHONE;
        } else {
            process.env.LEAD_SOURCER_AUTOMATED_CONTACT_PHONE = originalEnv.phone;
        }
    });

    test('emits non-empty contact fields and automated metadata', () => {
        const payload = buildAutomatedLeadPayload({
            id: 'reddit:1srx67l',
            source: 'reddit',
            title: 'Need quartz estimate',
            body: 'Kitchen remodel and backsplash',
            url: 'https://reddit.com/r/cincinnati/comments/1srx67l',
            author: 'nocturnalnook',
            createdAt: '2026-04-21T14:57:00.000Z',
        });

        expect(payload.lead.email).toBeTruthy();
        expect(payload.lead.phone).toBeTruthy();
        expect(payload.metadata.automated).toBe(true);
        expect(payload.lead.email).toContain('@');
    });

    test('supports explicit contact overrides from environment variables', () => {
        process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL = 'relay@urbanstone.co';
        process.env.LEAD_SOURCER_AUTOMATED_CONTACT_PHONE = '+1-513-555-1212';

        const payload = buildAutomatedLeadPayload({
            id: 'craigslist:12345',
            source: 'craigslist',
            title: 'Need countertop installer',
            body: '',
            url: 'https://cincinnati.craigslist.org/lbg/12345.html',
            author: 'poster',
            createdAt: '2026-04-22T10:00:00.000Z',
        });

        expect(payload.lead.email).toBe('relay@urbanstone.co');
        expect(payload.lead.phone).toBe('+1-513-555-1212');
        expect(payload.metadata.automated).toBe(true);
    });
});
