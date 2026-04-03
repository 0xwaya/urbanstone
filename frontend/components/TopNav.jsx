import Link from 'next/link';
import LogoMark from './LogoMark';
import ThemeToggle from './ThemeToggle';
import { useState } from 'react';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function TopNav() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 -mx-2 overflow-x-clip border-b border-transparent bg-bg/80 px-2 py-2 backdrop-blur sm:py-3">
            <nav className="top-nav-shell rounded-2xl border border-border px-3 py-2.5 shadow-soft sm:px-4 sm:py-3">
                <div className="flex items-center gap-2 sm:gap-3">
                    <a className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5" href="#top" aria-label="Urban Stone Collective home">
                        <LogoMark className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
                        <div className="min-w-0">
                            <div className="nav-brand-wrap">
                                <div className="nav-brand-wordmark">
                                    <span className="nav-brand-primary">Urban Stone</span>
                                    <span className="nav-brand-secondary">Collective</span>
                                </div>
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
                        <a
                            className="brand-button-primary px-4 py-2 text-sm font-semibold"
                            href={`tel:${toTelHref(companyPhone)}`}
                            aria-label={`Call Urban Stone Collective at ${companyPhone}`}
                        >
                            Call
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
                        <div className="rounded-[1.5rem] border border-border/80 bg-surface/75 p-3 shadow-soft">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Menu</div>
                            <a className="brand-button-primary mt-3 w-full px-4 py-3 text-base font-semibold" href="#quote" onClick={() => setIsMenuOpen(false)}>
                                Get an Estimate
                            </a>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <a className="brand-menu-tile rounded-xl px-3 py-2.5 text-center" href="#suppliers" onClick={() => setIsMenuOpen(false)}>
                                    Materials
                                </a>
                                <Link className="brand-menu-tile rounded-xl px-3 py-2.5 text-center" href="/coverage" onClick={() => setIsMenuOpen(false)}>
                                    Service Areas
                                </Link>
                                <a className="brand-menu-tile rounded-xl px-3 py-2.5 text-center" href="#faq" onClick={() => setIsMenuOpen(false)}>
                                    Q&amp;A
                                </a>
                            </div>
                        </div>

                        <div className="mt-4 rounded-[1.75rem] border border-border bg-surface/80 p-4 shadow-soft">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Direct contact</div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <a
                                    className="brand-button-primary px-4 py-3 text-base font-semibold"
                                    href={`tel:${toTelHref(companyPhone)}`}
                                    aria-label={`Call Urban Stone Collective at ${companyPhone}`}
                                >
                                    Call
                                </a>
                                <a
                                    className="brand-button-secondary inline-flex items-center justify-center rounded-full px-4 py-3 text-base font-semibold"
                                    href={`mailto:${companyEmail}`}
                                    aria-label={`Email Urban Stone Collective at ${companyEmail}`}
                                >
                                    Email
                                </a>
                            </div>
                        </div>
                        <div className="mt-3 border-t border-border/80 pt-3 flex justify-start">
                            <ThemeToggle />
                        </div>
                    </div>
                ) : null}
            </nav>
        </header>
    );
}   