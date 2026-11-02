import handler from '../pages/api/jobs/admin';
import { cleanPatch, depositWindow, etWeek, installsThisWeek } from '../lib/job-board';

const SECRET = 'b'.repeat(40);
function res() {
    const r = { headers: {}, statusCode: 200, body: null };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
}
const db = () => ({ rpc: vi.fn(async (name) => ({ data: name === 'job_admin_list' ? { jobs: [{ id: 'x' }], open_quotes: [] } : { ok: true }, error: null })) });

describe('job board helpers', () => {
    it('flags Thursday-or-later ET deposits as standard window', () => {
        expect(depositWindow('2026-11-04T23:30:00-05:00')).toBe('expedite_ok'); // Wed 11:30 PM ET
        expect(depositWindow('2026-11-05T04:30:00Z')).toBe('expedite_ok'); // still Wed in ET
        expect(depositWindow('2026-11-05T05:30:00Z')).toBe('standard'); // Thu 12:30 AM ET
        expect(depositWindow('2026-11-08T15:00:00Z')).toBe('standard'); // Sun
        expect(depositWindow('2026-11-09T15:00:00Z')).toBe('expedite_ok'); // Mon
    });
    it('computes this week Mon-Sun in ET', () => {
        expect(etWeek(new Date('2026-11-02T14:00:00Z'))).toEqual({ start: '2026-11-02', end: '2026-11-08' });
        const jobs = [{ id: 1, install_date: '2026-11-06', stage: 'fabrication' }, { id: 2, install_date: '2026-11-10', stage: 'templated' }];
        expect(installsThisWeek(jobs, new Date('2026-11-02T14:00:00Z')).map((j) => j.id)).toEqual([1]);
    });
    it('validates patches', () => {
        expect(cleanPatch({ stage: 'nope' }).error).toBeTruthy();
        expect(cleanPatch({ install_date: '11/5' }).error).toBeTruthy();
        expect(cleanPatch({ stage: 'deposit_in', install_date: '2026-11-12' }).patch).toEqual({ stage: 'deposit_in', install_date: '2026-11-12' });
    });
});

describe('/api/jobs/admin', () => {
    beforeEach(() => { process.env.REVIEW_INVITE_ADMIN_SECRET = SECRET; process.env.REVIEWS_SUPABASE_URL = 'https://x.supabase.co'; process.env.REVIEWS_SUPABASE_PUBLISHABLE_KEY = 'k'; });
    it('rejects without the admin key', async () => {
        const r = res();
        await handler({ method: 'GET', headers: {} }, r, { db: db() });
        expect(r.statusCode).toBe(401);
    });
    it('lists jobs and updates a stage', async () => {
        const d = db();
        const r = res();
        await handler({ method: 'GET', headers: { authorization: `Bearer ${SECRET}` } }, r, { db: d });
        expect(r.body.jobs).toHaveLength(1);
        const r2 = res();
        await handler({ method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: { action: 'update', id: '11111111-1111-4111-8111-111111111111', patch: { stage: 'deposit_in' } } }, r2, { db: d });
        expect(r2.statusCode).toBe(200);
        expect(d.rpc).toHaveBeenLastCalledWith('job_admin_update', expect.objectContaining({ p_patch: { stage: 'deposit_in' } }));
    });
});
