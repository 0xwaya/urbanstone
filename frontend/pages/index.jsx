import Head from 'next/head';
import TopNav from '../components/TopNav';
import Hero from '../components/Hero';
import FeaturesBar from '../components/FeaturesBar';
import ContractorCard from '../components/ContractorCard';
import SuppliersSection from '../components/SuppliersSection';
import LeadForm from '../components/LeadForm';
import FAQSection from '../components/FAQSection';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import { homepageAnnouncement, homepageFaqContent, homepageFaqItems, homepageLeadFormContent } from '../data/homepage-content';
import { getCanonicalUrl, getSiteUrl } from '../lib/site';
import { getGeoRegion } from '../lib/seo';

export default function Home() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = getCanonicalUrl('/');
  const ogImageUrl = `${siteUrl}/api/og-image`;
  const ogImageWidth = '1200';
  const ogImageHeight = '630';
  const ogImageType = 'image/png';
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
  const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
  const instagramUrl = (process.env.NEXT_PUBLIC_INSTAGRAM_URL || '').trim();
  const facebookUrl = (process.env.NEXT_PUBLIC_FACEBOOK_URL || '').trim();
  const tiktokUrl = (process.env.NEXT_PUBLIC_TIKTOK_URL || '').trim();
  const socialProfiles = [instagramUrl, facebookUrl, tiktokUrl].filter(Boolean);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${canonicalUrl}#business`,
    name: 'Urban Stone Collective',
    url: canonicalUrl,
    image: ogImageUrl,
    telephone: companyPhone,
    email: companyEmail,
    areaServed: [
      'Cincinnati, Ohio',
      'Covington, Kentucky',
      'Newport, Kentucky',
      'Florence, Kentucky',
      'Mason, Ohio',
      'West Chester, Ohio',
      'Liberty Township, Ohio',
      'Fairfield, Ohio',
      'Hamilton, Ohio',
      'Blue Ash, Ohio',
      'Loveland, Ohio',
      'Milford, Ohio',
    ],
    serviceType: [
      'Granite countertops',
      'Quartz countertops',
      'Quartzite countertops',
      'Countertop fabrication',
      'Countertop installation',
    ],
    sameAs: socialProfiles,
    description: 'Urban Stone Collective fabricates and installs quartz countertops, granite countertops, and quartzite countertops across the Cincinnati metro with curated slab sourcing and fast turnaround.',
  };
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name: 'Urban Stone Collective',
    url: siteUrl,
    logo: ogImageUrl,
    sameAs: socialProfiles,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: companyPhone,
        email: companyEmail,
        contactType: 'sales',
        areaServed: ['Greater Cincinnati', 'Northern Kentucky'],
        availableLanguage: ['en'],
      },
    ],
  };
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}#website`,
    url: siteUrl,
    name: 'Urban Stone Collective',
    inLanguage: 'en-US',
  };
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homepageFaqItems.map((item) => ({
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
        <title>Urban Stone Collective | countertops specialists</title>
        <meta name="description" content="Urban Stone Collective | countertops specialists. Quartz, granite, and quartzite countertops with expert fabrication and installation in Cincinnati and Northern Kentucky." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f4efe7" />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta name="geo.region" content={getGeoRegion('OH')} />
        <meta name="geo.placename" content="Cincinnati" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Urban Stone Collective | countertops specialists" />
        <meta property="og:description" content="Urban Stone Collective | countertops specialists. Quartz, granite, and quartzite countertops with expert fabrication and installation in Cincinnati and Northern Kentucky." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Urban Stone Collective" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="en_GB" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content={ogImageType} />
        <meta property="og:image:width" content={ogImageWidth} />
        <meta property="og:image:height" content={ogImageHeight} />
        <meta property="og:image:alt" content="Urban Stone Collective social preview with brand wordmark on a dark stone-inspired background" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Urban Stone Collective | countertops specialists" />
        <meta name="twitter:description" content="Urban Stone Collective | countertops specialists. Quartz, granite, and quartzite countertops with expert fabrication and installation in Cincinnati and Northern Kentucky." />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content="Urban Stone Collective social preview with brand wordmark on a dark stone-inspired background" />
        <link rel="icon" type="image/svg+xml" href="/brand/urban-stone-favicon.svg?v=20260401e" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=20260401e" />
        <link rel="apple-touch-icon" href="/favicon.png?v=20260401e" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      </Head>
      <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
        <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
            <TopNav />
          <main className="pb-6">
            <Hero />
            <FeaturesBar announcement={homepageAnnouncement} />
            <section className="mx-auto max-w-6xl px-4 mt-8 mb-8 sm:px-6">
              <div className="brand-section flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">Contractor Portal</h2>
                  <p className="text-base text-muted mb-0">Access exclusive pricing, project planning tools, and commercial estimate intake for multi-unit builders, developers, and contractors.</p>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto mt-6 md:mt-0">
                  <ContractorCard />
                </div>
              </div>
            </section>
            <div className="my-8 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent sm:my-10" />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SuppliersSection />
              </div>
              <div className="lg:col-span-1">
                <LeadForm content={homepageLeadFormContent} routeId="homepage" collapsible defaultExpanded={false} />
              </div>
            </div>
            <FAQSection {...homepageFaqContent} collapsible defaultExpanded={false} />
            <Footer />
          </main>
        </div>
        <ChatWidget />
      </div>
    </>
  );
}
