import { useEffect, useState } from 'react';

const DISMISS_STORAGE_KEY = 'urban-stone-chat-widget-dismissed';
const QUOTE_OPEN_EVENT = 'urbanstone:quote-opened';

function shouldOpenByDefault() {
    if (typeof window === 'undefined') {
        return false;
    }

    if (window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === 'true') {
        return false;
    }

    return typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 640px)').matches
        : true;
}

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasHydrated, setHasHydrated] = useState(false);
    const [showBot, setShowBot] = useState(false);
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const chatbotUrl = process.env.NEXT_PUBLIC_WAYALABS_CHATBOT_URL || '';
    const chatbotLabel = process.env.NEXT_PUBLIC_WAYALABS_CHATBOT_LABEL || 'Chat with AI concierge';

    useEffect(() => {
        setIsOpen(shouldOpenByDefault());
        setHasHydrated(true);
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const closeWidgetForQuote = () => {
            setIsOpen(false);
        };

        document.addEventListener(QUOTE_OPEN_EVENT, closeWidgetForQuote);

        return () => {
            document.removeEventListener(QUOTE_OPEN_EVENT, closeWidgetForQuote);
        };
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        window.sessionStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    };

    const handleOpen = () => {
        setIsOpen(true);
        window.sessionStorage.removeItem(DISMISS_STORAGE_KEY);
    };

    const handleOpenFormClick = () => {
        setIsOpen(false);

        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent(QUOTE_OPEN_EVENT));
        }
    };

    const toggleBot = () => {
        setShowBot((prev) => !prev);
    };

    if (!hasHydrated) {
        return null;
    }

    if (!isOpen) {
        return (
            <div className="pointer-events-none fixed bottom-4 right-4 z-50">
                <button
                    type="button"
                    className="brand-button-primary pointer-events-auto px-4 py-3 text-sm font-semibold"
                    onClick={handleOpen}
                    aria-label="Open quick contact panel"
                >
                    Fast estimate
                </button>
            </div>
        );
    }

    return (
        <aside className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:max-w-sm">
            <div className="pointer-events-auto rounded-3xl border border-border bg-surface/92 p-4 shadow-soft backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="eyebrow">Fast response</div>
                        <div className="font-display text-2xl font-semibold leading-tight sm:text-3xl">Need a countertop estimate today?</div>
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg font-medium text-muted transition hover:border-accent hover:text-text"
                        aria-label="Close quick contact panel"
                        onClick={handleClose}
                    >
                        ×
                    </button>
                </div>
                <p className="mt-2 text-sm text-muted">Use the estimate form, call for scheduling, or send photos, measurements, and layout details by email.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <a className="brand-button-primary px-3 py-2 text-sm font-semibold" href="#quote" onClick={handleOpenFormClick}>
                        Open form
                    </a>
                    <a className="brand-button-secondary inline-flex rounded-full px-3 py-2 text-sm font-semibold" href={`tel:${toTelHref(companyPhone)}`}>
                        Call
                    </a>
                    <a className="brand-button-secondary inline-flex rounded-full px-3 py-2 text-sm font-semibold" href={`mailto:${companyEmail}`}>
                        Email
                    </a>
                    {chatbotUrl ? (
                        <button
                            type="button"
                            className="brand-button-secondary inline-flex rounded-full px-3 py-2 text-sm font-semibold"
                            onClick={toggleBot}
                        >
                            {showBot ? 'Hide AI chat' : chatbotLabel}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="brand-button-secondary inline-flex rounded-full px-3 py-2 text-sm font-semibold"
                        onClick={handleClose}
                    >
                        Dismiss
                    </button>
                </div>
                {chatbotUrl && showBot ? (
                    <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">AI concierge</div>
                        <div className="mt-2 h-80 overflow-hidden rounded-2xl border border-border bg-white">
                            <iframe
                                title="Urbanstone AI assistant"
                                src={chatbotUrl}
                                className="h-full w-full"
                                allow="clipboard-write; microphone"
                                loading="lazy"
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}
