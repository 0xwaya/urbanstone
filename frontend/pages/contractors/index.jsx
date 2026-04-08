import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import CommercialEstimateAssistant from '../../components/CommercialEstimateAssistant';
import { CONTRACTOR_PROGRAM_NOTES, CONTRACTOR_SPECS, CONTRACTOR_TIERS } from '../../lib/contractor-deals';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function ContractorPortal() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const [expandedTier, setExpandedTier] = useState('');

    return (
        <>
            <Head>
                <title>Contractor Pricing — Urban Stone</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <TopNav />

            <main className="bg-bg min-h-screen text-text">
                <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-18">
                    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                        <div className="rounded-[2.2rem] border border-border bg-surface/90 px-6 py-6 shadow-soft sm:px-8 sm:py-8">
                            <p className="eyebrow mb-4">Contractor Program</p>
                            <h1 className="max-w-4xl text-3xl font-display font-semibold leading-tight sm:text-4xl lg:text-[3rem]">
                                Commercial countertop rollout pricing, schedule planning, and estimate intake in one protected portal.
                            </h1>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                                Built for apartment developers, hospitality builders, mixed-use teams, and office contractors who need clear curated pricing plus a faster way to scope phased fabrication and installation work.
                            </p>
                            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-xs text-muted sm:text-sm">
                                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-2">
                                    <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                                    Installed pricing
                                </span>
                                <span className="inline-flex items-center rounded-full border border-border bg-panel px-3 py-2">
                                    3+ unit minimum
                                </span>
                                <span className="inline-flex items-center rounded-full border border-border bg-panel px-3 py-2">
                                    Commercial estimate assistant
                                </span>
                                <span className="inline-flex items-center rounded-full border border-border bg-panel px-3 py-2">
                                    Volume rates for 10+ units
                                </span>
                            </div>
                        </div>

                        <div className="rounded-[2.2rem] border border-border bg-panel/90 p-5 shadow-soft sm:p-6">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Program snapshot</div>
                            <div className="mt-4 grid gap-3">
                                <div className="rounded-2xl border border-border bg-surface/75 px-4 py-4">
                                    <div className="text-xs uppercase tracking-[0.16em] text-muted">Best fit</div>
                                    <div className="mt-2 text-sm leading-6 text-text">Apartment unit turns, phased new construction, hospitality refreshes, and multi-building office schedules.</div>
                                </div>
                                <div className="rounded-2xl border border-border bg-surface/75 px-4 py-4">
                                    <div className="text-xs uppercase tracking-[0.16em] text-muted">What changes pricing</div>
                                    <div className="mt-2 text-sm leading-6 text-text">Access constraints, unit velocity, demolition complexity, amenity spaces, and timeline compression.</div>
                                </div>
                                <a
                                    className="brand-button-primary px-5 py-3 text-center text-sm font-semibold"
                                    href="#commercial-estimate"
                                >
                                    Start commercial estimate intake
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-12">
                    <CommercialEstimateAssistant tiers={CONTRACTOR_TIERS} />
                </section>

                <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-12">
                    <div className="rounded-[2rem] border border-border bg-surface/85 p-3 shadow-soft sm:p-4">
                        <div className="mb-4 flex items-center justify-between px-2 sm:px-3">
                            <div>
                                <h2 className="text-lg font-semibold text-text sm:text-xl">Curated material lineup</h2>
                                <p className="mt-1 text-sm text-muted">Open any material card for fast pricing context, then feed the assistant the rollout variables that change the final number.</p>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            {CONTRACTOR_TIERS.map((tier) => {
                                const isExpanded = expandedTier === tier.name;

                                return (
                                    <article
                                        key={tier.name}
                                        className="overflow-hidden rounded-[1.5rem] border border-border bg-panel/80 transition hover:border-accent/50"
                                    >
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                                            onClick={() => setExpandedTier((current) => (current === tier.name ? '' : tier.name))}
                                            aria-expanded={isExpanded}
                                        >
                                            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-bg sm:h-24 sm:w-28">
                                                <Image
                                                    src={tier.image}
                                                    alt={tier.name}
                                                    fill
                                                    className="object-cover object-center scale-110"
                                                    sizes="112px"
                                                    unoptimized
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-semibold text-text sm:text-lg">{tier.name}</h3>
                                                    {tier.badge ? (
                                                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
                                                            {tier.badge}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-1 text-sm text-muted">{tier.summary}</p>
                                                <div className="mt-2 flex items-end gap-1">
                                                    <span className="text-2xl font-display font-semibold text-text">{tier.price}</span>
                                                    <span className="mb-0.5 text-xs text-muted sm:text-sm">{tier.unit}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                                                {isExpanded ? 'Close' : 'Expand'}
                                            </div>
                                        </button>

                                        {isExpanded ? (
                                            <div className="border-t border-border/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                                                <div className="rounded-[1.5rem] border border-border bg-surface/80 p-4">
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Quick action</div>
                                                    <a
                                                        className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                                                        href={`mailto:${companyEmail}?subject=${encodeURIComponent(`Contractor pricing - ${tier.name}`)}`}
                                                    >
                                                        Email about {tier.name}
                                                    </a>
                                                    <a
                                                        className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-border bg-panel px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent hover:text-accent"
                                                        href={`#commercial-estimate`}
                                                    >
                                                        Scope this material in the assistant
                                                    </a>
                                                </div>
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-12">
                    <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
                        <div className="rounded-[2rem] border border-border bg-surface/85 p-6 shadow-soft sm:p-8">
                            <h2 className="mb-5 text-lg font-semibold text-text">Standard specifications</h2>
                            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                                {CONTRACTOR_SPECS.map(spec => (
                                    <div key={spec.label}>
                                        <p className="mb-1 text-xs uppercase tracking-wider text-muted">{spec.label}</p>
                                        <p className="text-sm font-medium text-text">{spec.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-border bg-panel/90 p-6 shadow-soft">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Program notes</div>
                            <div className="mt-4 space-y-3">
                                {CONTRACTOR_PROGRAM_NOTES.map((note) => (
                                    <p key={note} className="text-sm leading-6 text-muted">
                                        {note}
                                    </p>
                                ))}
                            </div>
                            <div className="mt-5 rounded-2xl border border-border bg-surface/75 px-4 py-4 text-sm leading-6 text-text">
                                Best first message format: unit count, start date, weekly pace, preferred tier, and completion target.
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
                    <div className="rounded-[2rem] border border-border bg-panel/90 p-5 shadow-soft sm:p-6">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Direct inquiries</div>
                        <h2 className="mt-3 text-xl font-semibold text-text">Need a fast contractor answer?</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">
                            Use the assistant for structured intake, then move to direct contact for addenda, revised scope, amenity packages, or site walks.
                        </p>
                        <div className="mt-5 grid gap-3">
                            <a
                                className="brand-button-primary px-5 py-3 text-center text-sm font-semibold"
                                href={`mailto:${companyEmail}?subject=Contractor%20Program%20Inquiry`}
                            >
                                Email {companyEmail}
                            </a>
                            <a
                                className="brand-button-secondary inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                                href={`sms:${toTelHref(companyPhone)}`}
                            >
                                Text {companyPhone}
                            </a>
                        </div>
                        <div className="mt-5 border-t border-border/70 pt-4 text-xs leading-6 text-muted">
                            Ops note: every new contractor registration now triggers a direct admin notification and structured webhook event for downstream mailing-list sync.
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
