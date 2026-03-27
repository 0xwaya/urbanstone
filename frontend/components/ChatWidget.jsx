import { useState } from 'react';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(true);
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';

    if (!isOpen) {
        return null;
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
                        onClick={() => setIsOpen(false)}
                    >
                        ×
                    </button>
                </div>
                <p className="mt-2 text-sm text-muted">Use the estimate form, call for scheduling, or send photos, measurements, and layout details by email.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <a className="inline-flex rounded-full bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accentDark" href="#quote">
                        Open form
                    </a>
                    <a className="inline-flex rounded-full border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-accent" href={`tel:${toTelHref(companyPhone)}`}>
                        Call
                    </a>
                    <a className="inline-flex rounded-full border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-accent" href={`mailto:${companyEmail}`}>
                        Email
                    </a>
                </div>
            </div>
        </aside>
    );
}