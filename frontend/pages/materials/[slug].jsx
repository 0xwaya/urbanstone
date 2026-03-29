import Head from 'next/head';
import Link from 'next/link';

import ChatWidget from '../../components/ChatWidget';
import Footer from '../../components/Footer';
import LeadForm from '../../components/LeadForm';
import RelatedPages from '../../components/RelatedPages';
import TopNav from '../../components/TopNav';
import { getMaterialPageBySlug, materialPages } from '../../data/material-pages';
import { getServiceAreaBySlug, serviceAreas } from '../../data/service-areas';
import { getCanonicalUrl, getSiteUrl } from '../../lib/site';

export default function MaterialPage({ page, area }) {
    const canonicalUrl = getCanonicalUrl(`/materials/${page.slug}`);
    const siteUrl = getSiteUrl();
    const ogImageUrl = `${siteUrl}/brand/amzlogo.png`;
    const faqItems = page.faqItems;
    const relatedMaterialPages = (page.relatedPageSlugs || [])
        .map((slug) => getMaterialPageBySlug(slug))
        .filter(Boolean);
    const siblingCityPages = area.relatedAreas
        .map((relatedArea) => serviceAreas.find((candidate) => candidate.city === relatedArea))
        .filter(Boolean);
    const businessSchema = {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        name: 'Urban Stone Collective',
        legalName: 'Amazon Granite LLC',
        url: canonicalUrl,
        image: ogImageUrl,
        areaServed: [page.city, ...page.nearbyAreas],
        serviceType: [page.materialLabel, 'Countertop fabrication', 'Countertop installation'],
        description: page.metaDescription,
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
                <title>{page.headline} | Urban Stone Collective</title>
                <meta name="description" content={page.metaDescription} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content={`${page.headline} | Urban Stone Collective`} />
                <meta property="og:description" content={page.metaDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content={ogImageUrl} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${page.headline} | Urban Stone Collective`} />
                <meta name="twitter:description" content={page.metaDescription} />
                <meta name="twitter:image" content={ogImageUrl} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            </Head>

            <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
                <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
                    <TopNav />
                    <main>
                        <nav className="flex flex-wrap items-center gap-2 py-5 text-xs uppercase tracking-[0.2em] text-muted sm:text-sm">
                            <Link href="/" className="transition hover:text-text">Home</Link>
                            <span>/</span>
                            <Link href="/coverage" className="transition hover:text-text">Coverage</Link>
                            <span>/</span>
                            <Link href={`/service-areas/${area.slug}`} className="transition hover:text-text">{area.city}</Link>
                            <span>/</span>
                            <span className="text-text">{page.materialLabel}</span>
                        </nav>

                        <section className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:py-12">
                            <div>
                                <div className="eyebrow">Material page</div>
                                <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[0.95] sm:text-5xl md:text-6xl">
                                    {page.headline}
                                </h1>
                                <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                                    {page.intro}
                                </p>
                                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                                    We serve {page.city} and nearby areas like {page.nearbyAreas.join(', ')} with fabrication, install coordination, and slab guidance tailored to {page.material}.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">{page.materialLabel}</span>
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">Local fabrication</span>
                                    <span className="rounded-full border border-border bg-panel px-3 py-1">3-5 day turnaround</span>
                                </div>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <a className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 font-semibold text-white transition hover:bg-accentDark" href="#quote">
                                        Request Estimate
                                    </a>
                                    <Link className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:border-accent" href={`/service-areas/${area.slug}`}>
                                        View {area.city} Service Area Page
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <LeadForm
                                    content={{
                                        title: `Get a ${page.headline} Estimate`,
                                        description: `Send your ${page.material} project details, rough measurements, and timing for ${page.city}, ${page.state}.`,
                                        placeholder: `${page.city} project type, preferred ${page.material}, nearby area, measurements, and timeline.`,
                                        submitLabel: `Request ${page.materialLabel} quote`,
                                        directResponseTitle: `Need a direct response for ${page.city}?`,
                                        coverageText: `We respond to ${page.material} estimate requests in ${page.city}, nearby areas like ${page.nearbyAreas.slice(0, 4).join(', ')}, and the broader greater Cincinnati service area.`,
                                    }}
                                    routeId={`material:${page.slug}`}
                                />
                            </div>
                        </section>

                        <section className="grid gap-6 lg:grid-cols-3">
                            <article className="rounded-3xl border border-border bg-surface/75 p-5 shadow-soft lg:col-span-2">
                                <div className="eyebrow">Best fit</div>
                                <h2 className="font-display text-3xl font-semibold sm:text-4xl">When {page.materialLabel} Makes Sense in {page.city}</h2>
                                <div className="mt-5 space-y-4 text-sm leading-7 text-muted sm:text-base">
                                    <p>
                                        We built this page for people specifically searching for {page.material} in {page.city}. That search usually means the project has already narrowed down to a material family and now needs slab direction, fabrication planning, and a realistic install path.
                                    </p>
                                    <p>
                                        Around {page.city}, this page is most relevant for {page.projectTypes.slice(0, 4).join(', ').toLowerCase()} where the room type, finish level, and install timing matter just as much as the slab itself.
                                    </p>
                                    <p>
                                        We also expect shoppers to compare options across {page.competitorCities.join(', ')}, so this page is tuned for local material intent instead of depending on the broader city page to answer every high-intent search.
                                    </p>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2 text-sm">
                                    {page.bestFor.map((item) => (
                                        <span key={item} className="rounded-full border border-border bg-panel px-3 py-2 text-muted">
                                            {item}
                                        </span>
                                    ))}
                                    {page.projectTypes.map((projectType) => (
                                        <span key={projectType} className="rounded-full border border-border bg-surface px-3 py-2 text-muted">
                                            {projectType}
                                        </span>
                                    ))}
                                </div>
                            </article>

                            <aside className="rounded-3xl border border-border bg-panel p-5 shadow-soft">
                                <div className="eyebrow">Related local path</div>
                                <h2 className="font-display text-2xl font-semibold">Broader coverage around {page.city}</h2>
                                <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                                    Need the broader city page instead of a material-only path? Start with {area.headline.toLowerCase()} and branch back into the coverage hub.
                                </p>
                                <div className="mt-4 space-y-3 text-sm">
                                    <Link href={`/service-areas/${area.slug}`} className="block font-semibold text-text transition hover:text-accent">
                                        {area.headline}
                                    </Link>
                                    <Link href="/coverage" className="block font-semibold text-text transition hover:text-accent">
                                        Cincinnati Coverage Hub
                                    </Link>
                                </div>
                            </aside>
                        </section>

                        <RelatedPages
                            title="Browse Nearby Cities and Similar Search Paths"
                            sections={[
                                {
                                    label: 'Nearby city pages',
                                    links: [
                                        { href: `/service-areas/${area.slug}`, label: area.headline },
                                        ...siblingCityPages.map((cityPage) => ({
                                            href: `/service-areas/${cityPage.slug}`,
                                            label: cityPage.headline,
                                        })),
                                    ],
                                },
                                {
                                    label: 'Related material pages',
                                    links: relatedMaterialPages.map((relatedPage) => ({
                                        href: `/materials/${relatedPage.slug}`,
                                        label: relatedPage.headline,
                                    })),
                                },
                            ]}
                            footerLink={{ href: '/coverage', label: 'View all city and material pages' }}
                        />

                        <section className="mt-10 rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:p-6">
                            <div className="eyebrow">FAQ</div>
                            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Questions About {page.headline}</h2>
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
                            <Link href="/coverage" className="font-semibold text-text transition hover:text-accent">
                                Explore the full Cincinnati coverage hub
                            </Link>
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
        paths: materialPages.map((page) => ({
            params: {
                slug: page.slug,
            },
        })),
        fallback: false,
    };
}

export function getStaticProps({ params }) {
    const page = getMaterialPageBySlug(params.slug);
    const area = getServiceAreaBySlug(page.serviceAreaSlug);

    return {
        props: {
            page,
            area,
        },
    };
}