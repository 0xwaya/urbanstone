import LogoMark from './LogoMark';
import ThemeToggle from './ThemeToggle';
import { useState } from 'react';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function TopNav() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 -mx-2 overflow-x-clip border-b border-transparent bg-bg/80 px-2 py-3 backdrop-blur">
            <nav className="rounded-2xl border border-border bg-surface/85 px-3 py-3 shadow-soft sm:px-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    <a className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3" href="#top" aria-label="Amazon Granite home">
                        <LogoMark className="h-9 w-9 shrink-0 sm:h-12 sm:w-12" />
                        <div className="min-w-0">
                            <div className="nav-brand-wrap">
                                <div className="nav-brand-wordmark">
                                    <span className="nav-brand-amazon">Amazon</span>{' '}
                                    <span className="nav-brand-granite">Granite</span>
                                </div>
                                <span className="nav-brand-badge">LLC</span>
                            </div>
                            <div className="hidden font-display text-xl font-semibold leading-[1.05] sm:text-2xl">Countertops with fast turnaround</div>
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

                    <div className="hidden shrink-0 items-center gap-3 lg:flex">
                        <ThemeToggle />
                        <a className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-accent" href={`tel:${toTelHref(companyPhone)}`}>
                            {companyPhone}
                        </a>
                    </div>

                    <button
                        type="button"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-panel/70 text-text transition hover:border-accent hover:text-accent lg:hidden"
                        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={isMenuOpen}
                        onClick={() => setIsMenuOpen((current) => !current)}
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            {isMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                        </svg>
                    </button>
                </div>

                {isMenuOpen ? (
                    <div className="mt-3 rounded-2xl border border-border bg-panel/70 p-3 lg:hidden">
                        <div className="flex flex-col gap-2 text-sm font-medium text-text">
                            <a className="rounded-xl px-3 py-2 transition hover:bg-surface/80 hover:text-accent" href="#suppliers" onClick={() => setIsMenuOpen(false)}>
                                Materials
                            </a>
                            <a className="rounded-xl bg-accent px-3 py-2 font-semibold text-white transition hover:bg-accentDark" href="#quote" onClick={() => setIsMenuOpen(false)}>
                                Get an Estimate
                            </a>
                            <a className="rounded-xl px-3 py-2 transition hover:bg-surface/80 hover:text-accent" href="#contact" onClick={() => setIsMenuOpen(false)}>
                                Contact
                            </a>
                            <a className="rounded-xl px-3 py-2 transition hover:bg-surface/80 hover:text-accent" href={`tel:${toTelHref(companyPhone)}`}>
                                {companyPhone}
                            </a>
                        </div>
                        <div className="mt-3 flex justify-start">
                            <ThemeToggle />
                        </div>
                    </div>
                ) : null}
            </nav>
        </header>
    );
}