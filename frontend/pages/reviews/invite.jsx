import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

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
    const [client, setClient] = useState(null);
    const [inviteToken, setInviteToken] = useState('');
    const [session, setSession] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const [rating, setRating] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setInviteToken(readInviteToken());
        let supabase;
        try {
            supabase = getSupabaseBrowserClient();
            setClient(supabase);
        } catch (authSetupError) {
            setError(authSetupError.message || 'Google sign-in is not configured.');
            return undefined;
        }

        let active = true;
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (active) setSession(nextSession);
        });
        supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
            if (!active) return;
            if (sessionError) setError('Could not restore your Google sign-in. Please try again.');
            setSession(sessionData?.session || null);
        });

        return () => {
            active = false;
            data.subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        setError('');
        if (!inviteToken) {
            setError('Use the personal invitation link from Urban Stone to continue.');
            return;
        }
        if (!client) {
            setError('Google sign-in is not configured. Please contact Urban Stone.');
            return;
        }
        setBusy(true);
        try {
            const { error: signInError } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/reviews/invite` },
            });
            if (signInError) setError('Google sign-in could not start. Please try again.');
        } catch {
            setError('Google sign-in could not start. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const signOut = async () => {
        if (!client) return;
        await client.auth.signOut();
        setSession(null);
        setError('');
    };

    const submitReview = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            const { data, error: sessionError } = await client.auth.getSession();
            const accessToken = data?.session?.access_token;
            if (sessionError || !accessToken) {
                setError('Your Google sign-in expired. Sign in again to submit your review.');
                setSession(null);
                return;
            }

            const response = await fetch('/api/reviews/submit', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inviteToken, displayName, rating, reviewText }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(result.error || 'Could not submit your review. Please try again.');
                return;
            }

            window.sessionStorage.removeItem(INVITE_STORAGE_KEY);
            setInviteToken('');
            setSuccess(result.message || 'Thank you. Your review is awaiting moderation.');
            setReviewText('');
        } catch {
            setError('Could not submit your review. Please check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    const provider = session?.user?.app_metadata?.provider;
    const isGoogleSession = provider === 'google'
        || session?.user?.app_metadata?.providers?.includes('google')
        || session?.user?.identities?.some((identity) => identity.provider === 'google');

    return (
        <>
            <Head>
                <meta name="robots" content="noindex,nofollow,noarchive" />
            </Head>
            <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
                <Link className="text-sm font-semibold text-accent hover:underline" href="/">Urban Stone Collective</Link>
                <section className="mt-6 rounded-[2rem] border border-border bg-surface p-6 shadow-soft sm:p-9">
                <div className="eyebrow">Private customer feedback</div>
                <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">Share your Urban Stone experience</h1>
                <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                    This is an invite-only review form for previous customers. Google sign-in verifies the account named in your invitation. Your review is submitted to Urban Stone for moderation; it is not posted to Google or Google Maps.
                </p>

                {!inviteToken ? (
                    <div className="mt-6 rounded-xl border border-border bg-panel p-4 text-sm leading-6 text-muted">
                        A personal invitation link is required. If you are a previous customer and need an invitation, contact Urban Stone at{' '}
                        <a className="font-semibold text-accent underline" href="mailto:sales@urbanstone.co">sales@urbanstone.co</a>.
                    </div>
                ) : !session ? (
                    <div className="mt-6">
                        <p className="text-sm text-muted">Your invitation is private and expires after 14 days. Sign in with the Google account that received it.</p>
                        <button
                            className="brand-button-primary mt-4 rounded-full px-5 py-3 text-sm font-semibold"
                            type="button"
                            disabled={busy || !client}
                            onClick={signInWithGoogle}
                        >
                            {busy ? 'Opening Google…' : 'Continue with Google'}
                        </button>
                    </div>
                ) : !isGoogleSession ? (
                    <div className="mt-6 rounded-xl border border-border bg-panel p-4 text-sm leading-6 text-muted">
                        This invitation requires a Google account. Sign out and continue with Google.
                        <button className="ml-2 font-semibold text-accent underline" type="button" onClick={signOut}>Sign out</button>
                    </div>
                ) : (
                    <form className="mt-6 space-y-5" onSubmit={submitReview}>
                        <div className="rounded-xl border border-border bg-panel p-4 text-sm text-muted">
                            Signed in as <span className="font-semibold text-text">{session.user.email}</span>. This address must match your invitation.
                            <button className="ml-2 font-semibold text-accent underline" type="button" onClick={signOut}>Sign out</button>
                        </div>
                        <label className="block text-sm font-semibold text-text">
                            Name to display with your review
                            <input
                                className="mt-2 w-full rounded-xl border border-border bg-panel px-4 py-3 font-normal"
                                autoComplete="name"
                                maxLength={80}
                                required
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value)}
                            />
                        </label>
                        <fieldset>
                            <legend className="text-sm font-semibold text-text">Your rating</legend>
                            <div className="mt-2 flex flex-wrap gap-3">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <label key={value} className="inline-flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm">
                                        <input type="radio" name="rating" value={value} required checked={Number(rating) === value} onChange={() => setRating(String(value))} />
                                        {value}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <label className="block text-sm font-semibold text-text">
                            Your honest feedback (positive or negative)
                            <textarea
                                className="mt-2 min-h-36 w-full rounded-xl border border-border bg-panel px-4 py-3 font-normal leading-6"
                                minLength={20}
                                maxLength={2000}
                                required
                                value={reviewText}
                                onChange={(event) => setReviewText(event.target.value)}
                            />
                        </label>
                        <p className="text-xs leading-5 text-muted">Eligible customers are invited without regard to their expected rating. Reviews are moderated for privacy and abuse, not sentiment.</p>
                        <button className="brand-button-primary rounded-full px-5 py-3 text-sm font-semibold" type="submit" disabled={busy}>
                            {busy ? 'Submitting…' : 'Submit review'}
                        </button>
                    </form>
                )}

                {error ? <p className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p> : null}
                {success ? <p className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900" role="status">{success}</p> : null}
                </section>
            </main>
        </>
    );
}
