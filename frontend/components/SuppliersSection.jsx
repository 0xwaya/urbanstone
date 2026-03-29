import { useState } from 'react';

import SupplierHero from './SupplierHero';
import supplierSummaries from '../data/supplier-summaries.json';

const sortedSupplierSummaries = [...supplierSummaries].sort((left, right) => left.name.localeCompare(right.name));

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function SuppliersSection() {
    const [expandedSupplierName, setExpandedSupplierName] = useState(null);
    const [detailedSuppliers, setDetailedSuppliers] = useState({});
    const [loadErrors, setLoadErrors] = useState({});
    const [loadingSupplierName, setLoadingSupplierName] = useState('');
    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';

    const toggleSupplier = async (supplierName) => {
        if (expandedSupplierName === supplierName) {
            setExpandedSupplierName(null);
            return;
        }

        setExpandedSupplierName(supplierName);

        if (detailedSuppliers[supplierName]) {
            return;
        }

        setLoadingSupplierName(supplierName);
        setLoadErrors((current) => {
            if (!current[supplierName]) {
                return current;
            }

            const nextErrors = { ...current };
            delete nextErrors[supplierName];
            return nextErrors;
        });

        try {
            const featuredStonesModule = await import('../data/featured-stones.json');
            const suppliers = featuredStonesModule.default || featuredStonesModule;
            const supplier = suppliers.find((entry) => entry.name === supplierName);
            const summary = supplierSummaries.find((entry) => entry.name === supplierName);

            if (!supplier) {
                throw new Error('Supplier catalog not found.');
            }

            const slicedSupplier = {
                ...supplier,
                ...summary,
                note: summary.note || supplier.note,
                tiers: supplier.tiers.map((tier) => ({
                    ...tier,
                    name: 'Curated Slab Selection',
                    range: 'Top 3',
                    slabs: tier.slabs.slice(0, 3),
                })),
            };

            setDetailedSuppliers((current) => ({
                ...current,
                [supplierName]: slicedSupplier,
            }));
        } catch {
            setLoadErrors((current) => ({
                ...current,
                [supplierName]: 'Curated slab previews are temporarily unavailable. Contact Urban Stone and we will guide your shortlist directly.',
            }));
        } finally {
            setLoadingSupplierName('');
        }
    };

    return (
        <section id="suppliers" className="scroll-mt-28 py-6 sm:scroll-mt-36 sm:py-8">
            <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                <div>
                    <div className="eyebrow">Materials library</div>
                    <h2 className="font-display text-3xl font-semibold sm:text-4xl">Curated Countertop Materials</h2>
                    <p className="max-w-3xl text-muted">Shortlist slab directions faster, then let Urban Stone handle final stone selection, measurements, deposit, fabrication, and installation.</p>
                </div>
                <div className="flex flex-col gap-2 sm:max-w-[18rem] sm:items-end">
                    <a className="materials-next-step-button w-full sm:w-auto" href="#quote">Request estimate</a>
                </div>
            </div>
            {sortedSupplierSummaries.map((summary) => (
                <SupplierHero
                    key={summary.name}
                    supplier={detailedSuppliers[summary.name] || summary}
                    showGallery={expandedSupplierName === summary.name}
                    isLoadingGallery={loadingSupplierName === summary.name}
                    galleryError={loadErrors[summary.name]}
                    onToggleGallery={() => toggleSupplier(summary.name)}
                />
            ))}
            <div className="mt-4 rounded-[1.35rem] border border-border bg-panel/55 p-4 shadow-soft sm:mt-6 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-2xl">
                        <div className="eyebrow !mb-2">Next step</div>
                        <h3 className="font-display text-2xl font-semibold text-text sm:text-[2rem]">Need help narrowing the shortlist?</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">Send your layout, preferred look, and any measurements you have. We will guide the slab direction and handle the next steps directly.</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:w-auto sm:min-w-[14rem]">
                        <a className="materials-next-step-button" href="#quote">Start with an estimate</a>
                        <a className="inline-flex items-center justify-center rounded-full border border-border bg-surface/75 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent hover:text-accent" href={`tel:${toTelHref(companyPhone)}`} aria-label={`Call Urban Stone at ${companyPhone}`}>
                            Call Urban Stone
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
