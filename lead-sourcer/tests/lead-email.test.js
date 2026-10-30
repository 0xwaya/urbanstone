import { jest } from '@jest/globals';
import { COUNTY_SOURCES, buildCountyPermitLead } from '../src/permits-accela.js';
import { buildPermitLead } from '../src/permits.js';
import { buildLeadNotification, deriveProjectType, extractLeadFields } from '../src/lead-email.js';
import { relay } from '../src/relay.js';

const samplePermit = {
    permitNumber: 'BLD2026-00001', recordType: 'Residential Alteration', date: '10/28/2026', status: 'Issued',
    address: '123 SAMPLE RD, ANDERSON TOWNSHIP OH 45230', description: 'First floor remodel: kitchen, primary bath & powder room <vanities>',
    cost: 190000, link: 'https://eztrak.example.invalid/record/1', contractor: 'Example Builders LLC', contactRole: 'Contractor',
    licenseType: 'General Contractor', contractorPhone: '(513) 555-0100', contractorEmail: 'office@example.invalid',
};

describe('lead notification email', () => {
    test('county permit lead renders the key fields with brand styling and no raw dump', () => {
        const { subject, html, text, fields } = buildLeadNotification(buildCountyPermitLead(COUNTY_SOURCES['hamilton-county'], samplePermit));
        expect(subject).toMatch(/^\[Lead Sourcer\] Hamilton County permit · Example Builders LLC · Kitchen \+ Bath \/ vanity remodel · Anderson Township · \$190,000$/);
        expect(fields).toMatchObject({ name: 'Example Builders LLC', city: 'Anderson Township', valuation: '$190,000', permitNumber: 'BLD2026-00001', phone: '(513) 555-0100', email: 'office@example.invalid' });
        expect(html).toContain('#0B1220');
        expect(html).toContain('#C4A35A');
        expect(html).toContain("'Cormorant Garamond',Georgia");
        expect(html).toContain('href="tel:5135550100"');
        expect(html).toContain('href="mailto:office@example.invalid"');
        expect(html).toContain('href="https://eztrak.example.invalid/record/1"');
        expect(html).toContain('&lt;vanities&gt;');
        expect(html).not.toContain('<pre');
        expect(html).not.toContain('[PERMITS-HAMILTON MATCH]');
        expect(text).toContain('Phone: (513) 555-0100');
        expect(text).toContain('Valuation: $190,000');
        expect(text).toContain('Source record: https://eztrak.example.invalid/record/1');
    });

    test('empty fields are hidden and placeholder contacts never shown', () => {
        const payload = buildCountyPermitLead(COUNTY_SOURCES['butler-county'], {
            permitNumber: 'B-1', recordType: 'Residential Additions and Alterations to Existing Home', date: '10/28/2026', status: 'Issued',
            address: '1 TEST WAY, HAMILTON OH 45013', description: 'Bath remodel', cost: 0, link: '', contractor: 'Test Co',
        });
        const { html, text } = buildLeadNotification(payload);
        for (const out of [html, text]) {
            expect(out).not.toMatch(/Phone|Email|Valuation|not listed|not stated|unknown/);
        }
        const fields = extractLeadFields({ source: 'permits', lead: { name: 'X', email: 'auto+permits-1@urbanstone.co', phone: '' }, metadata: {} });
        expect(fields.email).toBe('');
    });

    test('Cincinnati permit lead works with registry contact', () => {
        const payload = buildPermitLead({
            permitNumber: 'C-9', subType: 'Alteration', address: '9 MAIN ST', zip: '45208', description: 'Kitchen renovation', cost: 85000,
            issuedAt: '2026-10-28T00:00:00', status: 'Issued', contractor: 'Sample Remodeling Co', link: 'https://example.invalid/c9',
        }, { phone: '513-555-0199', email: '', types: ['General Contractor'] });
        const { subject, text } = buildLeadNotification(payload);
        expect(subject).toContain('Cincinnati permit · Sample Remodeling Co · Kitchen remodel');
        expect(text).toContain('Role: General Contractor');
    });

    test('project type derivation', () => {
        expect(deriveProjectType('Master suite and kitchen addition')).toBe('Kitchen + Addition');
        expect(deriveProjectType('Interior remodel for office space')).toBe('Commercial interior remodel');
        expect(deriveProjectType('New countertops and vanity')).toBe('Countertops + Bath / vanity');
        expect(deriveProjectType('roof')).toBe('');
    });

    test('relay sends the branded html + text alternative to sales@ only', async () => {
        const original = { key: process.env.RESEND_API_KEY, to: process.env.LEAD_SOURCER_ALERT_EMAIL };
        process.env.RESEND_API_KEY = 'test-key';
        delete process.env.LEAD_SOURCER_ALERT_EMAIL;
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) });
        const log = jest.spyOn(console, 'log').mockImplementation(() => {});
        try {
            await relay(buildCountyPermitLead(COUNTY_SOURCES['hamilton-county'], samplePermit));
            const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(body.to).toEqual(['sales@urbanstone.co']);
            expect(body.html).toContain('Lead details');
            expect(body.text).toContain('NEW LEAD — Hamilton County permit');
            expect(body.subject).toContain('Example Builders LLC');
        } finally {
            fetchSpy.mockRestore();
            log.mockRestore();
            if (original.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = original.key;
            if (original.to !== undefined) process.env.LEAD_SOURCER_ALERT_EMAIL = original.to;
        }
    });
});
