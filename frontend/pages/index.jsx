import Head from 'next/head';
import TopNav from '../components/TopNav';
import Hero from '../components/Hero';
import FeaturesBar from '../components/FeaturesBar';
import SuppliersSection from '../components/SuppliersSection';
import LeadForm from '../components/LeadForm';
import FAQSection from '../components/FAQSection';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import { homepageAnnouncement, homepageFaqContent, homepageFaqItems, homepageLeadFormContent } from '../data/homepage-content';
import { getCanonicalUrl, getSiteUrl } from '../lib/site';

export default function Home() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = getCanonicalUrl('/');
  const ogImageUrl = `${siteUrl}/brand/amazonlogo.png`;
  const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
  const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
  const instagramUrl = (process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/amazongranite').trim();
  const facebookUrl = (process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/amazongranitellc/').trim();
  const tiktokUrl = (process.env.NEXT_PUBLIC_TIKTOK_URL || 'https://www.tiktok.com/@urbanstoneco').trim();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${canonicalUrl}#business`,
    name: 'Urban Stone Collective',
    legalName: 'Amazon Granite LLC',
    alternateName: ['Amazon Granite', 'Amazon Granite LLC'],
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
    sameAs: [instagramUrl, facebookUrl, tiktokUrl],
    description: 'Urban Stone Collective, formerly Amazon Granite LLC, fabricates and installs quartz countertops, granite countertops, and quartzite countertops across the Cincinnati metro with curated slab sourcing and fast turnaround.',
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
        <title>Quartz, Granite & Quartzite Countertops in Cincinnati | Urban Stone Collective</title>
        <meta name="description" content="Urban Stone Collective installs quartz countertops, granite countertops, and quartzite countertops in Cincinnati, Mason, West Chester, Fairfield, Northern Kentucky, and nearby areas within 50 miles of downtown Cincinnati." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f4efe7" />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta name="geo.region" content="US-OH" />
        <meta name="geo.placename" content="Cincinnati" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Quartz, Granite & Quartzite Countertops in Cincinnati | Urban Stone Collective" />
        <meta property="og:description" content="Quartz countertops, granite countertops, and quartzite countertops with curated slab selections, custom fabrication, and fast Cincinnati-area installation." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Urban Stone Collective" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:alt" content="Urban Stone Collective countertop brand mark" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Quartz, Granite & Quartzite Countertops in Cincinnati | Urban Stone Collective" />
        <meta name="twitter:description" content="Quartz countertops, granite countertops, and quartzite countertops with fast turnaround for Cincinnati-area homes and renovations." />
        <meta name="twitter:image" content={ogImageUrl} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
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
          <main>
            <Hero />
            <FeaturesBar announcement={homepageAnnouncement} />
            <div className="my-8 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent sm:my-10" />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SuppliersSection />
              </div>
              <div className="lg:col-span-1">
                <LeadForm content={homepageLeadFormContent} routeId="homepage" />
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
