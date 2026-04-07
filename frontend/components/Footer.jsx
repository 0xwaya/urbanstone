import Link from 'next/link';

const INSTAGRAM_FALLBACK = 'https://www.instagram.com/';
const FACEBOOK_FALLBACK = 'https://www.facebook.com/';
const TIKTOK_FALLBACK = 'https://www.tiktok.com/';
const WAYALABS_FALLBACK = 'https://wayalabs.com';

function SocialIcon({ children, href, label }) {
    return (
        <a
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/80 text-text transition hover:-translate-y-0.5 hover:border-accent hover:text-accent sm:h-11 sm:w-11"
            href={href}
            aria-label={label}
            target="_blank"
            rel="noreferrer"
        >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                {children}
            </svg>
        </a>
    );
}

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const instagramUrl = (process.env.NEXT_PUBLIC_INSTAGRAM_URL || INSTAGRAM_FALLBACK).trim();
    const facebookUrl = (process.env.NEXT_PUBLIC_FACEBOOK_URL || FACEBOOK_FALLBACK).trim();
    const tiktokUrl = (process.env.NEXT_PUBLIC_TIKTOK_URL || TIKTOK_FALLBACK).trim();
    const wayaLabsUrl = (process.env.NEXT_PUBLIC_WAYALABS_URL || WAYALABS_FALLBACK).trim();

    return (
        <footer className="mt-12 border-t border-border/70 pb-7 pt-7 sm:mt-14 sm:pb-8 sm:pt-8">
            <div className="footer-panel rounded-[1.75rem] border border-border bg-surface/70 px-4 py-5 shadow-soft backdrop-blur sm:px-5 sm:py-6">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-[36rem]">
                            <div className="eyebrow">Urban Stone Collective</div>
                            <div className="font-display text-[1.42rem] font-semibold leading-[0.98] sm:text-[1.78rem]">
                                Cleaner installs, faster decisions, and curated slab sourcing across greater Cincinnati.
                            </div>
                            <p className="mt-2 max-w-[31rem] text-sm leading-6 text-muted">
                                Urban Stone Collective serves homeowners, remodelers, and builders with curated slabs, fabrication, and installation across greater Cincinnati.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5 lg:justify-end">
                            <Link href="/coverage" className="inline-flex items-center justify-center rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-semibold text-text transition hover:border-accent hover:text-accent">
                                Service areas
                            </Link>
                            <Link href="/contractors/login" className="inline-flex items-center justify-center rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-semibold text-text transition hover:border-accent hover:text-accent">
                                Contractor portal
                            </Link>
                            <Link href="/#quote" className="brand-button-primary px-4 py-2 text-sm font-semibold">
                                Request estimate
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                            <SocialIcon href={instagramUrl} label="Instagram">
                                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                                <circle cx="12" cy="12" r="4" />
                                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                            </SocialIcon>

                            <SocialIcon href={facebookUrl} label="Facebook">
                                <path d="M14.5 7.5h2V4.2c-.35-.05-1.55-.2-2.98-.2-2.95 0-4.97 1.8-4.97 5.1v2.9H5.5v3.7h3.05V20h3.75v-4.3h3.02l.48-3.7h-3.5V9.45c0-1.07.3-1.95 2.2-1.95Z" fill="currentColor" stroke="none" />
                            </SocialIcon>

                            <SocialIcon href={tiktokUrl} label="TikTok">
                                <path d="M14.8 4.5c.4 1.35 1.23 2.4 2.7 3.1 1 .48 1.95.65 2.55.7v3.1a8.2 8.2 0 0 1-5.3-1.83v4.72c0 3.45-2.65 5.96-6.18 5.96-3.4 0-6.07-2.67-6.07-6 0-3.55 2.86-6.17 6.43-5.97v3.2a2.7 2.7 0 0 0-1-.18c-1.5 0-2.72 1.2-2.72 2.85 0 1.52 1.1 2.83 2.8 2.83 1.58 0 2.8-1.08 2.8-3.38V4.5h2.99Z" fill="currentColor" stroke="none" />
                            </SocialIcon>
                        </div>

                        <div className="text-sm leading-6 text-muted sm:text-right">
                            <div>&copy; {currentYear} Urban Stone Collective.</div>
                            <div className="mt-1">
                                Built by{' '}
                                <a className="font-semibold text-text transition hover:text-accent" href={wayaLabsUrl} target="_blank" rel="noreferrer">
                                    WayaLabs
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}