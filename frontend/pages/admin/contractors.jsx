import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';

// Shares the admin key with /admin/reviews.
const KEY = 'urbanstone:review-admin';

const FLAG_LABELS = {
    website_unreachable: 'Website unreachable',
    no_website: 'No website',
    gibberish_name: 'Name looks random',
    gibberish_email: 'Email looks random',
    dotted_gmail: 'Dotted Gmail (bot pattern)',
    gibberish_domain: 'Domain looks random',
    junk_signup: 'Marked junk',
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'];

export default function ContractorAdminPage() {
    const [secret, setSecret] = useState('');
    const [input, setInput] = useState('');
    const [contractors, setContractors] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState('');

    const call = useCallback(async (method, body, token = secret) => {
        const response = await fetch('/api/contractor/admin', {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const failure = new Error(result.error || 'Request failed.');
            failure.status = response.status;
            throw failure;
        }
        return result;
    }, [secret]);

    const load = useCallback(async (token = secret) => {
        setError('');
        try {
            const result = await call('GET', null, token);
            setContractors(result.contractors || []);
            return true;
        } catch (loadError) {
            if (loadError.status === 401) {
                window.sessionStorage.removeItem(KEY);
                setSecret('');
            }
            setError(loadError.message);
            return false;
        }
    }, [call, secret]);

    useEffect(() => {
        const saved = window.sessionStorage.getItem(KEY) || '';
        if (saved) {
            setSecret(saved);
            load(saved);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (event) => {
        event.preventDefault();
        const token = input.trim();
        if (await load(token)) {
            window.sessionStorage.setItem(KEY, token);
            setSecret(token);
            setInput('');
        }
    };

    const act = async (action, id) => {
        setBusyId(id);
        setError('');
        try {
            await call('POST', { action, id });
            await load();
        } catch (actionError) {
            setError(actionError.message);
        } finally {
            setBusyId('');
        }
    };

    const visible = (contractors || []).filter((item) => filter === 'all' || item.status === filter);

    return (
        <>
            <Head>
                <title>Contractor approvals | Urban Stone admin</title>
                <meta name="robots" content="noindex,nofollow,noarchive" />
            </Head>
            <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-8">
                <div className="eyebrow">Urban Stone admin</div>
                <h1 className="mt-2 font-display text-3xl font-semibold">Contractor approvals</h1>
                <p className="mt-2 text-sm text-muted">New sign-ups stay pending until you approve them. Approved contractors can request a portal link.</p>

                {!secret ? (
                    <form className="mt-6 max-w-md space-y-3" onSubmit={login}>
                        <label className="block text-sm font-semibold">Admin key
                            <input type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-border bg-panel px-4 py-3"
                                value={input} onChange={(event) => setInput(event.target.value)} required />
                        </label>
                        <button className="brand-button-primary rounded-full px-5 py-2.5 text-sm font-semibold" type="submit">Sign in</button>
                    </form>
                ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
                        {FILTERS.map((name) => (
                            <button key={name} type="button" onClick={() => setFilter(name)}
                                className={`rounded-full border border-border px-3 py-1 capitalize ${filter === name ? 'bg-panel font-semibold text-text' : ''}`}>
                                {name}{contractors && name !== 'all' ? ` (${contractors.filter((item) => item.status === name).length})` : ''}
                            </button>
                        ))}
                        <button className="underline" type="button" onClick={() => load()}>Refresh</button>
                        <button className="underline" type="button" onClick={() => { window.sessionStorage.removeItem(KEY); setSecret(''); setContractors(null); }}>Sign out</button>
                    </div>
                )}

                {error ? <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}

                {contractors ? (
                    <div className="mt-6 space-y-4">
                        {visible.length === 0 ? <p className="text-sm text-muted">Nothing here.</p> : null}
                        {visible.map((item) => (
                            <article key={item.id} className="rounded-2xl border border-border bg-surface p-5">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <div>
                                        <div className="font-semibold">{item.company_name} <span className="font-normal text-muted">· {item.email}</span></div>
                                        <div className="text-sm text-muted">
                                            {item.website ? <a className="underline" href={item.website} target="_blank" rel="noopener noreferrer nofollow">{item.website}</a> : 'No website'}
                                            {' · '}{new Date(item.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide">{item.status}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className={`rounded-full px-2.5 py-1 ${item.email_verified ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'}`}>
                                        {item.email_verified ? 'Email verified' : 'Email unverified'}
                                    </span>
                                    {(item.risk_flags || []).map((flag) => (
                                        <span key={flag} className="rounded-full bg-red-100 px-2.5 py-1 text-red-900">{FLAG_LABELS[flag] || flag}</span>
                                    ))}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {item.status !== 'approved' ? (
                                        <button type="button" disabled={busyId === item.id} onClick={() => act('approve', item.id)}
                                            className="brand-button-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50">Approve</button>
                                    ) : null}
                                    {item.status !== 'rejected' ? (
                                        <button type="button" disabled={busyId === item.id} onClick={() => act('reject', item.id)}
                                            className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Reject</button>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </main>
        </>
    );
}
