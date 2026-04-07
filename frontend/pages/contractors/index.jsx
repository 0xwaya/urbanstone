import Head from 'next/head';
import Image from 'next/image';
import TopNav from '../../components/TopNav';
import Footer from '../../components/Footer';
import LeadForm from '../../components/LeadForm';

const TIERS = [
    {
        name: 'Tropical Mist',
        price: '$48',
        unit: '/SF Installed',
        tagline: 'Best for high-volume apartment units.',
        description: 'Maximum cost efficiency without sacrificing finish quality. The top choice for large-scale unit turnovers and new construction.',
        image: '/builder%20materials/tropical%20mist.png',
        badge: 'Most Popular',
    },
    {
        name: 'Glimmer White',
        price: '$50',
        unit: '/SF Installed',
        tagline: 'Most versatile white.',
        description: 'Ideal for upgraded rental properties and mixed-use developments. Clean aesthetic that photographs well for listings.',
        image: '/builder%20materials/glimmer%20white.png',
        badge: null,
    },
    {
        name: 'Bianco Ivory',
        price: '$55',
        unit: '/SF Installed',
        tagline: 'Soft veining. Premium finish.',
        description: 'Perfect for luxury apartments, boutique hotels, and Class A office builds where surface materials signal quality.',
        image: '/builder%20materials/bianco%20ivory.png',
        badge: 'Premium',
    },
];

const SPECS = [
    { label: 'Material', value: '3CM Quartz' },
    { label: 'Slab Size', value: '127" × 64"' },
    { label: 'Includes', value: 'Fabrication + Installation' },
    { label: 'Lead Time', value: '2–3 weeks per unit block' },
    { label: 'Min. Project', value: '3+ units' },
    { label: 'Warranty', value: 'Lifetime limited' },
];

export default function ContractorPortal() {
    return (
        <>
            <Head>
                <title>Contractor Pricing — Urban Stone</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <TopNav />

            <main className="bg-bg min-h-screen text-text">
                {/* Hero */}
                <section className="pt-28 pb-16 px-6 text-center max-w-3xl mx-auto">
                    <p className="eyebrow mb-4">Contractor Program</p>
                    <h1 className="text-4xl md:text-5xl font-display font-semibold leading-tight mb-4">
                        Builder &amp; Contractor Pricing
                    </h1>
                    <p className="text-lg text-muted leading-relaxed">
                        Exclusive pricing for apartment developers, hotel builders, and office contractors.
                        All prices include fabrication and installation. Volume discounts available for 10+ units.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-panel border border-border rounded-full px-4 py-2 text-xs text-muted">
                        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                        Prices valid for multi-unit projects only
                    </div>
                </section>

                {/* Pricing tiers */}
                <section className="px-6 pb-16 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TIERS.map(tier => (
                            <div
                                key={tier.name}
                                className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col"
                            >
                                <div className="relative w-full aspect-[4/3] bg-panel">
                                    <Image
                                        src={tier.image}
                                        alt={tier.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        unoptimized
                                    />
                                    {tier.badge && (
                                        <span className="absolute top-3 right-3 bg-accent/90 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                            {tier.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="p-6 flex flex-col gap-3 flex-1">
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-display font-semibold text-text">{tier.price}</span>
                                        <span className="text-sm text-muted mb-1">{tier.unit}</span>
                                    </div>
                                    <h2 className="text-lg font-semibold text-text">{tier.name}</h2>
                                    <p className="text-sm font-medium text-accent">{tier.tagline}</p>
                                    <p className="text-sm text-muted leading-relaxed flex-1">{tier.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Specs grid */}
                <section className="px-6 pb-16 max-w-5xl mx-auto">
                    <div className="bg-surface border border-border rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-text mb-6">Standard Specifications</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {SPECS.map(spec => (
                                <div key={spec.label}>
                                    <p className="text-xs text-muted uppercase tracking-wider mb-1">{spec.label}</p>
                                    <p className="text-sm text-text font-medium">{spec.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Disclaimer */}
                <section className="px-6 pb-8 max-w-5xl mx-auto">
                    <p className="text-xs text-muted text-center border-t border-border pt-6">
                        Pricing is exclusive to qualified contractors on multi-unit projects. Subject to material availability. Contact us for volume pricing on 10+ units.
                    </p>
                </section>

                {/* Quote CTA */}
                <section className="px-6 pb-24 max-w-2xl mx-auto">
                    <div className="bg-panel border border-border rounded-2xl p-8">
                        <h2 className="text-xl font-semibold text-text mb-2">Request a Project Quote</h2>
                        <p className="text-sm text-muted mb-6">
                            Tell us about your project — unit count, material preference, and timeline — and we&apos;ll get back to you within one business day.
                        </p>
                        <LeadForm routeId="contractor-portal" />
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
