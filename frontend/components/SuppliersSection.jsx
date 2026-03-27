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
    <section id="suppliers" className="py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Materials library</div>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Quartz, Granite, and Quartzite Countertop Materials</h2>
          <p className="text-muted">Load curated supplier slabs on demand to inspect quartz countertop colors, granite slabs, and quartzite countertop options for Cincinnati-area projects.</p>
        </div>
        <div className="text-sm text-muted">Countertop-ready slabs, loaded on demand</div>
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
