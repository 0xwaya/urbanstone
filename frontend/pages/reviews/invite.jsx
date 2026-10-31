import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const INVITE_STORAGE_KEY = 'urbanstone:review-invite';

function readInviteToken() {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.hash.slice(1));
    const invite = params.get('invite') || '';
    if (invite) {
        window.sessionStorage.setItem(INVITE_STORAGE_KEY, invite);
        window.history.replaceState(null, '', window.location.pathname);
    }
    return invite || window.sessionStorage.getItem(INVITE_STORAGE_KEY) || '';
}

export default function ReviewInvitePage() {
    const [inviteToken, setInviteToken] = useState('');
    const [invite, setInvite] = useState(null);
    const [checking, setChecking] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const token = readInviteToken();
        setInviteToken(token);
        if (!token) {
            setChecking(false);
            return;
        }
        fetch('/api/reviews/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteToken: token }),
        })
            .then(async (response) => {
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.error || 'This invitation could not be loaded.');
                setInvite(result.invite);
                setDisplayName(result.invite?.display_name || '');
            })
            .catch((lookupError) => setError(lookupError.message))
            .finally(() => setChecking(false));
    }, []);

    const submitReview = async (event) => {
        event.preventDefault();
        if (!rating) {
            setError('Please choose a star rating.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/reviews/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteToken, displayName, rating, reviewText }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(result.error || 'Could not submit your review. Please try again.');
                return;
            }
            window.sessionStorage.removeItem(INVITE_STORAGE_KEY);
            setSuccess(result.message || 'Thank you! Your review was received.');
        } catch {
            setError('Could not submit your review. Please check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Head>
                <title>Share your experience | Urban Stone Collective</title>
                <meta name="robots" content="noindex,nofollow,noarchive" />
            </Head>
            <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
                <Link className="text-sm font-semibold text-accent hover:underline" href="/">Urban Stone Collective</Link>
                <section className="mt-6 rounded-[2rem] border border-border bg-surface p-6 shadow-soft sm:p-9">
                    <div className="eyebrow">Private customer review</div>
                    <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                        {invite?.first_name ? `Thank you, ${invite.first_name}!` : 'Share your Urban Stone experience'}
                    </h1>
                    <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                        Your review goes to Urban Stone and is posted on urbanstone.co as soon as you submit it. Please leave out anything private, like your street address. Honest feedback of any kind is welcome.
                    </p>

                    {checking ? (
                        <p className="mt-6 text-sm text-muted" role="status">Checking your invitation…</p>
                    ) : success ? (
                        <p className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900" role="status">{success}</p>
                    ) : !inviteToken ? (
                        <div className="mt-6 rounded-xl border border-border bg-panel p-4 text-sm leading-6 text-muted">
                            A personal invitation link is required. If you are a previous customer and would like one, email{' '}
                            <a className="font-semibold text-accent underline" href="mailto:sales@urbanstone.co">sales@urbanstone.co</a>.
                        </div>
                    ) : invite ? (
                        <form className="mt-6 space-y-5" onSubmit={submitReview}>
                            <div className="rounded-xl border border-border bg-panel p-4 text-sm leading-6 text-muted">
                                Invitation for <span className="font-semibold text-text">{invite.email}</span>
                                {invite.job_label ? <> · {invite.job_label}</> : null}
                            </div>
                            <label className="block text-sm font-semibold text-text">
                                Name shown with your review
                                <input className="mt-2 w-full rounded-xl border border-border bg-panel px-4 py-3 font-normal" autoComplete="name"
                                    maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                                <span className="mt-1 block text-xs font-normal text-muted">We show your first name and last initial.</span>
                            </label>
                            <fieldset>
                                <legend className="text-sm font-semibold text-text">Your rating</legend>
                                <div className="mt-2 flex gap-1" role="radiogroup">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <label key={value} className="cursor-pointer">
                                            <input className="peer sr-only" type="radio" name="rating" value={value}
                                                checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} star${value > 1 ? 's' : ''}`} />
                                            <span aria-hidden="true" className={`block rounded-lg px-1 text-3xl leading-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${value <= rating ? 'text-accent' : 'text-border'}`}>★</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <label className="block text-sm font-semibold text-text">
                                Your review
                                <textarea className="mt-2 min-h-36 w-full rounded-xl border border-border bg-panel px-4 py-3 font-normal leading-6"
                                    minLength={20} maxLength={2000} required value={reviewText} onChange={(event) => setReviewText(event.target.value)} />
                            </label>
                            <button className="brand-button-primary rounded-full px-5 py-3 text-sm font-semibold" type="submit" disabled={busy}>
                                {busy ? 'Submitting…' : 'Submit review'}
                            </button>
                        </form>
                    ) : null}

                    {error && !success ? <p className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p> : null}
                </section>
            </main>
        </>
    );
}
