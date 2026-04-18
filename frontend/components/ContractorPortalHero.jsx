import ContractorCard from './ContractorCard';

export default function ContractorPortalHero() {
    return (
        <section className="py-8 sm:py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="rounded-2xl border border-border bg-surface/90 p-8 flex flex-col md:flex-row md:items-center gap-6 shadow-soft">
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">Contractor Portal</h1>
                        <p className="text-base text-muted mb-0">Access exclusive pricing, project planning tools, and commercial estimate intake for multi-unit builders, developers, and contractors.</p>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto mt-6 md:mt-0">
                        <ContractorCard />
                    </div>
                </div>
            </div>
        </section>
    );
}
