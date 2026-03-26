import { useState } from 'react';

import SupplierHero from './SupplierHero';
import supplierSummaries from '../data/supplier-summaries.json';

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

      if (!supplier) {
        throw new Error('Supplier catalog not found.');
      }

      setDetailedSuppliers((current) => ({
        ...current,
        [supplierName]: supplier,
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
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="eyebrow">Stone library</div>
          <h2 className="font-display text-4xl font-semibold">Trending Stone Selections</h2>
          <p className="text-muted">Featured best sellers with expandable slab imagery.</p>
        </div>
        <div className="text-sm text-muted">Summary first, slabs on demand</div>
      </div>
      {supplierSummaries.map((summary) => (
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
