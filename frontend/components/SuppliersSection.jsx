import { useState } from 'react';

import SupplierHero from './SupplierHero';
import supplierSummaries from '../data/supplier-summaries.json';

const sortedSupplierSummaries = [...supplierSummaries].sort((left, right) => left.name.localeCompare(right.name));

export default function SuppliersSection() {
  const [expandedSupplierName, setExpandedSupplierName] = useState(null);
  const [detailedSuppliers, setDetailedSuppliers] = useState({});
  const [loadErrors, setLoadErrors] = useState({});
  const [loadingSupplierName, setLoadingSupplierName] = useState('');

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
        ...summary,
        ...supplier,
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
        [supplierName]: 'The featured slab gallery is temporarily unavailable. Use the supplier portal link while we restore it.',
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
          <p className="max-w-3xl text-muted">Open the official supplier portal from each hero card, then load curated slab previews only when you want a faster shortlist.</p>
        </div>
        <div className="text-sm text-muted sm:text-right">Portal first, slabs on demand</div>
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
    </section>
  );
}
