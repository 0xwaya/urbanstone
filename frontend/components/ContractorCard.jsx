import Link from 'next/link';

export default function ContractorCard() {
    return (
        <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
                <p className="eyebrow mb-2">For Builders &amp; Contractors</p>
                <h2 className="text-xl font-display font-semibold text-text mb-2">
                    Special Pricing for Multi-Unit Projects
                </h2>
                <p className="text-sm text-muted leading-relaxed max-w-lg">
                    Exclusive program for apartment developers, hotel builders, and office contractors. Apply for access to view contractor-only pricing and project terms.
                </p>
            </div>
            <div className="flex-shrink-0">
                <Link
                    href="/contractors/login"
                    className="brand-button-primary inline-block whitespace-nowrap"
                >
                    Contractor Portal
                </Link>
            </div>
        </div>
    );
}
