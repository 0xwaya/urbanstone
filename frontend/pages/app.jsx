import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import StoneHavenChat from '../components/StoneHavenChat';

export default function PublicPhoneApp() {
    const [mode, setMode] = useState('install');
    const [screen, setScreen] = useState('home');
    const [installEvent, setInstallEvent] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const standalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
        if (standalone || params.get('open') === '1') {
            setMode('app');
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/app/sw.js').catch(() => {});
        }
        const onPrompt = (event) => {
            event.preventDefault();
            setInstallEvent(event);
        };
        window.addEventListener('beforeinstallprompt', onPrompt);
        return () => window.removeEventListener('beforeinstallprompt', onPrompt);
    }, []);

    async function downloadApp() {
        if (!installEvent) return;
        installEvent.prompt();
        setInstallEvent(null);
    }

    return (
        <>
            <Head>
                <title>{mode === 'app' ? 'Urban Stone' : 'Download the Urban Stone app'}</title>
                <meta name="description" content="Add Urban Stone to your Home Screen. Chat, call, text, or request an estimate. No account." />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0B1220" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content="Urban Stone" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                <link rel="manifest" href="/manifest.webmanifest" />
                <link rel="canonical" href="https://www.urbanstone.co/app" />
                <meta name="robots" content="index,follow" />
            </Head>
            {mode === 'app' ? (
                <div className="flex h-[100dvh] flex-col bg-bg text-text">
                    <header className="border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <p className="text-xs font-semibold tracking-[0.18em] text-accent">URBAN STONE</p>
                        <h1 className="font-display text-3xl leading-none">{screen === 'chat' ? 'Chat' : 'Collective'}</h1>
                    </header>
                    {screen === 'home' ? (
                        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                            <p className="font-display text-4xl leading-tight">Premium countertops. Fast install.</p>
                            <p className="text-sm leading-relaxed text-muted">
                                Quartz, granite, and quartzite for greater Cincinnati and Northern Kentucky.
                            </p>
                            <button type="button" onClick={() => setScreen('chat')} className="brand-button-primary rounded-md px-4 py-3 text-left font-semibold">
                                Chat
                            </button>
                            <a className="rounded-md border border-border px-4 py-3 font-semibold" href="tel:+15133075840">Call</a>
                            <a className="rounded-md border border-border px-4 py-3 font-semibold" href="sms:+15133075840">Text</a>
                            <Link className="rounded-md border border-border px-4 py-3 font-semibold" href="/#quote">Estimate</Link>
                        </main>
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <button type="button" onClick={() => setScreen('home')} className="px-4 py-2 text-left text-sm font-semibold text-accent">
                                Home
                            </button>
                            <div className="min-h-0 flex-1">
                                <StoneHavenChat embedded showHeader={false} />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <main className="min-h-[100dvh] bg-bg px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-text">
                    <p className="text-xs font-semibold tracking-[0.18em] text-accent">URBAN STONE</p>
                    <h1 className="mt-2 max-w-[12ch] font-display text-5xl leading-none">Add the app</h1>
                    <p className="mt-4 max-w-md text-base text-muted">
                        This page is the download. iPhone does not save a file. Add Urban Stone to your Home Screen, then the icon opens the app.
                    </p>
                    {installEvent ? (
                        <button type="button" onClick={downloadApp} className="brand-button-primary mt-6 rounded-md px-5 py-3 font-semibold">
                            Download the app
                        </button>
                    ) : null}
                    <ol className="mt-6 space-y-3 text-base">
                        <li className="rounded-2xl border border-border bg-surface/70 px-4 py-3">1. Tap the Share button at the bottom of Safari.</li>
                        <li className="rounded-2xl border border-border bg-surface/70 px-4 py-3">2. Scroll and tap Add to Home Screen.</li>
                        <li className="rounded-2xl border border-border bg-surface/70 px-4 py-3">3. Tap Add. The Urban Stone icon opens the app.</li>
                    </ol>
                    <Link href="/app?open=1" className="mt-6 inline-flex text-sm font-semibold text-accent">
                        Open the app in this browser
                    </Link>
                </main>
            )}
        </>
    );
}
