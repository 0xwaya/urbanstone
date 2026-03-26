function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function ChatWidget() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 655-5544';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@amazongranite.com';

    return (
        <aside className="pointer-events-none fixed bottom-4 right-4 z-50 hidden max-w-xs md:block">
            <div className="pointer-events-auto rounded-3xl border border-border bg-white/90 p-4 shadow-soft backdrop-blur">
                <div className="eyebrow">Fast response</div>
                <div className="font-display text-3xl font-semibold">Need a slab quote today?</div>
                <p className="mt-2 text-sm text-muted">Use the estimate form, call for immediate scheduling, or send photos and dimensions by email.</p>
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