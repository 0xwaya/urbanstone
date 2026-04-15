import { useEffect, useState, useRef } from 'react';

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
    // For draggable chat popup
    const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const chatPopupRef = useRef(null);
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


    // Instead of dismiss, open chat popup
    const handleChat = () => {
        setShowBot(true);
        setChatPosition({ x: 0, y: 0 }); // Reset position on open
    };

    const handleClose = () => {
        setIsOpen(false);
        setShowBot(false);
        setChatPosition({ x: 0, y: 0 }); // Reset position on close
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
                {/* Floating chat button */}
                <button
                    type="button"
                    className="ml-3 brand-button-secondary pointer-events-auto px-4 py-3 text-sm font-semibold rounded-full shadow-lg flex items-center gap-2"
                    onClick={handleChat}
                    aria-label="Open chat with Stone Haven"
                    style={{ position: 'relative', zIndex: 100 }}
                    disabled={showBot}
                >
                    <span role="img" aria-label="Stone Haven">🧑‍🦰</span> Chat
                </button>
                {/* Chat popup */}
                {showBot && (
                    <div
                        ref={chatPopupRef}
                        className="fixed bottom-24 right-4 z-50 w-full max-w-xs sm:max-w-sm rounded-2xl border border-border bg-surface/98 shadow-2xl flex flex-col"
                        style={{
                            left: chatPosition.x ? chatPosition.x : 'auto',
                            top: chatPosition.y ? chatPosition.y : 'auto',
                            cursor: dragging ? 'grabbing' : 'default',
                        }}
                    >
                        <div
                            className="chat-popup-header flex items-center justify-between gap-2 px-4 py-2 bg-accent text-white rounded-t-2xl cursor-move select-none"
                            onMouseDown={(e) => {
                                setDragging(true);
                                setDragOffset({ x: e.clientX - (chatPosition.x || window.innerWidth - 360), y: e.clientY - (chatPosition.y || window.innerHeight - 500) });
                            }}
                            onMouseUp={() => setDragging(false)}
                            onMouseMove={(e) => {
                                if (dragging) {
                                    setChatPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
                                }
                            }}
                            onMouseLeave={() => setDragging(false)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🧑‍🦰</span>
                                <span className="font-bold">Stone Haven</span>
                                <span className="ml-1 text-lg">🤖</span>
                            </div>
                            <button
                                className="text-white hover:text-red-300 text-xl font-bold"
                                onClick={() => setShowBot(false)}
                                aria-label="Close chat"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex-1 bg-white p-0 rounded-b-2xl overflow-hidden" style={{ minHeight: 400, maxHeight: 500 }}>
                            {/* Embed chat iframe or custom chat UI here */}
                            {chatbotUrl ? (
                                <iframe
                                    title="Stone Haven AI assistant"
                                    src={chatbotUrl}
                                    className="h-full w-full border-0"
                                    allow="clipboard-write; microphone"
                                    loading="lazy"
                                    style={{ borderRadius: '0 0 1rem 1rem' }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted">
                                    <span className="text-4xl mb-2">🧑‍🦰🤖</span>
                                    <div className="font-semibold">Hi, I&apos;m Stone Haven, Urban Stone Collective&apos;s assistant!<br />How can I help you with your countertop project?</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
                    <button
                        type="button"
                        className="brand-button-secondary inline-flex rounded-full px-3 py-2 text-sm font-semibold"
                        onClick={handleChat}
                        disabled={showBot}
                    >
                        <span role="img" aria-label="Stone Haven">🧑‍🦰</span> Chat
                    </button>
                </div>
                {/* Chat popup in panel mode */}
                {showBot && (
                    <div
                        ref={chatPopupRef}
                        className="fixed bottom-24 right-4 z-50 w-full max-w-xs sm:max-w-sm rounded-2xl border border-border bg-surface/98 shadow-2xl flex flex-col"
                        style={{
                            left: chatPosition.x ? chatPosition.x : 'auto',
                            top: chatPosition.y ? chatPosition.y : 'auto',
                            cursor: dragging ? 'grabbing' : 'default',
                        }}
                    >
                        <div
                            className="chat-popup-header flex items-center justify-between gap-2 px-4 py-2 bg-accent text-white rounded-t-2xl cursor-move select-none"
                            onMouseDown={(e) => {
                                setDragging(true);
                                setDragOffset({ x: e.clientX - (chatPosition.x || window.innerWidth - 360), y: e.clientY - (chatPosition.y || window.innerHeight - 500) });
                            }}
                            onMouseUp={() => setDragging(false)}
                            onMouseMove={(e) => {
                                if (dragging) {
                                    setChatPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
                                }
                            }}
                            onMouseLeave={() => setDragging(false)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🧑‍🦰</span>
                                <span className="font-bold">Stone Haven</span>
                                <span className="ml-1 text-lg">🤖</span>
                            </div>
                            <button
                                className="text-white hover:text-red-300 text-xl font-bold"
                                onClick={() => setShowBot(false)}
                                aria-label="Close chat"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex-1 bg-white p-0 rounded-b-2xl overflow-hidden" style={{ minHeight: 400, maxHeight: 500 }}>
                            {/* Embed chat iframe or custom chat UI here */}
                            {chatbotUrl ? (
                                <iframe
                                    title="Stone Haven AI assistant"
                                    src={chatbotUrl}
                                    className="h-full w-full border-0"
                                    allow="clipboard-write; microphone"
                                    loading="lazy"
                                    style={{ borderRadius: '0 0 1rem 1rem' }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted">
                                    <span className="text-4xl mb-2">🧑‍🦰🤖</span>
                                    <div className="font-semibold">Hi, I'm Stone Haven, Urban Stone Collective's assistant!<br />How can I help you with your countertop project?</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
