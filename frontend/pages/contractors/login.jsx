import Head from 'next/head';
import Link from 'next/link';
import LogoMark from '../../components/LogoMark';
import { useState } from 'react';

const MODE = { REGISTER: 'register', LOGIN: 'login' };

export default function ContractorLogin() {
    const [mode, setMode] = useState(MODE.REGISTER);

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regCompany, setRegCompany] = useState('');
    const [regWebsite, setRegWebsite] = useState('');
    const [regStatus, setRegStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [regMsg, setRegMsg] = useState('');

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginStatus, setLoginStatus] = useState(null);
    const [loginMsg, setLoginMsg] = useState('');

    async function readApiResponse(res, fallbackMessage) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await res.json();
            return data?.message || data?.error || fallbackMessage;
        }

        const text = await res.text();
        return text || fallbackMessage;
    }

    async function handleRegister(e) {
        e.preventDefault();
        setRegStatus('loading');
        setRegMsg('');
        try {
            const res = await fetch('/api/contractor/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regEmail, company_name: regCompany, website: regWebsite }),
            });
            if (res.ok) {
                const message = await readApiResponse(res, 'Application submitted.');
                setRegStatus('success');
                setRegMsg(message);
            } else {
                const message = await readApiResponse(res, 'Something went wrong. Please try again.');
                setRegStatus('error');
                setRegMsg(message);
            }
        } catch {
            setRegStatus('error');
            setRegMsg('Network error. Please try again.');
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        setLoginStatus('loading');
        setLoginMsg('');
        try {
            const res = await fetch('/api/contractor/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail }),
            });
            if (res.ok) {
                const message = await readApiResponse(res, 'Check your email for a magic link.');
                setLoginStatus('success');
                setLoginMsg(message);
            } else {
                const message = await readApiResponse(res, 'Magic link request failed. Please try again.');
                setLoginStatus('error');
                setLoginMsg(message);
            }
        } catch {
            setLoginStatus('error');
            setLoginMsg('Network error. Please try again.');
        }
    }

    return (
        <>
            <Head>
                <title>Contractor Program — Urban Stone</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-16">
                <div className="mb-10 flex flex-col items-center gap-3">
                    <LogoMark className="w-10 h-10" />
                    <p className="eyebrow">Contractor Program</p>
                </div>

                <div className="w-full max-w-md bg-surface border border-border rounded-2xl overflow-hidden">
                    {/* Tab switcher */}
                    <div className="flex border-b border-border">
                        <button
                            onClick={() => setMode(MODE.REGISTER)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === MODE.REGISTER
                                ? 'text-text bg-panel'
                                : 'text-muted hover:text-text'
                                }`}
                        >
                            Request Access
                        </button>
                        <button
                            onClick={() => setMode(MODE.LOGIN)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === MODE.LOGIN
                                ? 'text-text bg-panel'
                                : 'text-muted hover:text-text'
                                }`}
                        >
                            Already Registered
                        </button>
                    </div>

                    <div className="p-8">
                        {mode === MODE.REGISTER ? (
                            <>
                                <h1 className="text-xl font-semibold text-text mb-1">Apply for Contractor Access</h1>
                                <p className="text-sm text-muted mb-6">
                                    For apartment builders, hotel developers, and office contractors only. We&apos;ll review your application and send a magic link when approved.
                                </p>

                                {regStatus === 'success' ? (
                                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 text-sm text-text">
                                        {regMsg}
                                    </div>
                                ) : (
                                    <form onSubmit={handleRegister} className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-xs text-muted mb-1.5" htmlFor="reg-email">
                                                Business Email
                                            </label>
                                            <input
                                                id="reg-email"
                                                type="email"
                                                required
                                                value={regEmail}
                                                onChange={e => setRegEmail(e.target.value)}
                                                placeholder="you@yourcompany.com"
                                                className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-muted mb-1.5" htmlFor="reg-company">
                                                Company Name
                                            </label>
                                            <input
                                                id="reg-company"
                                                type="text"
                                                required
                                                value={regCompany}
                                                onChange={e => setRegCompany(e.target.value)}
                                                placeholder="Apex Builders LLC"
                                                className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-muted mb-1.5" htmlFor="reg-website">
                                                Website or Social Profile
                                            </label>
                                            <input
                                                id="reg-website"
                                                type="url"
                                                required
                                                value={regWebsite}
                                                onChange={e => setRegWebsite(e.target.value)}
                                                placeholder="https://yourcompany.com"
                                                className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                                            />
                                        </div>
                                        {regStatus === 'error' && (
                                            <p className="text-sm text-red-400">{regMsg}</p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={regStatus === 'loading'}
                                            className="brand-button-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {regStatus === 'loading' ? 'Submitting…' : 'Submit Application'}
                                        </button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <>
                                <h1 className="text-xl font-semibold text-text mb-1">Get Your Access Link</h1>
                                <p className="text-sm text-muted mb-6">
                                    Already approved? Enter your email and we&apos;ll send a secure login link valid for 30 minutes.
                                </p>

                                {loginStatus === 'success' ? (
                                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 text-sm text-text">
                                        {loginMsg}
                                    </div>
                                ) : (
                                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-xs text-muted mb-1.5" htmlFor="login-email">
                                                Business Email
                                            </label>
                                            <input
                                                id="login-email"
                                                type="email"
                                                required
                                                value={loginEmail}
                                                onChange={e => setLoginEmail(e.target.value)}
                                                placeholder="you@yourcompany.com"
                                                className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                                            />
                                        </div>
                                        {loginStatus === 'error' && (
                                            <p className="text-sm text-red-400">{loginMsg}</p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={loginStatus === 'loading'}
                                            className="brand-button-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loginStatus === 'loading' ? 'Sending…' : 'Send Magic Link'}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <p className="mt-8 text-xs text-muted text-center max-w-xs">
                    This portal is for qualified contractors only. Residential inquiries should use our{' '}
                    <Link href="/" className="text-accent hover:underline">main site</Link>.
                </p>
            </div>
        </>
    );
}
