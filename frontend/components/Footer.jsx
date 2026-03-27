import Link from 'next/link';

import { materialPages } from '../data/material-pages';
import { serviceAreas } from '../data/service-areas';

const INSTAGRAM_FALLBACK = 'https://www.instagram.com/amazongranite';
const FACEBOOK_FALLBACK = 'https://www.facebook.com/amazongranitellc/';
const TIKTOK_FALLBACK = 'https://www.tiktok.com/@urbanstoneco';
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
    const footerServiceAreas = serviceAreas.slice(0, 6);

    return (
        <footer className="mt-14 border-t border-border/80 pb-8 pt-8 sm:mt-16 sm:pt-10">
            <div className="footer-panel rounded-[2rem] border border-border bg-surface/70 px-5 py-6 shadow-soft backdrop-blur sm:px-6 sm:py-7">
                <div className="flex flex-col gap-8">
                    <div className="grid gap-6 rounded-[1.6rem] border border-border bg-panel/60 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                        <div>
                            <div className="eyebrow">Coverage hub</div>
                            <div className="mt-2 text-xl font-semibold text-text">Explore city and material pages</div>
                            <p className="mt-3 max-w-[26rem] text-sm leading-7 text-muted">
                                Use the coverage hub to browse service areas and material pages without crowding the main landing page.
                            </p>
                            <Link href="/coverage" className="mt-4 inline-flex font-semibold text-text transition hover:text-accent">
                                Open coverage hub
                            </Link>
                        </div>

                        <div>
                            <div className="text-xs uppercase tracking-[0.24em] text-muted">Top city pages</div>
                            <div className="mt-4 grid gap-2 text-sm">
                                {footerServiceAreas.map((area) => (
                                    <Link key={area.slug} href={`/service-areas/${area.slug}`} className="font-semibold text-text transition hover:text-accent">
                                        {area.city}, {area.state}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs uppercase tracking-[0.24em] text-muted">Material pages</div>
                            <div className="mt-4 grid gap-2 text-sm">
                                {materialPages.map((page) => (
                                    <Link key={page.slug} href={`/materials/${page.slug}`} className="font-semibold text-text transition hover:text-accent">
                                        {page.headline}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-[34rem]">
                            <div className="eyebrow">Urban Stone Collective</div>
                            <div className="font-display text-[1.72rem] font-semibold leading-[0.95] sm:text-[2.15rem]">
                                Built for fast countertop decisions and cleaner installs across greater Cincinnati.
                            </div>
                            <p className="mt-3 max-w-[32rem] text-sm leading-7 text-muted sm:text-base">
                                Urban Stone Collective is the new DBA for Amazon Granite LLC, continuing the same countertop sourcing, fabrication, and installation service across greater Cincinnati and Northern Kentucky.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 md:items-end">
                            <div className="flex items-center gap-3">
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

                            <div className="text-sm leading-7 text-muted md:text-right">
                                <div>
                                    &copy; {currentYear} Amazon Granite LLC, doing business as Urban Stone Collective. All rights reserved.
                                </div>
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
            </div>
        </footer>
    );
}