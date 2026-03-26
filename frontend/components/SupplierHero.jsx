import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';

const TierGrid = dynamic(() => import('./TierGrid'));

export default function SupplierHero({
  supplier,
  showGallery = false,
  isLoadingGallery = false,
  galleryError,
  onToggleGallery,
}) {
  const [logoVisible, setLogoVisible] = useState(Boolean(supplier.logo));
  const [activePreviewSlab, setActivePreviewSlab] = useState(null);
  const initials = supplier.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const previewSlabs = supplier.previewSlabs || [];

  return (
    <section className="bg-surface border border-border rounded-2xl p-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            {logoVisible ? (
              <Image
                src={supplier.logo}
                alt={`${supplier.name} logo`}
                width={40}
                height={40}
                sizes="40px"
                className="h-10 w-10 object-contain"
                loading="lazy"
                onError={() => setLogoVisible(false)}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-xs font-semibold text-muted">
                {initials}
              </div>
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
            {onToggleGallery && (
              <button
                type="button"
                className="font-semibold text-accent"
                onClick={onToggleGallery}
                disabled={isLoadingGallery}
              >
                {showGallery ? 'Hide material gallery' : isLoadingGallery ? 'Loading materials...' : `Load ${supplier.featuredCount || 'featured'} materials`}
              </button>
            )}
          </div>
        </div>
        <div
          className={`h-32 rounded-xl border border-border flex items-center justify-center text-muted overflow-hidden p-2 ${supplier.heroImage ? 'bg-surface' : 'bg-gradient-to-br from-panel to-bg'
            }`}
          style={supplier.heroBackground ? { backgroundColor: supplier.heroBackground } : undefined}
        >
          {supplier.heroImage ? (
            <Image
              src={supplier.heroImage}
              alt={`${supplier.name} hero`}
              width={512}
              height={256}
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <span>Supplier Gallery Hero</span>
          )}
        </div>
      </div>
      {previewSlabs.length > 0 ? (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Curated countertop-ready materials</div>
              <div className="text-sm text-muted">Click a material to preview it before loading the full materials gallery.</div>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Top 3</div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {previewSlabs.map((slab) => (
              <button
                key={slab.name}
                type="button"
                onClick={() => setActivePreviewSlab(slab)}
                className="text-left rounded-xl border border-border bg-panel/80 p-4 transition hover:-translate-y-1 hover:border-accent hover:shadow-xl"
                aria-label={`Preview ${slab.name} material`}
              >
                {slab.image ? (
                  <Image
                    src={slab.image}
                    alt={slab.name}
                    width={320}
                    height={144}
                    sizes="(min-width: 1280px) 18vw, (min-width: 640px) 40vw, 100vw"
                    className="mb-3 h-32 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="mb-3 h-32 rounded-lg border border-border bg-gradient-to-br from-panel to-bg" />
                )}
                <div className="font-semibold text-text">{slab.name}</div>
                <div className="mt-1 text-sm text-muted">{slab.notes}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {showGallery && supplier.tiers ? (
        <div className="mt-8">
          <TierGrid tiers={supplier.tiers} />
        </div>
      ) : null}
      {!showGallery ? (
        <div className="mt-8 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
          Full materials gallery loads on demand to keep the homepage fast.
        </div>
      ) : null}
      {showGallery && isLoadingGallery ? (
        <div className="mt-8 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
          Loading materials...
        </div>
      ) : null}
      {showGallery && galleryError ? (
        <div className="mt-8 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-[#9f3a2b]">
          {galleryError}
        </div>
      ) : null}
      {activePreviewSlab ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true" onClick={() => setActivePreviewSlab(null)}>
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-surface p-6" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActivePreviewSlab(null)}
              className="absolute right-4 top-4 text-sm text-muted hover:text-text"
              aria-label="Close material preview"
            >
              Close
            </button>
            <div className="mb-2 text-xl font-semibold">{activePreviewSlab.name}</div>
            <div className="mb-4 text-sm text-muted">{activePreviewSlab.notes}</div>
            {activePreviewSlab.imageLarge || activePreviewSlab.image ? (
              <Image
                src={activePreviewSlab.imageLarge || activePreviewSlab.image}
                alt={`${activePreviewSlab.name} full preview`}
                width={1440}
                height={960}
                sizes="100vw"
                className="w-full max-h-[70vh] rounded-xl border border-border object-contain"
                loading="eager"
              />
            ) : (
              <div className="h-96 rounded-xl border border-border bg-gradient-to-br from-panel to-bg" />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
