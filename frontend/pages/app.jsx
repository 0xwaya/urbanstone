import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import StoneHavenChat from '../components/StoneHavenChat';

export default function PublicPhoneApp() {
    const [screen, setScreen] = useState('home');
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
        setInstalled(standalone);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/app/sw.js').catch(() => {});
        }
    }, []);

    return (
        <>
            <Head>
                <title>Urban Stone</title>
                <meta name="description" content="Urban Stone on your phone. Chat, call, text, or request an estimate." />
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
                        {installed ? null : (
                            <p className="text-sm text-muted">
                                To keep this app on your iPhone, tap Share, then Add to Home Screen.
                            </p>
                        )}
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
        </>
    );
}
