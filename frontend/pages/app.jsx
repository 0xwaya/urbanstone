import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import LogoMark from '../components/LogoMark';
import StoneHavenChat from '../components/StoneHavenChat';
import { captureInstallPrompt, registerAppWorker, runInstall } from '../lib/install-app';

const APP_URL = 'https://www.urbanstone.co/app';

export default function PublicPhoneApp() {
    const [installed, setInstalled] = useState(false);
    const [screen, setScreen] = useState('home');
    const [installEvent, setInstallEvent] = useState(null);

    useEffect(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
        setInstalled(standalone);
        registerAppWorker();
        return captureInstallPrompt(setInstallEvent);
    }, []);

    async function addToHome() {
        const started = await runInstall(installEvent);
        if (started) setInstallEvent(null);
    }

    return (
        <>
            <Head>
                <title>Urban Stone</title>
                <meta name="description" content="Add Urban Stone to your Home Screen." />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0B1220" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content="Urban Stone" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
                <link rel="manifest" href="/manifest.webmanifest" />
                <link rel="canonical" href={APP_URL} />
                <meta name="robots" content="index,follow" />
            </Head>
            {installed ? (
                <div className="flex h-[100dvh] flex-col bg-bg text-text">
                    <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <LogoMark className="h-12 w-12 shrink-0" />
                        <div className="nav-brand-wordmark">
                            <span>Urban Stone</span>
                            <span className="nav-brand-secondary">Collective</span>
                        </div>
                    </header>
                    {screen === 'home' ? (
                        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                            <p className="font-display text-4xl leading-tight">Premium countertops. Fast install.</p>
                            <button type="button" onClick={() => setScreen('chat')} className="brand-button-primary rounded-md px-4 py-3 text-left font-semibold">Chat</button>
                            <a className="rounded-md border border-border px-4 py-3 font-semibold" href="tel:+15133075840">Call</a>
                            <a className="rounded-md border border-border px-4 py-3 font-semibold" href="sms:+15133075840">Text</a>
                            <Link className="rounded-md border border-border px-4 py-3 font-semibold" href="/#quote">Estimate</Link>
                        </main>
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <button type="button" onClick={() => setScreen('home')} className="px-4 py-2 text-left text-sm font-semibold text-accent">Home</button>
                            <div className="min-h-0 flex-1">
                                <StoneHavenChat embedded showHeader={false} />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <main className="flex min-h-[100dvh] flex-col bg-bg px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-text">
                    <LogoMark className="h-16 w-16" />
                    <div className="nav-brand-wordmark mt-4">
                        <span>Urban Stone</span>
                        <span className="nav-brand-secondary">Collective</span>
                    </div>
                    <h1 className="mt-2 font-display text-5xl leading-none">Add the app</h1>
                    {installEvent ? (
                        <button type="button" onClick={addToHome} className="brand-button-primary mt-8 rounded-md px-5 py-4 text-lg font-semibold">
                            Add to Home Screen
                        </button>
                    ) : (
                        <p className="mt-6 max-w-sm text-base leading-relaxed text-muted">
                            iPhone will not add the icon from a button. In Safari, tap Share at the bottom of the screen, then Add to Home Screen.
                        </p>
                    )}
                </main>
            )}
        </>
    );
}
