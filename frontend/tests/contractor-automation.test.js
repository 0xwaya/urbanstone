import {
    buildContractorEstimateForwardPayload,
    sanitizeContractorEstimatePayload,
} from '../lib/contractor-estimate';
import {
    buildContractorRegistrationEvent,
    getContractorNotificationEmails,
} from '../lib/contractor-notifications';

describe('contractor registration automation', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    it('defaults contractor notification recipients to sales', () => {
        process.env = { ...originalEnv };
        delete process.env.CONTRACTOR_NOTIFICATION_EMAILS;

        expect(getContractorNotificationEmails()).toEqual(['sales@urbanstone.co']);
    });

    it('allows notification recipient override from env', () => {
        process.env = {
            ...originalEnv,
            CONTRACTOR_NOTIFICATION_EMAILS: 'ops@example.com, sales@urbanstone.co ',
        };

        expect(getContractorNotificationEmails()).toEqual(['ops@example.com', 'sales@urbanstone.co']);
    });

    it('appends backup recipients to notification list', () => {
        process.env = {
            ...originalEnv,
            CONTRACTOR_NOTIFICATION_EMAILS: 'sales@urbanstone.co',
            CONTRACTOR_NOTIFICATION_BACKUP_EMAILS: 'mercado.ea@gmail.com',
        };

        expect(getContractorNotificationEmails()).toEqual(['sales@urbanstone.co', 'mercado.ea@gmail.com']);
    });

    it('dedupes notification recipients when backup repeats primary', () => {
        process.env = {
            ...originalEnv,
            CONTRACTOR_NOTIFICATION_EMAILS: 'sales@urbanstone.co, mercado.ea@gmail.com',
            CONTRACTOR_NOTIFICATION_BACKUP_EMAILS: 'mercado.ea@gmail.com, sales@urbanstone.co',
        };

        expect(getContractorNotificationEmails()).toEqual(['sales@urbanstone.co', 'mercado.ea@gmail.com']);
    });

    it('builds a spreadsheet-friendly contractor registration event', () => {
        const event = buildContractorRegistrationEvent({
            id: 'contractor-1',
            email: 'Builder@Example.com',
            company_name: 'Apex Builders',
            website: 'https://apex.example.com',
            approved: false,
            created_at: '2026-04-08T18:00:00.000Z',
        }, {
            headers: {
                'x-request-id': 'req-123',
                'x-forwarded-for': '203.0.113.42',
                'user-agent': 'Vitest',
            },
            socket: {
                remoteAddress: '203.0.113.42',
            },
        });

        expect(event.type).toBe('contractor_registration');
        expect(event.requestId).toBe('req-123');
        expect(event.contractor.email).toBe('builder@example.com');
        expect(event.contractor.approval_state).toBe('pending');
        expect(event.mailingListRow).toMatchObject({
            email: 'builder@example.com',
            company_name: 'Apex Builders',
            approval_state: 'pending',
        });
    });
});

describe('contractor estimate payloads', () => {
    const validPayload = {
        name: 'Jordan Vale',
        email: 'jordan@builderco.com',
        phone: '(513) 555-2233',
        companyName: 'Builder Co',
        projectName: 'Riverside Phase II',
        projectLocation: 'Cincinnati, OH',
        propertyType: 'apartment',
        numberOfUnits: '84',
        averageUnitSquareFootage: '58',
        unitsPerWeek: '14',
        fabricationLeadWeeks: '3',
        installationLeadWeeks: '2',
        projectStartDate: '2099-05-01',
        completionGoal: '2099-09-15',
        materialInterests: ['tropical mist', 'glimmer white'],
        projectDetails: 'Occupied renovation with freight elevator access, phased by building, amenity package in final release.',
    };

    it('accepts a valid commercial contractor estimate payload', () => {
        const result = sanitizeContractorEstimatePayload(validPayload);

        expect(result.ok).toBe(true);
        expect(result.errors).toEqual({});
        expect(result.data.materialInterests).toEqual(['tropical mist', 'glimmer white']);
        expect(result.data.numberOfUnits).toBe(84);
    });

    it('rejects invalid timeline ordering', () => {
        const result = sanitizeContractorEstimatePayload({
            ...validPayload,
            completionGoal: '2099-04-01',
        });

        expect(result.ok).toBe(false);
        expect(result.errors.completionGoal).toBe('Completion goal must be after the project start date.');
    });

    it('builds contractor estimate forward payloads with metadata', () => {
        const result = sanitizeContractorEstimatePayload(validPayload);
        const payload = buildContractorEstimateForwardPayload(result.data, {
            headers: {
                'x-request-id': 'estimate-123',
                'x-forwarded-for': '198.51.100.50',
                'user-agent': 'Vitest',
                referer: 'https://urbanstone.co/contractors',
            },
            socket: {
                remoteAddress: '198.51.100.50',
            },
        });

        expect(payload.type).toBe('contractor_estimate');
        expect(payload.requestId).toBe('estimate-123');
        expect(payload.routeId).toBe('contractor-portal');
        expect(payload.metadata.ip).toBe('198.51.100.50');
        expect(payload.estimate.projectName).toBe('Riverside Phase II');
        expect(payload.estimate.numberOfUnits).toBe(84);
    });
});