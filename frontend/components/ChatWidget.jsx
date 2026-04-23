import { useEffect, useRef, useState } from 'react';
import StoneHavenChat from './StoneHavenChat';
import LogoMark from './LogoMark';

const QUOTE_OPEN_EVENT = 'urbanstone:quote-opened';
const DESKTOP_BREAKPOINT = 640;
const CHAT_WINDOW_WIDTH = 368;
const CHAT_WINDOW_HEIGHT = 560;

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

function clampChatPosition(position) {
    if (typeof window === 'undefined' || !position) {
        return position;
    }

    const maxX = Math.max(12, window.innerWidth - CHAT_WINDOW_WIDTH - 12);
    const maxY = Math.max(12, window.innerHeight - CHAT_WINDOW_HEIGHT - 12);

    return {
        x: Math.min(Math.max(12, position.x), maxX),
        y: Math.min(Math.max(12, position.y), maxY),
    };
}

function ChatPopup({
    chatbotUrl,
    companyPhone,
    companyEmail,
    isExternalEmbed,
    onClose,
    onDragStart,
    onOpenQuote,
    position,
}) {
    const popupStyle = position
        ? {
            left: `${position.x}px`,
            top: `${position.y}px`,
        }
        : undefined;

    return (
        <div
            className={`fixed z-[60] flex w-[min(23rem,calc(100vw-1rem))] max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-[1.6rem] border border-border/90 bg-[linear-gradient(160deg,rgba(13,21,38,0.96),rgba(10,17,31,0.92))] shadow-[0_30px_90px_rgba(6,12,26,0.55)] ring-1 ring-border/55 backdrop-blur-xl ${position ? '' : 'bottom-20 left-2 right-2 sm:bottom-24 sm:left-auto sm:right-5'}`.trim()}
            style={popupStyle}
        >
            <div
                className={`flex items-center justify-between gap-3 border-b border-border/70 bg-[linear-gradient(140deg,rgba(50,93,165,0.95),rgba(21,42,84,0.96))] px-4 py-3 text-white ${typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT ? 'cursor-move' : ''}`.trim()}
                onMouseDown={onDragStart}
            >
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl border border-white/25 bg-[rgba(7,14,28,0.45)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        <LogoMark className="h-full w-full" />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">Haven</div>
                        <div className="text-[11px] text-white/75">Urban Stone • Live now</div>
                    </div>
                </div>
                <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-medium transition hover:bg-white/20"
                    onClick={onClose}
                    aria-label="Close chat"
                >
                    ×
                </button>
            </div>

            <div className="h-[min(62dvh,29rem)] min-h-0 bg-bg sm:h-[min(66dvh,31rem)]">
                {isExternalEmbed ? (
                    <iframe
                        title="Stone Haven AI assistant"
                        src={chatbotUrl}
                        className="h-full w-full border-0"
                        allow="clipboard-write; microphone"
                        loading="lazy"
                    />
                ) : (
                    <StoneHavenChat embedded showHeader={false} />
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/80 bg-surface/92 px-3 py-2.5 backdrop-blur">
                <button
                    type="button"
                    className="brand-button-primary px-3.5 py-1.5 text-xs font-semibold"
                    onClick={onOpenQuote}
                >
                    Open estimate form
                </button>
                <a
                    className="rounded-full border border-border bg-panel/80 px-3 py-1.5 text-xs font-semibold text-text transition hover:border-accent hover:text-accent"
                    href={`tel:${toTelHref(companyPhone)}`}
                >
                    Call
                </a>
                <a
                    className="rounded-full border border-border bg-panel/80 px-3 py-1.5 text-xs font-semibold text-text transition hover:border-accent hover:text-accent"
                    href={`mailto:${companyEmail}`}
                >
                    Email
                </a>
            </div>
        </div>
    );
}

export default function ChatWidget() {
    const [hasHydrated, setHasHydrated] = useState(false);
    const [showBot, setShowBot] = useState(false);
    const [chatPosition, setChatPosition] = useState(null);
    const [dragging, setDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const externalChatbotUrl = (process.env.NEXT_PUBLIC_WAYALABS_CHATBOT_URL || '').trim();
    const isExternalEmbed = Boolean(externalChatbotUrl);
    const chatbotUrl = externalChatbotUrl || '/ai-chat';
    const chatbotLabel = (process.env.NEXT_PUBLIC_WAYALABS_CHATBOT_LABEL || 'Chat with Stone Haven').trim() || 'Chat with Stone Haven';

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const closeWidgetForQuote = () => {
            setShowBot(false);
            setChatPosition(null);
            setDragging(false);
        };

        document.addEventListener(QUOTE_OPEN_EVENT, closeWidgetForQuote);

        return () => {
            document.removeEventListener(QUOTE_OPEN_EVENT, closeWidgetForQuote);
        };
    }, []);

    useEffect(() => {
        if (!dragging || typeof window === 'undefined') {
            return undefined;
        }

        const handleMouseMove = (event) => {
            setChatPosition(
                clampChatPosition({
                    x: event.clientX - dragOffsetRef.current.x,
                    y: event.clientY - dragOffsetRef.current.y,
                })
            );
        };

        const stopDragging = () => {
            setDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopDragging);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', stopDragging);
        };
    }, [dragging]);

    useEffect(() => {
        if (!showBot || typeof window === 'undefined') {
            return undefined;
        }

        const handleResize = () => {
            setChatPosition((current) => clampChatPosition(current));
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setShowBot(false);
                setDragging(false);
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [showBot]);

    const handleChatOpen = () => {
        setShowBot(true);
        setDragging(false);
        setChatPosition(null);
    };

    const handleChatClose = () => {
        setShowBot(false);
        setDragging(false);
        setChatPosition(null);
    };

    const handleOpenFormClick = () => {
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent(QUOTE_OPEN_EVENT));
        }
    };

    const handleDragStart = (event) => {
        if (typeof window === 'undefined' || window.innerWidth < DESKTOP_BREAKPOINT) {
            return;
        }

        const nextPosition = chatPosition || clampChatPosition({
            x: window.innerWidth - CHAT_WINDOW_WIDTH - 20,
            y: window.innerHeight - CHAT_WINDOW_HEIGHT - 20,
        });

        dragOffsetRef.current = {
            x: event.clientX - nextPosition.x,
            y: event.clientY - nextPosition.y,
        };

        setChatPosition(nextPosition);
        setDragging(true);
    };

    if (!hasHydrated) {
        return null;
    }

    return (
        <>
            <div className="pointer-events-none fixed bottom-4 right-4 z-50">
                <div className="pointer-events-auto flex items-center rounded-full border border-border/80 bg-surface/95 p-1.5 shadow-[0_16px_34px_rgba(8,12,24,0.36)] backdrop-blur">
                    <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-lg text-white shadow-[0_8px_18px_rgba(54,105,187,0.45)] transition hover:bg-accentDark"
                        onClick={showBot ? handleChatClose : handleChatOpen}
                        aria-label={showBot ? 'Close Stone Haven chat' : chatbotLabel}
                    >
                        {showBot ? '×' : '💬'}
                    </button>
                </div>
            </div>

            {showBot ? (
                <ChatPopup
                    chatbotUrl={chatbotUrl}
                    companyPhone={companyPhone}
                    companyEmail={companyEmail}
                    isExternalEmbed={isExternalEmbed}
                    onClose={handleChatClose}
                    onDragStart={handleDragStart}
                    onOpenQuote={handleOpenFormClick}
                    position={chatPosition}
                />
            ) : null}
        </>
    );
}
