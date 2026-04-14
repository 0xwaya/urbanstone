import { useState } from 'react';

const initialMessages = [
    {
        role: 'assistant',
        content: 'Hi! I’m HavenBot, your countertop and surfaces assistant. Tell me about your project, location, and material preference, and I’ll guide you fast.',
    },
];

export default function AiChatPage() {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (event) => {
        event.preventDefault();

        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const nextMessages = [...messages, { role: 'user', content: trimmed }];
        setMessages(nextMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unable to respond');
            }

            const assistantMessage = {
                role: 'assistant',
                content: data.reply,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry—something went wrong. You can still reach us at sales@urbanstone.co.',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
                <header className="mb-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HavenBot</p>
                    <h1 className="mt-2 text-3xl font-semibold">Countertop & surfaces guidance, fast.</h1>
                    <p className="mt-2 text-sm text-slate-300">
                        Ask HavenBot about materials, timing, service areas, or how to get a quick estimate.
                    </p>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
                    {messages.map((message, index) => (
                        <div
                            key={`${message.role}-${index}`}
                            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'assistant'
                                    ? 'bg-slate-800/80 text-slate-100'
                                    : 'bg-white text-slate-900'
                                }`}
                        >
                            {message.content}
                        </div>
                    ))}
                    {isLoading ? (
                        <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm text-slate-200">Thinking…</div>
                    ) : null}
                </div>

                <form onSubmit={sendMessage} className="mt-4 flex gap-3">
                    <input
                        className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                        placeholder="Tell us about your project…"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                    />
                    <button
                        type="submit"
                        className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900"
                        disabled={isLoading}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
