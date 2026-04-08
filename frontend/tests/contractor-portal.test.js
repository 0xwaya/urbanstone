import {
    STATIC_ADMIN_EMAILS,
    STATIC_APPROVED_EMAILS,
    getContractorAdminEmails,
    getContractorApprovedEmails,
    getEmailAccess,
} from '../lib/contractor-access';
import {
    DEFAULT_CONTRACTOR_EMAIL_FROM,
    DEFAULT_CONTRACTOR_PORTAL_BASE_URL,
    getContractorEmailFrom,
    getContractorPortalBaseUrl,
} from '../lib/contractor-portal';

describe('contractor access wiring', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    it('keeps admin and vetted emails explicitly wired', () => {
        expect(STATIC_ADMIN_EMAILS).toEqual([
            'sales@urbanstone.co',
            'admin@wayalabs.com',
            'mercado.ea@gmail.com',
        ]);
        expect(STATIC_APPROVED_EMAILS).toEqual([
            'fchomesolutions513@gmail.com',
        ]);

        expect(getEmailAccess('sales@urbanstone.co')).toMatchObject({ isAdmin: true, isApproved: true });
        expect(getEmailAccess('admin@wayalabs.com')).toMatchObject({ isAdmin: true, isApproved: true });
        expect(getEmailAccess('mercado.ea@gmail.com')).toMatchObject({ isAdmin: true, isApproved: true });
        expect(getEmailAccess('fchomesolutions513@gmail.com')).toMatchObject({ isAdmin: false, isApproved: true });
    });

    it('merges runtime admin and approved email overrides', () => {
        process.env = {
            ...originalEnv,
            CONTRACTOR_ADMIN_EMAILS: 'ops@example.com, SALES@URBANSTONE.CO ',
            CONTRACTOR_APPROVED_EMAILS: 'builder@example.com, FCHOMESOLUTIONS513@GMAIL.COM ',
        };

        expect(getContractorAdminEmails().has('ops@example.com')).toBe(true);
        expect(getContractorAdminEmails().has('sales@urbanstone.co')).toBe(true);
        expect(getContractorApprovedEmails().has('builder@example.com')).toBe(true);
        expect(getContractorApprovedEmails().has('fchomesolutions513@gmail.com')).toBe(true);
    });
});

describe('contractor portal runtime config', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    it('defaults contractor sender to the send subdomain', () => {
        process.env = { ...originalEnv };
        delete process.env.CONTRACTOR_EMAIL_FROM;

        expect(getContractorEmailFrom()).toBe(DEFAULT_CONTRACTOR_EMAIL_FROM);
    });

    it('allows contractor sender override from env', () => {
        process.env = {
            ...originalEnv,
            CONTRACTOR_EMAIL_FROM: 'Urban Stone <portal@send.urbanstone.co>',
        };

        expect(getContractorEmailFrom()).toBe('Urban Stone <portal@send.urbanstone.co>');
    });

    it('prefers forwarded request host for magic-link URLs', () => {
        const req = {
            headers: {
                'x-forwarded-proto': 'https',
                'x-forwarded-host': 'www.urbanstone.co',
            },
        };

        expect(getContractorPortalBaseUrl(req)).toBe('https://www.urbanstone.co');
    });

    it('falls back to NEXT_PUBLIC_SITE_URL and trims trailing slashes', () => {
        process.env = {
            ...originalEnv,
            NEXT_PUBLIC_SITE_URL: 'https://www.urbanstone.co/',
        };

        expect(getContractorPortalBaseUrl({ headers: {} })).toBe('https://www.urbanstone.co');
    });

    it('uses the hard fallback when no runtime URL is available', () => {
        process.env = { ...originalEnv };
        delete process.env.NEXT_PUBLIC_SITE_URL;

        expect(getContractorPortalBaseUrl({ headers: {} })).toBe(DEFAULT_CONTRACTOR_PORTAL_BASE_URL);
    });
});
