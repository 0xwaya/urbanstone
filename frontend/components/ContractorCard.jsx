import Link from 'next/link';

export default function ContractorCard({ language = 'en' }) {
    const spanish = language === 'es';
    return (
        <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
                <p className="eyebrow mb-2">{spanish ? 'Para constructores y contratistas' : 'For Builders & Contractors'}</p>
                <h2 className="text-xl font-display font-semibold text-text mb-2">
                    {spanish ? 'Precios especiales para proyectos de varias unidades' : 'Special Pricing for Multi-Unit Projects'}
                </h2>
                <p className="text-sm text-muted leading-relaxed max-w-lg">
                    {spanish
                        ? 'Programa exclusivo para desarrolladores de apartamentos, hoteles y oficinas. Solicita acceso a precios y condiciones para contratistas.'
                        : 'Exclusive program for apartment developers, hotel builders, and office contractors. Apply for access to view contractor-only pricing and project terms.'}
                </p>
            </div>
            <div className="flex-shrink-0">
                <Link
                    href="/contractors/login"
                    className="brand-button-primary inline-block whitespace-nowrap px-8 py-3"
                >
                    {spanish ? 'Portal para contratistas' : 'Contractor Portal'}
                </Link>
            </div>
        </div>
    );
}
