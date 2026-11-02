import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { JOB_STAGES, installsThisWeek } from '../../lib/job-board';

const KEY = 'urbanstone:review-admin'; // same admin key as /admin/reviews
const money = (v) => (v == null ? '' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
const day = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '');
const etDay = (ts) => (ts ? new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : '');

function WindowBadge({ value }) {
    if (!value) return null;
    return value === 'standard'
        ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900" title="Deposit landed Thursday or later (ET). Don't promise same-week expedite.">Standard window</span>
        : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">Expedite OK</span>;
}

function JobCard({ job, busy, onUpdate, onFee }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const idx = JOB_STAGES.findIndex((s) => s.id === job.stage);
    const next = JOB_STAGES[idx + 1];
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const save = async () => { if (Object.keys(form).length) { await onUpdate(job.id, form); setForm({}); } setOpen(false); };
    return (
        <article className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="font-semibold">{job.customer_name}</div>
                    <div className="text-sm text-muted">{[job.title, job.city].filter(Boolean).join(' · ')}</div>
                    <div className="text-xs text-muted">{[job.quote_number && `${job.quote_number} ${job.quote_version || ''}`, money(job.total)].filter(Boolean).join(' · ')}</div>
                </div>
                <WindowBadge value={job.schedule_window} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                {job.deposit_at ? <span>Deposit {etDay(job.deposit_at)}{job.deposit_amount ? ` · ${money(job.deposit_amount)}` : ''}</span> : null}
                {job.template_date ? <span>Template {day(job.template_date)}</span> : null}
                {job.install_date ? <span className="font-semibold text-text">Install {day(job.install_date)}</span> : null}
                {job.balance_due != null && Number(job.balance_due) > 0 ? <span>Balance {money(job.balance_due)}</span> : null}
            </div>
            {job.fee_id ? (
                <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={job.fee_status === 'paid'} disabled={busy} onChange={(e) => onFee(job.fee_id, e.target.checked)} />
                    Finder&apos;s fee {money(job.fee_amount)} to {job.fee_partner}: <strong>{job.fee_status === 'paid' ? 'Paid' : 'Owed'}</strong>
                </label>
            ) : job.referred_by ? <div className="mt-2 text-xs text-muted">Referred by {job.referred_by}: $100 fee logs at Deposit in</div> : null}
            {job.notes ? <p className="mt-2 text-xs text-muted">{job.notes}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
                {next ? (
                    <button type="button" disabled={busy} className="brand-button-primary rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={() => onUpdate(job.id, { stage: next.id })}>Move to {next.label} →</button>
                ) : null}
                <button type="button" className="rounded-full border border-border px-4 py-2 text-sm" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Edit'}</button>
            </div>
            {open ? (
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <label>Stage
                        <select className="mt-1 w-full rounded-lg border border-border bg-panel p-2" defaultValue={job.stage} onChange={set('stage')}>
                            {JOB_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                            <option value="lost">Lost</option>
                        </select>
                    </label>
                    <label>Deposit received (date and time)
                        <input type="datetime-local" className="mt-1 w-full rounded-lg border border-border bg-panel p-2" onChange={(e) => setForm((f) => ({ ...f, deposit_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
                    </label>
                    <label>Deposit amount
                        <input inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-panel p-2" defaultValue={job.deposit_amount || ''} onChange={set('deposit_amount')} />
                    </label>
                    <label>Template date
                        <input type="date" className="mt-1 w-full rounded-lg border border-border bg-panel p-2" defaultValue={job.template_date || ''} onChange={set('template_date')} />
                    </label>
                    <label>Install date
                        <input type="date" className="mt-1 w-full rounded-lg border border-border bg-panel p-2" defaultValue={job.install_date || ''} onChange={set('install_date')} />
                    </label>
                    <label>Referred by (cabinet contractor)
                        <input className="mt-1 w-full rounded-lg border border-border bg-panel p-2" defaultValue={job.referred_by || ''} onChange={set('referred_by')} />
                    </label>
                    <label className="sm:col-span-2">Notes
                        <textarea rows={2} className="mt-1 w-full rounded-lg border border-border bg-panel p-2" defaultValue={job.notes || ''} onChange={set('notes')} />
                    </label>
                    <button type="button" disabled={busy} className="brand-button-primary rounded-full px-4 py-2 font-semibold sm:col-span-2" onClick={save}>Save</button>
                </div>
            ) : null}
        </article>
    );
}

export default function JobBoardPage() {
    const [secret, setSecret] = useState('');
    const [input, setInput] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [stage, setStage] = useState('all');
    const [quote, setQuote] = useState('');

    const call = useCallback(async (method, body, token = secret) => {
        const res = await fetch('/api/jobs/admin', {
            method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) { const e = new Error(out.error || 'Request failed.'); e.status = res.status; throw e; }
        return out;
    }, [secret]);

    const load = useCallback(async (token = secret) => {
        setError('');
        try { setData(await call('GET', null, token)); return true; } catch (e) {
            if (e.status === 401) { window.sessionStorage.removeItem(KEY); setSecret(''); }
            setError(e.message); return false;
        }
    }, [call, secret]);

    useEffect(() => {
        const saved = window.sessionStorage.getItem(KEY) || '';
        if (saved) { setSecret(saved); load(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (e) => {
        e.preventDefault();
        if (await load(input.trim())) { window.sessionStorage.setItem(KEY, input.trim()); setSecret(input.trim()); setInput(''); }
    };
    const run = async (body) => {
        setBusy(true); setError('');
        try { await call('POST', body); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
    };

    const jobs = useMemo(() => data?.jobs || [], [data]);
    const thisWeek = useMemo(() => installsThisWeek(jobs), [jobs]);
    const counts = useMemo(() => Object.fromEntries(JOB_STAGES.map((s) => [s.id, jobs.filter((j) => j.stage === s.id).length])), [jobs]);
    const owed = jobs.filter((j) => j.fee_status === 'owed');
    const shown = JOB_STAGES.filter((s) => stage === 'all' || s.id === stage);

    return (
        <>
            <Head>
                <title>Job board | Urban Stone admin</title>
                <meta name="robots" content="noindex,nofollow,noarchive" />
            </Head>
            <main className="mx-auto min-h-screen max-w-7xl px-3 py-6 sm:px-8 sm:py-10">
                <div className="eyebrow">Urban Stone admin</div>
                <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Job board</h1>

                {!secret ? (
                    <form className="mt-6 max-w-md space-y-3" onSubmit={login}>
                        <label className="block text-sm font-semibold">Admin key
                            <input type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-border bg-panel px-4 py-3"
                                value={input} onChange={(e) => setInput(e.target.value)} required />
                        </label>
                        <button className="brand-button-primary rounded-full px-5 py-2.5 text-sm font-semibold" type="submit">Sign in</button>
                    </form>
                ) : (
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
                        <button className="underline" type="button" onClick={() => load()}>Refresh</button>
                        <button className="underline" type="button" onClick={() => { window.sessionStorage.removeItem(KEY); setSecret(''); setData(null); }}>Sign out</button>
                    </div>
                )}

                {error ? <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}

                {data ? (
                    <>
                        <section className="mt-6 rounded-2xl border border-border bg-panel p-4">
                            <h2 className="font-semibold">Installs this week ({thisWeek.length})</h2>
                            {thisWeek.length ? (
                                <ul className="mt-2 space-y-1 text-sm">
                                    {thisWeek.map((j) => <li key={j.id}><strong>{day(j.install_date)}</strong> · {j.customer_name}{j.city ? `, ${j.city}` : ''} · {j.title}</li>)}
                                </ul>
                            ) : <p className="mt-1 text-sm text-muted">No installs scheduled Monday to Sunday this week.</p>}
                            {owed.length ? <p className="mt-3 text-sm">Finder&apos;s fees owed: <strong>{owed.length} · {money(owed.reduce((s, j) => s + Number(j.fee_amount || 0), 0))}</strong></p> : null}
                        </section>

                        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm">
                            <button type="button" onClick={() => setStage('all')} className={`shrink-0 rounded-full border px-3 py-1.5 ${stage === 'all' ? 'border-text font-semibold' : 'border-border'}`}>All ({jobs.length})</button>
                            {JOB_STAGES.map((s) => (
                                <button key={s.id} type="button" onClick={() => setStage(s.id)} className={`shrink-0 rounded-full border px-3 py-1.5 ${stage === s.id ? 'border-text font-semibold' : 'border-border'}`}>{s.label} ({counts[s.id]})</button>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {shown.map((s) => (
                                <section key={s.id}>
                                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{s.label} · {counts[s.id]}</h3>
                                    <div className="space-y-3">
                                        {jobs.filter((j) => j.stage === s.id).map((j) => (
                                            <JobCard key={j.id} job={j} busy={busy}
                                                onUpdate={(id, patch) => run({ action: 'update', id, patch })}
                                                onFee={(id, paid) => run({ action: 'fee', id, paid })} />
                                        ))}
                                        {!counts[s.id] ? <p className="text-xs text-muted">Nothing here.</p> : null}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <section className="mt-8 rounded-2xl border border-border p-4">
                            <h2 className="font-semibold">Add a job from a quote</h2>
                            <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run({ action: 'create', quote_number: quote }).then(() => setQuote('')); }}>
                                <select className="rounded-lg border border-border bg-panel p-2 text-sm" value={quote} onChange={(e) => setQuote(e.target.value)} required>
                                    <option value="">Pick a quote…</option>
                                    {(data.openQuotes || []).map((q) => <option key={q.quote_number} value={q.quote_number}>{q.quote_number} {q.version} · {q.customer_name} · {q.status} · {money(q.total)}</option>)}
                                </select>
                                <button type="submit" disabled={busy || !quote} className="brand-button-primary rounded-full px-4 py-2 text-sm font-semibold">Add job</button>
                            </form>
                        </section>
                    </>
                ) : null}
            </main>
        </>
    );
}
