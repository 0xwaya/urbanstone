import Head from 'next/head';
import TopNav from '../components/TopNav';
import Hero from '../components/Hero';
import FeaturesBar from '../components/FeaturesBar';
import SuppliersSection from '../components/SuppliersSection';
import LeadForm from '../components/LeadForm';
import ChatWidget from '../components/ChatWidget';

export default function Home() {
  return (
    <>
      <Head>
        <title>Amazon Granite LLC — Premium Countertops</title>
        <meta name="description" content="Amazon Granite LLC — premium countertops with 3–5 day turnaround in Cincinnati." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f4efe7" />
        <meta property="og:title" content="Amazon Granite LLC — Premium Countertops" />
        <meta property="og:description" content="Premium countertops with fast installation, curated slab selections, and responsive local service." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </Head>
      <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
        <div className="page-shell mx-auto max-w-7xl px-6 sm:px-8">
          <TopNav />
          <main>
            <Hero />
            <FeaturesBar />
            <div className="h-px my-10 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <SuppliersSection />
              </div>
              <div className="lg:col-span-1">
                <LeadForm />
              </div>
            </div>
            <div className="mt-12 text-sm text-muted">
              Installation guarantee: 1 year (seams, sink installation). Materials warranty: supplier-only.
            </div>
          </main>
        </div>
        <ChatWidget />
      </div>
    </>
  );
}
