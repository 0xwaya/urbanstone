import { useEffect, useRef, useState } from 'react';
import LogoMark from './LogoMark';

const MAX_MESSAGE_LENGTH = 1200;

const initialMessages = [
    {
        role: 'assistant',
        content: "Hey, I'm Haven. What project can I help you scope today?",
        sources: [],
        contact: null,
    },
];

function renderMessageContent(content) {
    const text = String(content || '');
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const segments = text.split(urlPattern);

    return segments.map((segment, index) => {
        if (/^https?:\/\/[^\s]+$/i.test(segment)) {
            return (
                <a
                    key={`url-${index}`}
                    href={segment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent underline underline-offset-2"
                >
                    {segment}
                </a>
            );
        }

        return <span key={`text-${index}`}>{segment}</span>;
    });
}

function ChatBubble({ message }) {
    const isAssistant = message.role === 'assistant';

    return (
        <div
            className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${isAssistant ? 'border-border bg-surface text-text' : 'border-accent/35 bg-accent/10 text-text'}`.trim()}
        >
            <div className="whitespace-pre-line">{renderMessageContent(message.content)}</div>
        </div>
    );
}

function Composer({
    embedded,
    input,
    isLoading,
    onChange,
    onKeyDown,
    onSubmit,
    characterCount,
    canSend,
}) {
    return (
        <form onSubmit={onSubmit} className="border-t border-border bg-surface/95 p-4">
            <label className="sr-only" htmlFor={embedded ? 'embedded-ai-chat-input' : 'ai-chat-input'}>
                Message Stone Haven
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                    id={embedded ? 'embedded-ai-chat-input' : 'ai-chat-input'}
                    className="form-input min-h-[5.75rem] flex-1 resize-none"
                    placeholder="Type your message..."
                    value={input}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    maxLength={MAX_MESSAGE_LENGTH}
                />
                <button
                    type="submit"
                    className="brand-button-primary self-end px-5 py-3 text-sm font-semibold sm:self-stretch"
                    disabled={!canSend}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span>Enter to send, Shift+Enter for newline</span>
                <span>{characterCount}/{MAX_MESSAGE_LENGTH}</span>
            </div>
        </form>
    );
}

export default function StoneHavenChat({ embedded = false, showHeader = true }) {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [scrollMetrics, setScrollMetrics] = useState({
        hasOverflow: false,
        topPct: 0,
        heightPct: 26,
    });
    const viewportRef = useRef(null);
    const railRef = useRef(null);
    const dragRef = useRef({
        active: false,
        pointerOffsetPx: 0,
    });

    const scrollFromClientY = (clientY, usePointerOffset = false) => {
        const viewport = viewportRef.current;
        const rail = railRef.current;
        if (!viewport || !rail || !scrollMetrics.hasOverflow) {
            return;
        }

        const railRect = rail.getBoundingClientRect();
        const railHeight = railRect.height;
        const thumbHeightPx = (scrollMetrics.heightPct / 100) * railHeight;
        const maxThumbTop = Math.max(railHeight - thumbHeightPx, 1);
        const pointerOffset = usePointerOffset ? dragRef.current.pointerOffsetPx : thumbHeightPx / 2;
        const thumbTopPx = Math.min(
            Math.max(clientY - railRect.top - pointerOffset, 0),
            maxThumbTop
        );

        const maxScroll = Math.max(viewport.scrollHeight - viewport.clientHeight, 1);
        const nextScrollTop = (thumbTopPx / maxThumbTop) * maxScroll;
        viewport.scrollTop = nextScrollTop;
        updateScrollMetrics();
    };

    const updateScrollMetrics = () => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        if (scrollHeight <= clientHeight + 2) {
            setScrollMetrics({
                hasOverflow: false,
                topPct: 0,
                heightPct: 26,
            });
            return;
        }

        const maxScroll = Math.max(scrollHeight - clientHeight, 1);
        const rawHeightPct = (clientHeight / scrollHeight) * 100;
        const minHeightPct = Math.min(32, (20 / Math.max(clientHeight, 1)) * 100);
        const heightPct = Math.max(rawHeightPct, minHeightPct);
        const topPct = (scrollTop / maxScroll) * (100 - heightPct);

        setScrollMetrics({
            hasOverflow: true,
            topPct: Math.max(0, Math.min(topPct, 100 - heightPct)),
            heightPct: Math.max(8, Math.min(heightPct, 100)),
        });
    };

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        const assistants = viewport.querySelectorAll('[data-role="assistant"]');
        const latestAssistant = assistants.length > 0 ? assistants[assistants.length - 1] : null;

        if (latestAssistant && latestAssistant instanceof HTMLElement) {
            const nextTop = Math.max(latestAssistant.offsetTop - 8, 0);
            if (typeof viewport.scrollTo === 'function') {
                viewport.scrollTo({
                    top: nextTop,
                    behavior: 'smooth',
                });
            } else {
                viewport.scrollTop = nextTop;
            }
            return;
        }

        viewport.scrollTop = viewport.scrollHeight;
        updateScrollMetrics();
    }, [messages, isLoading]);

    useEffect(() => {
        updateScrollMetrics();

        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleResize = () => {
            updateScrollMetrics();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleMouseMove = (event) => {
            if (!dragRef.current.active) {
                return;
            }

            event.preventDefault();
            scrollFromClientY(event.clientY, true);
        };

        const handleMouseUp = () => {
            dragRef.current.active = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [scrollMetrics.hasOverflow, scrollMetrics.heightPct]);

    const handleRailMouseDown = (event) => {
        if (!scrollMetrics.hasOverflow) {
            return;
        }

        event.preventDefault();
        const rail = railRef.current;
        if (!rail) {
            return;
        }

        const railRect = rail.getBoundingClientRect();
        const thumbHeightPx = (scrollMetrics.heightPct / 100) * railRect.height;
        dragRef.current.active = true;
        dragRef.current.pointerOffsetPx = thumbHeightPx / 2;
        scrollFromClientY(event.clientY, true);
    };

    const handleThumbMouseDown = (event) => {
        if (!scrollMetrics.hasOverflow) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const thumbRect = event.currentTarget.getBoundingClientRect();
        dragRef.current.active = true;
        dragRef.current.pointerOffsetPx = event.clientY - thumbRect.top;
    };

    const sendMessage = async (event) => {
        event.preventDefault();

        const trimmed = input.trim().slice(0, MAX_MESSAGE_LENGTH);
        if (!trimmed || isLoading) {
            return;
        }

        setMessages((current) => [...current, { role: 'user', content: trimmed, sources: [], contact: null }]);
        setInput('');
        setIsLoading(true);

        const history = messages
            .map((entry) => ({ role: entry.role, content: entry.content }))
            .slice(-14);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed, history }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unable to respond');
            }

            setMessages((current) => [
                ...current,
                {
                    role: 'assistant',
                    content: data.reply,
                    sources: data.sources || [],
                    contact: data.contact || null,
                },
            ]);
        } catch {
            setMessages((current) => [
                ...current,
                {
                    role: 'assistant',
                    content: 'Something interrupted the chat. You can still reach Urban Stone directly and we will route the project manually.',
                    sources: [],
                    contact: {
                        phone: '(513) 307-5840',
                        email: 'sales@urbanstone.co',
                    },
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!isLoading && input.trim()) {
                sendMessage(event);
            }
        }
    };

    const characterCount = input.length;
    const canSend = !isLoading && input.trim().length > 0;

    const chatBody = (
        <>
            <div className="relative min-h-0 flex-1">
                <div ref={viewportRef} className="chat-scrollbar min-h-0 h-full space-y-3 overflow-y-scroll px-4 py-4 pr-6" onScroll={updateScrollMetrics}>
                    {messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} data-role={message.role}>
                            <ChatBubble message={message} />
                        </div>
                    ))}
                    {isLoading ? (
                        <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted" aria-live="polite">
                            Stone Haven is thinking...
                        </div>
                    ) : null}
                </div>
                <div
                    ref={railRef}
                    className="absolute inset-y-4 right-2.5 w-1.5 cursor-ns-resize rounded-full bg-[rgba(54,105,187,0.22)]"
                    onMouseDown={handleRailMouseDown}
                >
                    <div
                        className="absolute left-0 right-0 cursor-grab rounded-full bg-[linear-gradient(180deg,rgba(74,144,226,0.95),rgba(54,105,187,0.98))] shadow-[0_4px_12px_rgba(30,76,145,0.45)] transition-opacity active:cursor-grabbing"
                        onMouseDown={handleThumbMouseDown}
                        style={{
                            top: `${scrollMetrics.topPct}%`,
                            height: `${scrollMetrics.heightPct}%`,
                            opacity: scrollMetrics.hasOverflow ? 1 : 0.42,
                        }}
                    />
                </div>
            </div>
            <Composer
                embedded={embedded}
                input={input}
                isLoading={isLoading}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                onSubmit={sendMessage}
                characterCount={characterCount}
                canSend={canSend}
            />
        </>
    );

    if (embedded) {
        return (
            <div className="flex h-full min-h-0 flex-col bg-bg text-text">
                {showHeader ? (
                    <div className="border-b border-border bg-surface/95 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg border border-border bg-panel/85 p-1">
                                <LogoMark className="h-full w-full" />
                            </div>
                            <div>
                                <div className="text-[12px] font-semibold text-text">Haven</div>
                                <div className="mt-0.5 text-[11px] text-muted">Urban Stone • Live now</div>
                            </div>
                        </div>
                    </div>
                ) : null}
                {chatBody}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-text">
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
                <div className="overflow-hidden rounded-3xl border border-border bg-panel/90 shadow-soft">
                    <header className="border-b border-border px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg border border-border bg-panel/85 p-1">
                                <LogoMark className="h-full w-full" />
                            </div>
                            <div>
                                <div className="text-[12px] font-semibold text-text">Haven</div>
                                <div className="mt-0.5 text-[11px] text-muted">Urban Stone • Live now</div>
                            </div>
                        </div>
                    </header>
                    <div className="flex min-h-[70vh] flex-col">{chatBody}</div>
                </div>
            </div>
        </div>
    );
}
