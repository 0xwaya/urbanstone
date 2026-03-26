import LogoMark from './LogoMark';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function TopNav() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 655-5544';

    return (
        <header className="sticky top-0 z-40 -mx-2 border-b border-transparent bg-bg/80 px-2 py-4 backdrop-blur">
            <nav className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/75 px-4 py-3 shadow-soft">
                <a className="flex items-center gap-3" href="#top" aria-label="Amazon Granite home">
                    <LogoMark />
                    <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-muted">Amazon Granite LLC</div>
                        <div className="font-display text-2xl font-semibold">Countertops with fast turnaround</div>
                    </div>
                </a>

                <div className="hidden items-center gap-6 text-sm font-medium lg:flex">
                    <a className="transition hover:text-accent" href="#suppliers">
                        Stone Library
                    </a>
                    <a className="transition hover:text-accent" href="#quote">
                        Request Quote
                    </a>
                    <a className="transition hover:text-accent" href="#contact">
                        Contact
                    </a>
                </div>

                <div className="flex items-center gap-3">
                    <a className="hidden rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-accent sm:inline-flex" href={`tel:${toTelHref(companyPhone)}`}>
                        {companyPhone}
                    </a>
                    <a className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentDark" href="#quote">
                        Get an Estimate
                    </a>
                </div>
            </nav>
        </header>
    );
}