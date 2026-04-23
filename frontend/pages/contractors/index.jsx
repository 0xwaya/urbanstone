import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';

import CommercialEstimateAssistant from '../../components/CommercialEstimateAssistant';
import ContractorPortalHero from '../../components/ContractorPortalHero';
import Footer from '../../components/Footer';
import TopNav from '../../components/TopNav';
import {
    CONTRACTOR_PROGRAM_NOTES,
    CONTRACTOR_SPECS,
    CONTRACTOR_TIERS,
} from '../../lib/contractor-deals';

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function ContractorPortal() {
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const [expandedTier, setExpandedTier] = useState(CONTRACTOR_TIERS[0]?.name || '');

    return (
        <>
            <Head>
                <title>Contractor Pricing | Urban Stone Collective</title>
                <meta
                    name="description"
                    content="Commercial countertop pricing and rollout planning for Cincinnati and Northern Kentucky contractors, builders, and developers."
                />
                <meta name="robots" content="noindex,nofollow" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
                <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
                    <TopNav />

                    <main className="pb-8">
                        <ContractorPortalHero />

                        <section className="pb-8 sm:pb-10">
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="brand-section rounded-[2rem] p-6 sm:p-7">
                                    <div className="eyebrow">Program fit</div>
                                    <h2 className="font-display text-3xl font-semibold leading-tight sm:text-[2.4rem]">
                                        Structured for repeatable multi-unit installs, not one-off residential quoting.
                                    </h2>
                                    <p className="mt-4 max-w-3xl text-base leading-7 text-muted sm:text-lg">
                                        Use this page when you need pricing direction, production cadence, and a realistic
                                        rollout conversation for apartments, mixed-use projects, hospitality refreshes, and
                                        builder programs.
                                    </p>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-[1.5rem] border border-border bg-panel/75 px-4 py-4">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                                                Best for
                                            </div>
                                            <div className="mt-2 text-sm leading-6 text-text">
                                                3+ units, phased turnovers, and builder-driven schedules.
                                            </div>
                                        </div>
                                        <div className="rounded-[1.5rem] border border-border bg-panel/75 px-4 py-4">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                                                Response
                                            </div>
                                            <div className="mt-2 text-sm leading-6 text-text">
                                                Commercial intake with rollout context instead of a generic quote reply.
                                            </div>
                                        </div>
                                        <div className="rounded-[1.5rem] border border-border bg-panel/75 px-4 py-4">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                                                Material lane
                                            </div>
                                            <div className="mt-2 text-sm leading-6 text-text">
                                                Builder-focused quartz options with dependable lead times and clean installs.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <aside className="brand-section rounded-[2rem] p-6 sm:p-7">
                                    <div className="eyebrow">Program specs</div>
                                    <div className="grid gap-3">
                                        {CONTRACTOR_SPECS.map((spec) => (
                                            <div
                                                key={spec.label}
                                                className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-3"
                                            >
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                                    {spec.label}
                                                </div>
                                                <div className="mt-1.5 text-sm font-medium text-text">{spec.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-5 rounded-[1.5rem] border border-border bg-panel/75 p-4">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                                            Need a direct conversation?
                                        </div>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                            <a
                                                className="brand-button-primary px-4 py-3 text-sm font-semibold"
                                                href={`tel:${toTelHref(companyPhone)}`}
                                            >
                                                Call {companyPhone}
                                            </a>
                                            <a
                                                className="brand-button-secondary inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
                                                href={`mailto:${companyEmail}`}
                                            >
                                                Email sales desk
                                            </a>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </section>

                        <section className="pb-8 sm:pb-10">
                            <CommercialEstimateAssistant
                                tiers={CONTRACTOR_TIERS}
                                collapsible
                                defaultExpanded={false}
                            />
                        </section>

                        <section className="pb-8 sm:pb-10">
                            <div className="brand-section rounded-[2rem] p-5 sm:p-6">
                                <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <div className="eyebrow mb-3">Builder selections</div>
                                        <h2 className="font-display text-3xl font-semibold leading-tight sm:text-[2.35rem]">
                                            Compare the contractor quartz tiers before you scope the rollout.
                                        </h2>
                                        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                                            These are the fast-moving options currently aligned to multi-unit work. Expand
                                            each tier for positioning, application fit, and the next commercial action.
                                        </p>
                                    </div>
                                    <a className="brand-button-primary px-6 py-3 text-sm font-semibold" href="#commercial-estimate">
                                        Scope your project
                                    </a>
                                </div>

                                <div className="mt-5 grid gap-3">
                                    {CONTRACTOR_TIERS.map((tier) => {
                                        const isExpanded = expandedTier === tier.name;

                                        return (
                                            <article key={tier.name} className="brand-card overflow-hidden rounded-[1.7rem]">
                                                <button
                                                    type="button"
                                                    className="flex w-full flex-col gap-4 px-4 py-4 text-left sm:flex-row sm:items-center sm:px-5"
                                                    onClick={() => setExpandedTier((current) => (current === tier.name ? '' : tier.name))}
                                                    aria-expanded={isExpanded}
                                                >
                                                    <div className="relative h-40 w-full overflow-hidden rounded-[1.45rem] border border-border bg-bg sm:h-24 sm:w-32 sm:shrink-0">
                                                        <Image
                                                            src={tier.image}
                                                            alt={tier.name}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, 128px"
                                                            className="object-cover object-center"
                                                            unoptimized
                                                        />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-lg font-semibold text-text sm:text-xl">{tier.name}</h3>
                                                            {tier.badge ? (
                                                                <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                                                                    {tier.badge}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-1 text-sm font-medium text-[#d8c59c]">{tier.tagline}</p>
                                                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{tier.summary}</p>
                                                    </div>

                                                    <div className="sm:text-right">
                                                        <div className="text-2xl font-display font-semibold text-text">{tier.price}</div>
                                                        <div className="text-xs uppercase tracking-[0.18em] text-muted">{tier.unit}</div>
                                                        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                                            {isExpanded ? 'Close details' : 'View details'}
                                                        </div>
                                                    </div>
                                                </button>

                                                {isExpanded ? (
                                                    <div className="border-t border-border/70 px-4 py-4 sm:px-5 sm:py-5">
                                                        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                                                            <div className="grid gap-4 sm:grid-cols-2">
                                                                <div className="rounded-[1.4rem] border border-border bg-surface/80 p-4">
                                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                                                        Why it gets used
                                                                    </div>
                                                                    <p className="mt-2 text-sm leading-6 text-text">
                                                                        {tier.description}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-[1.4rem] border border-border bg-surface/80 p-4">
                                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                                                        Best-fit applications
                                                                    </div>
                                                                    <p className="mt-2 text-sm leading-6 text-text">
                                                                        {tier.applications}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="grid gap-2.5 lg:min-w-[16rem]">
                                                                <a
                                                                    className="brand-button-primary px-4 py-3 text-sm font-semibold"
                                                                    href="#commercial-estimate"
                                                                >
                                                                    Use in estimate assistant
                                                                </a>
                                                                <a
                                                                    className="brand-button-secondary inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
                                                                    href={`mailto:${companyEmail}?subject=${encodeURIComponent(`Contractor pricing - ${tier.name}`)}`}
                                                                >
                                                                    Email about {tier.name}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <section className="pb-4">
                            <div className="brand-section rounded-[2rem] p-5 sm:p-6">
                                <div className="eyebrow">Program notes</div>
                                <div className="grid gap-3 lg:grid-cols-3">
                                    {CONTRACTOR_PROGRAM_NOTES.map((note) => (
                                        <div
                                            key={note}
                                            className="rounded-[1.45rem] border border-border bg-panel/75 px-4 py-4 text-sm leading-6 text-text"
                                        >
                                            {note}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <Footer />
                    </main>
                </div>
            </div>
        </>
    );
}
