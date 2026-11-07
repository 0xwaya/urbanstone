import { useEffect, useState } from 'react';
import Head from 'next/head';
import StoneHavenChat from '../components/StoneHavenChat';

export default function PublicPhoneApp() {
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
        setInstalled(standalone);
    }, []);

    return (
        <>
            <Head>
                <title>Urban Stone app</title>
                <meta name="description" content="Chat with Onyx, request an estimate, or call Urban Stone. Add this page to your Home Screen. No extra account." />
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
                    <h1 className="font-display text-3xl leading-none">On your phone</h1>
                </header>
                {installed ? null : (
                    <p className="border-b border-border px-4 py-3 text-sm text-muted">
                        On iPhone, open this page in Safari, tap Share, then Add to Home Screen.
                        It stays on urbanstone.co. No Grok account.
                    </p>
                )}
                <div className="min-h-0 flex-1">
                    <StoneHavenChat embedded showHeader={false} />
                </div>
                <nav className="grid grid-cols-3 gap-2 border-t border-border px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3" aria-label="Contact">
                    <a className="brand-button-primary rounded-md px-3 py-3 text-center text-sm font-semibold" href="tel:+15133075840">Call</a>
                    <a className="rounded-md border border-border px-3 py-3 text-center text-sm font-semibold" href="sms:+15133075840">Text</a>
                    <a className="rounded-md border border-border px-3 py-3 text-center text-sm font-semibold" href="/#quote">Estimate</a>
                </nav>
            </div>
        </>
    );
}
