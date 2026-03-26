import SupplierHero from './SupplierHero';
import suppliers from '../data/featured-stones.json';

export default function SuppliersSection() {
  return (
    <section className="py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Trending Stone Selections</h2>
          <p className="text-muted">Featured best sellers with expandable slab imagery.</p>
        </div>
        <div className="text-sm text-muted">Top 4–5 per supplier</div>
      </div>
      {suppliers.map((s) => (
        <SupplierHero key={s.name} supplier={s} />
      ))}
    </section>
  );
}
