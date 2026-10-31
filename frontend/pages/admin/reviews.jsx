import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';

const KEY = 'urbanstone:review-admin';

function Stars({ value }) {
    return <span className="text-accent" aria-label={`${value} out of 5 stars`}>{'★'.repeat(value)}<span className="text-border">{'★'.repeat(5 - value)}</span></span>;
}

export default function ReviewAdminPage() {
    const [secret, setSecret] = useState('');
    const [input, setInput] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState('');
    const [results, setResults] = useState({});

    const call = useCallback(async (method, body, token = secret) => {
        const response = await fetch('/api/reviews/admin', {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const failure = new Error(result.error || 'Request failed.');
            failure.status = response.status;
            failure.result = result;
            throw failure;
        }
        return result;
    }, [secret]);

    const load = useCallback(async (token = secret) => {
        setError('');
        try {
            setData(await call('GET', null, token));
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
        if (await load(input.trim())) {
            window.sessionStorage.setItem(KEY, input.trim());
            setSecret(input.trim());
            setInput('');
        }
    };

    const act = async (action, id, extra = {}) => {
        if (action === 'approve_send' && !window.confirm('Approve this exact message and send it to the customer?')) return;
        setBusyId(id);
        setError('');
        try {
            const result = await call('POST', { action, id, ...extra });
            setResults((current) => ({ ...current, [id]: result }));
            await load();
        } catch (actionError) {
            setResults((current) => ({ ...current, [id]: actionError.result || null }));
            setError(actionError.message);
        } finally {
            setBusyId('');
        }
    };

    const requests = data?.requests || [];
    const reviews = data?.reviews || [];

    return (
        <>
            <Head>
                <title>Review invites | Urban Stone admin</title>
                <meta name="robots" content="noindex,nofollow,noarchive" />
            </Head>
            <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-8">
                <div className="eyebrow">Urban Stone admin</div>
                <h1 className="mt-2 font-display text-3xl font-semibold">Customer review invites</h1>

                {!secret ? (
                    <form className="mt-6 max-w-md space-y-3" onSubmit={login}>
                        <label className="block text-sm font-semibold">Admin key
                            <input type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-border bg-panel px-4 py-3"
                                value={input} onChange={(event) => setInput(event.target.value)} required />
                        </label>
                        <button className="brand-button-primary rounded-full px-5 py-2.5 text-sm font-semibold" type="submit">Sign in</button>
                    </form>
                ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
                        <span>Delivery: <strong className="text-text">{data?.delivery === 'resend' ? 'Approve & send emails from sales@ via Resend' : 'Manual (copy the email and send it from sales@)'}</strong></span>
                        <button className="underline" type="button" onClick={() => load()}>Refresh</button>
                        <button className="underline" type="button" onClick={() => { window.sessionStorage.removeItem(KEY); setSecret(''); setData(null); }}>Sign out</button>
                    </div>
                )}

                {error ? <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}

                {data ? (
                    <>
                        <h2 className="mt-8 text-xl font-semibold">Review requests</h2>
                        {requests.length === 0 ? <p className="mt-2 text-sm text-muted">No eligible customers yet. Closed, paid-in-full quotes appear here automatically.</p> : null}
                        <div className="mt-4 space-y-4">
                            {requests.map((item) => {
                                const result = results[item.id];
                                const email = result?.email || item.preview;
                                return (
                                    <article key={item.id} className="rounded-2xl border border-border bg-surface p-5">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <div>
                                                <div className="font-semibold">{item.customer_name} <span className="font-normal text-muted">· {item.customer_email || 'no email'}</span></div>
                                                <div className="text-sm text-muted">{[item.quote_number, item.job_label, item.location].filter(Boolean).join(' · ')}</div>
                                            </div>
                                            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide">{item.status}{item.sent_at ? ` · ${new Date(item.sent_at).toLocaleDateString()}` : ''}</span>
                                        </div>
                                        {['eligible', 'approved'].includes(item.status) ? (
                                            <>
                                                <details className="mt-3" open={Boolean(result?.email)}>
                                                    <summary className="cursor-pointer text-sm font-semibold">Email preview: {email.subject}</summary>
                                                    <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-panel p-4 text-sm leading-6">{email.text}</pre>
                                                </details>
                                                {result?.inviteUrl && result?.delivery === 'manual' ? (
                                                    <p className="mt-2 text-sm text-muted">Personal link created. Copy the email above (it includes the link), send it from sales@ to {result.to}, then click “Mark as sent”.</p>
                                                ) : null}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button className="brand-button-primary rounded-full px-4 py-2 text-sm font-semibold" type="button" disabled={busyId === item.id}
                                                        onClick={() => act('approve_send', item.id)}>
                                                        {data.delivery === 'resend' ? 'Approve & send' : item.status === 'approved' ? 'Create a new link' : 'Approve & create link'}
                                                    </button>
                                                    {item.status === 'approved' && data.delivery === 'manual' ? (
                                                        <button className="brand-button-secondary rounded-full px-4 py-2 text-sm font-semibold" type="button" disabled={busyId === item.id}
                                                            onClick={() => act('mark_sent', item.id, { subject: email.subject })}>Mark as sent</button>
                                                    ) : null}
                                                    <button className="rounded-full px-4 py-2 text-sm text-muted underline" type="button" disabled={busyId === item.id}
                                                        onClick={() => act('decline', item.id)}>Don&apos;t ask</button>
                                                </div>
                                            </>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>

                        <h2 className="mt-10 text-xl font-semibold">Submitted reviews</h2>
                        {reviews.length === 0 ? <p className="mt-2 text-sm text-muted">No reviews yet.</p> : null}
                        <div className="mt-4 space-y-4">
                            {reviews.map((review) => (
                                <article key={review.id} className="rounded-2xl border border-border bg-surface p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-semibold">{review.display_name} <Stars value={review.rating} /></div>
                                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{review.status}</span>
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.review_text}</p>
                                    <div className="mt-3 flex gap-2">
                                        {review.status === 'pending' ? (
                                            <button className="brand-button-primary rounded-full px-4 py-2 text-sm font-semibold" type="button" disabled={busyId === review.id}
                                                onClick={() => act('publish', review.id)}>Publish</button>
                                        ) : null}
                                        <button className="rounded-full px-4 py-2 text-sm text-muted underline" type="button" disabled={busyId === review.id}
                                            onClick={() => act('reject', review.id)}>{review.status === 'published' ? 'Unpublish' : 'Reject'}</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                ) : null}
            </main>
        </>
    );
}
