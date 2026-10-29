import { buildWebsiteLeadEmail, sendWebsiteLeadEmail } from '../lib/lead-email';

const payload = {
    submittedAt: '2026-10-29T13:00:00.000Z',
    source: 'urban-stone-site',
    requestId: 'req-1',
    dedupeKey: 'abc',
    routeId: 'homepage',
    lead: {
        name: 'Jamie <Stone>',
        email: 'jamie@example.com',
        phone: '(513) 555-0101',
        projectDetails: 'Kitchen island',
        totalSquareFootage: 54.5,
        materialPreferences: ['a', 'b'],
        drawingImage: null,
    },
};

describe('buildWebsiteLeadEmail', () => {
    it('matches the former Zap layout and escapes HTML', () => {
        const message = buildWebsiteLeadEmail(payload, {});
        expect(message.to).toEqual(['sales@urbanstone.co']);
        expect(message.from).toBe('Urban Stone <sales@urbanstone.co>');
        expect(message.subject).toBe('Lead: Website | Jamie <Stone>');
        expect(message.reply_to).toBe('jamie@example.com');
        expect(message.text).toContain('Name: Jamie <Stone>\nEmail: jamie@example.com\nPhone: (513) 555-0101\nDetails: Kitchen island');
        expect(message.html).toContain('Jamie &lt;Stone&gt;');
        expect(message.attachments).toBeUndefined();
    });

    it('omits reply_to for invalid emails and attaches drawings', () => {
        const message = buildWebsiteLeadEmail({
            ...payload,
            lead: { ...payload.lead, email: 'nope', drawingImage: { name: 'plan.png', dataUrl: 'data:image/png;base64,AAAA' } },
        }, {});
        expect(message.reply_to).toBeUndefined();
        expect(message.attachments).toEqual([{ filename: 'plan.png', content: 'AAAA' }]);
    });
});

describe('sendWebsiteLeadEmail', () => {
    it('throws without an API key', async () => {
        await expect(sendWebsiteLeadEmail(payload, {}, vi.fn())).rejects.toThrow(/RESEND_API_KEY/);
    });

    it('returns the Resend id on success', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'em_1' }) });
        await expect(sendWebsiteLeadEmail(payload, { RESEND_API_KEY: 'k' }, fetchImpl)).resolves.toEqual({ id: 'em_1' });
        expect(fetchImpl.mock.calls[0][0]).toBe('https://api.resend.com/emails');
    });

    it('throws when Resend rejects', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ name: 'validation_error', message: 'bad' }) });
        await expect(sendWebsiteLeadEmail(payload, { RESEND_API_KEY: 'k' }, fetchImpl)).rejects.toThrow(/403/);
    });
});
