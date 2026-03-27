import Head from 'next/head';
import Link from 'next/link';

import TopNav from '../../components/TopNav';
import LeadForm from '../../components/LeadForm';
import Footer from '../../components/Footer';
import ChatWidget from '../../components/ChatWidget';
import RelatedPages from '../../components/RelatedPages';
import { materialPages } from '../../data/material-pages';
import { getCanonicalUrl, getSiteUrl } from '../../lib/site';
import { getServiceAreaBySlug, serviceAreas } from '../../data/service-areas';

export default function ServiceAreaPage({ area }) {
    const canonicalUrl = getCanonicalUrl(`/service-areas/${area.slug}`);
    const siteUrl = getSiteUrl();
    const ogImageUrl = `${siteUrl}/brand/amazonlogo.png`;
    const faqItems = area.faqItems;
    const relatedServiceAreas = area.relatedAreas
        .map((relatedArea) => serviceAreas.find((candidate) => candidate.city === relatedArea))
        .filter(Boolean);
    const relatedMaterialPages = materialPages.filter((page) => page.serviceAreaSlug === area.slug);
    const relatedMaterialRecommendations = relatedMaterialPages
        .flatMap((page) => (page.relatedPageSlugs || []).map((slug) => materialPages.find((candidate) => candidate.slug === slug)))
        .filter(Boolean)
        .filter((page, index, pages) => pages.findIndex((candidate) => candidate.slug === page.slug) === index)
        .slice(0, 4);
    const relatedMaterialLinks = [...relatedMaterialPages, ...relatedMaterialRecommendations]
        .filter((page, index, pages) => pages.findIndex((candidate) => candidate.slug === page.slug) === index)
        .map((page) => ({
            href: `/materials/${page.slug}`,
            label: page.headline,
        }));
    const localBusinessSchema = {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        name: 'Urban Stone Collective',
        legalName: 'Amazon Granite LLC',
        url: canonicalUrl,
        image: ogImageUrl,
        areaServed: [area.city, ...area.nearbyAreas, ...area.relatedAreas],
        serviceType: ['Quartz countertops', 'Granite countertops', 'Quartzite countertops', 'Countertop fabrication', 'Countertop installation'],
        description: area.metaDescription,
    };
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };

    return (
        <>
            <Head>
                <title>{area.headline} | Urban Stone Collective</title>
                <meta name="description" content={area.metaDescription} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content={`${area.headline} | Urban Stone Collective`} />
                <meta property="og:description" content={area.metaDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content={ogImageUrl} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${area.headline} | Urban Stone Collective`} />
                <meta name="twitter:description" content={area.metaDescription} />
                <meta name="twitter:image" content={ogImageUrl} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            </Head>

            <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
                <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
                    <TopNav />
                    <main>
                        <section className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:py-12">
                            <div>
                                <div className="eyebrow">Service area page</div>
                                <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[0.95] sm:text-5xl md:text-6xl">
                                    {area.headline}
                                </h1>
                                <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                                    {area.intro}
                                </p>
                                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                                    We typically serve projects within roughly 50 miles of downtown Cincinnati, including {area.nearbyAreas.join(', ')}.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">Quartz countertops</span>
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">Granite countertops</span>
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">Quartzite countertops</span>
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">3-5 day turnaround</span>
                                </div>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <a className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 font-semibold text-white transition hover:bg-accentDark" href="#quote">
                                        Request Estimate
                                    </a>
                                    <Link className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:border-accent" href="/#suppliers">
                                        View Materials
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <LeadForm
                                    content={{
                                        title: `Get a ${area.city} Countertop Estimate`,
                                        description: `Send your ${area.city} project details, preferred material, and timing for quartz countertops, granite countertops, or quartzite countertops in ${area.city} and nearby areas.`,
                                        placeholder: `Project type in ${area.city}, preferred material, neighborhood or nearby area, measurements, and target timeline.`,
                                        submitLabel: `Request ${area.city} estimate`,
                                        directResponseTitle: `Need a direct response in ${area.city}?`,
                                        coverageText: `We respond to estimate requests in ${area.city}, nearby areas like ${area.nearbyAreas.slice(0, 4).join(', ')}, and the broader greater Cincinnati service area.`,
                                    }}
                                    routeId={`service-area:${area.slug}`}
                                />
                            </div>
                        </section>

                        <section id="suppliers" className="grid gap-6 lg:grid-cols-3">
                            <article className="rounded-3xl border border-border bg-surface/75 p-5 shadow-soft lg:col-span-2">
                                <div className="eyebrow">Materials we install</div>
                                <h2 className="font-display text-3xl font-semibold sm:text-4xl">Countertop Options for {area.city} Projects</h2>
                                <div className="mt-5 space-y-4 text-sm leading-7 text-muted sm:text-base">
                                    <p>
                                        Quartz countertops are often the first choice for busy kitchens because they offer a clean look, broad color range, and easier maintenance.
                                        Granite countertops remain a strong fit for natural-stone buyers who want slab variation and classic depth. Quartzite countertops are ideal when the project needs a more elevated natural-stone statement.
                                    </p>
                                    <p>
                                        In {area.city}, we most often quote {area.projectTypes.slice(0, 4).join(', ').toLowerCase()} where the project already knows the room priority and now needs the right slab direction, fabrication plan, and install timing.
                                    </p>
                                    <p>
                                        Clients also compare bids across nearby markets like {area.competitorCities.join(', ')}, so this page is built to hold its own for local countertop intent instead of relying on the Cincinnati homepage to rank for every adjacent city.
                                    </p>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2 text-sm">
                                    {area.projectTypes.map((projectType) => (
                                        <span key={projectType} className="rounded-full border border-border bg-panel px-3 py-2 text-muted">
                                            {projectType}
                                        </span>
                                    ))}
                                </div>
                            </article>

                            <aside className="rounded-3xl border border-border bg-panel p-5 shadow-soft">
                                <div className="eyebrow">Nearby coverage</div>
                                <h2 className="font-display text-2xl font-semibold">Also serving nearby areas</h2>
                                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                                    {relatedServiceAreas.map((relatedArea) => (
                                        <Link
                                            key={relatedArea.slug}
                                            href={`/service-areas/${relatedArea.slug}`}
                                            className="rounded-full border border-border bg-surface/80 px-3 py-2 text-muted transition hover:border-accent hover:text-text"
                                        >
                                            {relatedArea.city}
                                        </Link>
                                    ))}
                                    {area.relatedAreas
                                        .filter((relatedArea) => !relatedServiceAreas.find((candidate) => candidate.city === relatedArea))
                                        .map((relatedArea) => (
                                            <span key={relatedArea} className="rounded-full border border-border bg-surface/80 px-3 py-2 text-muted">
                                                {relatedArea}
                                            </span>
                                        ))}
                                </div>
                                {relatedMaterialPages.length > 0 ? (
                                    <div className="mt-5 border-t border-border pt-5">
                                        <div className="text-xs uppercase tracking-[0.24em] text-muted">Material pages for {area.city}</div>
                                        <div className="mt-3 grid gap-2 text-sm">
                                            {relatedMaterialPages.map((page) => (
                                                <Link key={page.slug} href={`/materials/${page.slug}`} className="font-semibold text-text transition hover:text-accent">
                                                    {page.headline}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </aside>
                        </section>

                        <RelatedPages
                            title="Browse Nearby Cities and Related Material Paths"
                            sections={[
                                {
                                    label: 'Nearby city pages',
                                    links: [
                                        { href: `/service-areas/${area.slug}`, label: area.headline },
                                        ...relatedServiceAreas.map((relatedArea) => ({
                                            href: `/service-areas/${relatedArea.slug}`,
                                            label: relatedArea.headline,
                                        })),
                                    ],
                                },
                                {
                                    label: 'Material pages',
                                    links: relatedMaterialLinks,
                                },
                            ]}
                            footerLink={{ href: '/coverage', label: 'View all city and material pages' }}
                        />

                        <section className="mt-10 rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:p-6">
                            <div className="eyebrow">FAQ</div>
                            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Questions We Hear in {area.city}</h2>
                            <div className="mt-6 space-y-4">
                                {faqItems.map((item) => (
                                    <article key={item.question} className="rounded-2xl border border-border bg-panel/70 p-4 sm:p-5">
                                        <h3 className="text-lg font-semibold text-text sm:text-xl">{item.question}</h3>
                                        <p className="mt-2 text-sm leading-7 text-muted sm:text-base">{item.answer}</p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="mt-10 text-sm leading-7 text-muted">
                            <div className="flex flex-wrap gap-4">
                                <Link href="/" className="font-semibold text-text transition hover:text-accent">
                                    Return to the main Cincinnati countertop page
                                </Link>
                                <Link href="/coverage" className="font-semibold text-text transition hover:text-accent">
                                    Browse the full coverage hub
                                </Link>
                            </div>
                        </section>

                        <Footer />
                    </main>
                </div>

                <ChatWidget />
            </div>
        </>
    );
}

export function getStaticPaths() {
    return {
        paths: serviceAreas.map((area) => ({
            params: {
                slug: area.slug,
            },
        })),
        fallback: false,
    };
}

export function getStaticProps({ params }) {
    const area = getServiceAreaBySlug(params.slug);

    return {
        props: {
            area,
        },
    };
}