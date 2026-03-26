import LogoMark from './LogoMark';
import ThemeToggle from './ThemeToggle';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function TopNav() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';

    return (
        <header className="sticky top-0 z-40 -mx-2 border-b border-transparent bg-bg/80 px-2 py-3 backdrop-blur">
            <nav className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/85 px-3 py-3 shadow-soft sm:gap-4 sm:px-4">
                <a className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3" href="#top" aria-label="Amazon Granite home">
                    <LogoMark className="h-9 w-9 sm:h-12 sm:w-12" />
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted sm:text-xs">Amazon Granite LLC</div>
                        <div className="font-display text-xl font-semibold leading-[1.05] sm:text-2xl">Countertops with fast turnaround</div>
                    </div>
                </a>

                <div className="hidden items-center gap-6 text-sm font-medium lg:flex">
                    <a className="transition hover:text-accent" href="#suppliers">
                        Materials
                    </a>
                    <a className="transition hover:text-accent" href="#quote">
                        Request Quote
                    </a>
                    <a className="transition hover:text-accent" href="#contact">
                        Contact
                    </a>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <ThemeToggle />
                    <a className="hidden rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-accent sm:inline-flex" href={`tel:${toTelHref(companyPhone)}`}>
                        {companyPhone}
                    </a>
                    <a className="inline-flex rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accentDark sm:px-4 sm:text-sm" href="#quote">
                        Get an Estimate
                    </a>
                </div>
            </nav>
        </header>
    );
}