import Head from 'next/head';
import { useEffect } from 'react';

import TopNav from '../../components/TopNav';
import Hero from '../../components/Hero';
import FeaturesBar from '../../components/FeaturesBar';
import ContractorCard from '../../components/ContractorCard';
import SuppliersSection from '../../components/SuppliersSection';
import LeadForm from '../../components/LeadForm';
import FAQSection from '../../components/FAQSection';
import ChatWidget from '../../components/ChatWidget';
import Footer from '../../components/Footer';
import {
    spanishAnnouncement,
    spanishFaqContent,
    spanishLeadFormContent,
} from '../../data/spanish-homepage-content';
import { getCanonicalUrl, getSiteUrl } from '../../lib/site';
import { buildBreadcrumbSchema, buildLocalBusinessSchema } from '../../lib/seo';

export default function SpanishHome() {
    const siteUrl = getSiteUrl();
    const canonicalUrl = getCanonicalUrl('/es');
    const ogImageUrl = `${siteUrl}/api/og-image`;

    useEffect(() => {
        document.documentElement.lang = 'es';

        return () => {
            document.documentElement.lang = 'en-US';
        };
    }, []);

    const structuredData = buildLocalBusinessSchema({
        id: `${canonicalUrl}#business`,
        url: canonicalUrl,
        image: ogImageUrl,
        telephone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840',
        email: process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co',
        areaServed: ['Cincinnati, Ohio', 'Northern Kentucky', 'Mason, Ohio', 'West Chester, Ohio'],
        description: 'Urban Stone Collective fabrica e instala cubiertas de cuarzo, granito y cuarcita en Cincinnati y el norte de Kentucky.',
    });

    return (
        <>
            <Head>
                <title>Urban Stone Collective | Cubiertas en Cincinnati</title>
                <meta name="description" content="Cubiertas de cuarzo, granito y cuarcita con fabricación e instalación en Cincinnati y el norte de Kentucky." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/')} />
                <link rel="alternate" hrefLang="es" href={canonicalUrl} />
                <link rel="alternate" hrefLang="x-default" href={getCanonicalUrl('/')} />
                <meta property="og:title" content="Urban Stone Collective | Cubiertas en Cincinnati" />
                <meta property="og:description" content="Fabricación e instalación de cubiertas de cuarzo, granito y cuarcita en Cincinnati." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:locale" content="es_US" />
                <meta property="og:locale:alternate" content="en_US" />
                <meta property="og:image" content={ogImageUrl} />
                <meta property="og:image:alt" content="Urban Stone Collective" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            url: canonicalUrl,
                            name: 'Urban Stone Collective',
                            inLanguage: 'es-US',
                        }),
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(buildBreadcrumbSchema([
                            { name: 'Inicio', url: canonicalUrl },
                        ])),
                    }}
                />
            </Head>
            <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
                <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
                    <TopNav language="es" />
                    <main className="pb-6">
                        <Hero language="es" />
                        <FeaturesBar announcement={spanishAnnouncement} />
                        <section className="mx-auto mt-8 mb-8 max-w-6xl px-4 sm:px-6">
                            <ContractorCard language="es" />
                        </section>
                        <div className="my-8 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent sm:my-10" />
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <SuppliersSection language="es" />
                            </div>
                            <div className="lg:col-span-1">
                                <LeadForm content={spanishLeadFormContent} language="es" routeId="homepage-es" collapsible defaultExpanded={false} />
                            </div>
                        </div>
                        <FAQSection
                            {...spanishFaqContent}
                            collapsible
                            defaultExpanded={false}
                            collapsedLabel="Abrir preguntas"
                            expandedLabel="Ocultar preguntas"
                        />
                        <Footer language="es" />
                    </main>
                </div>
                <ChatWidget />
            </div>
        </>
    );
}
