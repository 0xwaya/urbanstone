import Head from 'next/head';
import Link from 'next/link';

import ChatWidget from '../../components/ChatWidget';
import Footer from '../../components/Footer';
import TopNav from '../../components/TopNav';
import { materialPages } from '../../data/material-pages';
import { serviceAreas } from '../../data/service-areas';
import { getCanonicalUrl, getSiteUrl } from '../../lib/site';
import { buildBreadcrumbSchema, getGeoRegion } from '../../lib/seo';

export default function CoverageHubPage() {
    const canonicalUrl = getCanonicalUrl('/coverage');
    const ogImageUrl = `${getSiteUrl()}/api/og-image`;
    const ogImageWidth = '1200';
    const ogImageHeight = '630';
    const ogImageType = 'image/png';
    const coverageSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Urban Stone Collective Coverage Hub',
        url: canonicalUrl,
        description: 'Coverage hub for Cincinnati-area quartz countertops, granite countertops, quartzite countertops, city pages, and material landing pages.',
        hasPart: [
            ...serviceAreas.map((area) => ({
                '@type': 'WebPage',
                name: area.headline,
                url: getCanonicalUrl(`/service-areas/${area.slug}`),
            })),
            ...materialPages.map((page) => ({
                '@type': 'WebPage',
                name: page.headline,
                url: getCanonicalUrl(`/materials/${page.slug}`),
            })),
        ],
    };
    const breadcrumbSchema = buildBreadcrumbSchema([
        { name: 'Home', url: getCanonicalUrl('/') },
        { name: 'Coverage Hub', url: canonicalUrl },
    ]);

    return (
        <>
            <Head>
                <title>Cincinnati Coverage Hub | Urban Stone Collective</title>
                <meta
                    name="description"
                    content="Explore Cincinnati-area city pages and material pages for quartz countertops, granite countertops, and quartzite countertops from Urban Stone Collective."
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
                <meta name="geo.region" content={getGeoRegion('OH')} />
                <meta name="geo.placename" content="Cincinnati" />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content="Cincinnati Coverage Hub | Urban Stone Collective" />
                <meta
                    property="og:description"
                    content="Internal hub for Cincinnati-area countertop city pages and material-specific landing pages."
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:site_name" content="Urban Stone Collective" />
                <meta property="og:locale" content="en_US" />
                <meta property="og:image" content={ogImageUrl} />
                <meta property="og:image:secure_url" content={ogImageUrl} />
                <meta property="og:image:type" content={ogImageType} />
                <meta property="og:image:width" content={ogImageWidth} />
                <meta property="og:image:height" content={ogImageHeight} />
                <meta property="og:image:alt" content="Urban Stone Collective social preview with brand wordmark on a dark stone-inspired background" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Cincinnati Coverage Hub | Urban Stone Collective" />
                <meta
                    name="twitter:description"
                    content="Browse city and material countertop pages covering Cincinnati, Mason, West Chester, Blue Ash, Northern Kentucky, and nearby areas."
                />
                <meta name="twitter:image" content={ogImageUrl} />
                <meta name="twitter:image:alt" content="Urban Stone Collective social preview with brand wordmark on a dark stone-inspired background" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(coverageSchema) }} />
            </Head>

            <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
                <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
                    <TopNav />
                    <main>
                        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] lg:py-12">
                            <div>
                                <div className="eyebrow">Coverage hub</div>
                                <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[0.95] sm:text-5xl md:text-6xl">
                                    Greater Cincinnati Countertop Service Areas and Material Pages
                                </h1>
                                <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                                    This hub centralizes our Cincinnati-area city pages and high-intent material pages so homeowners, remodelers, and search engines can move cleanly between local service coverage and specific countertop intent.
                                </p>
                            </div>

                            <aside className="rounded-3xl border border-border bg-panel p-5 shadow-soft">
                                <div className="eyebrow">What you will find</div>
                                <div className="mt-4 space-y-3 text-sm leading-7 text-muted sm:text-base">
                                    <p>City pages for quartz countertops, granite countertops, and quartzite countertops around Cincinnati.</p>
                                    <p>Material-by-city pages for high-intent searches like Mason quartz countertops and Blue Ash quartzite countertops.</p>
                                    <p>Internal paths back to the main Cincinnati page, service-area pages, and estimate form.</p>
                                </div>
                            </aside>
                        </section>

                        <section className="rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:p-6">
                            <div className="eyebrow">Location pages</div>
                            <h2 className="font-display text-3xl font-semibold sm:text-4xl">City Pages Across the 50-Mile Service Area</h2>
                            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {serviceAreas.map((area) => (
                                    <Link
                                        key={area.slug}
                                        href={`/service-areas/${area.slug}`}
                                        className="rounded-2xl border border-border bg-panel/70 p-4 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
                                    >
                                        <div className="text-xs uppercase tracking-[0.24em] text-muted">{area.state}</div>
                                        <div className="mt-2 text-xl font-semibold text-text">{area.city}</div>
                                        <p className="mt-2 text-sm leading-6 text-muted">
                                            Local countertop page for {area.city} projects, nearby neighborhoods, and surrounding service coverage.
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section className="mt-10 rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:p-6">
                            <div className="eyebrow">Material pages</div>
                            <h2 className="font-display text-3xl font-semibold sm:text-4xl">High-Intent Material and City Combinations</h2>
                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                {materialPages.map((page) => (
                                    <Link
                                        key={page.slug}
                                        href={`/materials/${page.slug}`}
                                        className="rounded-2xl border border-border bg-panel/70 p-4 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
                                    >
                                        <div className="text-xs uppercase tracking-[0.24em] text-muted">{page.materialLabel}</div>
                                        <div className="mt-2 text-xl font-semibold text-text">{page.headline}</div>
                                        <p className="mt-2 text-sm leading-6 text-muted">
                                            Targeted page for {page.material} in {page.city}, {page.state} with localized copy and project-fit guidance.
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section className="mt-10 text-sm leading-7 text-muted">
                            <Link href="/" className="font-semibold text-text transition hover:text-accent">
                                Return to the main Cincinnati countertop page
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