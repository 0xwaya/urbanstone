import TierGrid from './TierGrid';

export default function SupplierHero({ supplier }) {
  return (
    <section className="bg-surface border border-border rounded-2xl p-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            {supplier.logo && (
              <img src={supplier.logo} alt={`${supplier.name} logo`} className="h-10 w-10 object-contain" />
            )}
            <h3 className="text-2xl font-semibold">{supplier.name}</h3>
          </div>
          <p className="text-muted mt-2">{supplier.note}</p>
          {supplier.address && (
            <div className="mt-3 text-sm text-muted space-y-1">
              <div><span className="font-semibold text-text">Address:</span> {supplier.address}</div>
              {supplier.phone && <div><span className="font-semibold text-text">Phone:</span> {supplier.phone}</div>}
              {supplier.hours && (
                <div>
                  <span className="font-semibold text-text">Hours:</span> Mon–Fri {supplier.hours.mon_fri} · Sat {supplier.hours.sat}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            <a className="text-accent" href={supplier.portal} target="_blank" rel="noreferrer">
              Visit Supplier Portal
            </a>
            {supplier.gallery && (
              <a className="text-accent" href={supplier.gallery} target="_blank" rel="noreferrer">
                View Gallery
              </a>
            )}
          </div>
        </div>
        <div
          className={`h-32 rounded-xl border border-border flex items-center justify-center text-muted overflow-hidden p-2 ${
            supplier.heroImage ? 'bg-surface' : 'bg-gradient-to-br from-panel to-bg'
          }`}
          style={supplier.heroBackground ? { backgroundColor: supplier.heroBackground } : undefined}
        >
          {supplier.heroImage ? (
            <img src={supplier.heroImage} alt={`${supplier.name} hero`} className="h-full w-full object-contain" />
          ) : (
            <span>Supplier Gallery Hero</span>
          )}
        </div>
      </div>
      <div className="mt-8">
        <TierGrid tiers={supplier.tiers} />
      </div>
    </section>
  );
}
