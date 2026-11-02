export const JOB_STAGES = [
    { id: 'new_lead', label: 'New lead' },
    { id: 'quoted', label: 'Quoted' },
    { id: 'deposit_in', label: 'Deposit in' },
    { id: 'templated', label: 'Templated' },
    { id: 'fabrication', label: 'Fabrication' },
    { id: 'installed', label: 'Installed' },
    { id: 'paid', label: 'Paid' },
];
export const STAGE_IDS = [...JOB_STAGES.map((s) => s.id), 'lost'];

const TZ = 'America/New_York';

/** YYYY-MM-DD in ET for a Date. */
export function etDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Monday..Sunday (ET) of the week containing `date`, as YYYY-MM-DD strings. */
export function etWeek(date = new Date()) {
    const today = etDate(date);
    const d = new Date(`${today}T12:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0
    const start = new Date(d.getTime() - dow * 86400000);
    const end = new Date(start.getTime() + 6 * 86400000);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Mirrors crm.job_deposit_window: Thu-Sun (ET) deposit => standard window. */
export function depositWindow(at) {
    if (!at) return null;
    const day = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(new Date(at));
    return ['Thu', 'Fri', 'Sat', 'Sun'].includes(day) ? 'standard' : 'expedite_ok';
}

export function installsThisWeek(jobs, date = new Date()) {
    const { start, end } = etWeek(date);
    return jobs.filter((j) => j.install_date && j.install_date >= start && j.install_date <= end && j.stage !== 'lost')
        .sort((a, b) => a.install_date.localeCompare(b.install_date));
}

const PATCH_KEYS = ['stage', 'deposit_at', 'deposit_amount', 'template_date', 'install_date', 'referred_by', 'notes'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates an admin patch; returns { patch } or { error }. */
export function cleanPatch(body = {}) {
    const patch = {};
    for (const key of PATCH_KEYS) {
        if (!(key in body)) continue;
        const value = body[key] == null ? '' : String(body[key]).trim();
        if (key === 'stage' && !STAGE_IDS.includes(value)) return { error: 'Unknown stage.' };
        if ((key === 'template_date' || key === 'install_date') && value && !DATE.test(value)) return { error: `Bad ${key}.` };
        if (key === 'deposit_at' && value && Number.isNaN(Date.parse(value))) return { error: 'Bad deposit date.' };
        if (key === 'deposit_amount' && value && !(Number(value) >= 0)) return { error: 'Bad deposit amount.' };
        patch[key] = value;
    }
    if (!Object.keys(patch).length) return { error: 'Nothing to update.' };
    return { patch };
}
