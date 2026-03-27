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
  const hoursLines = supplier.hoursLines || (supplier.hours
    ? [`Mon-Fri ${supplier.hours.mon_fri}${supplier.hours.sat ? ` · Sat ${supplier.hours.sat}` : ''}`]
    : []);
  const initials = supplier.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

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
              {hoursLines.length > 0 ? hoursLines.map((line) => (
                <div key={line}>
                  <span className="font-semibold text-text">Hours:</span> {line}
                </div>
              )) : null}
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
                {showGallery ? 'Hide slab gallery' : isLoadingGallery ? 'Loading slabs...' : `Load ${supplier.featuredCount || 'featured'} slabs`}
              </button>
            )}
          </div>
        </div>
        <div
          className={`h-32 rounded-xl border border-border flex items-center justify-center text-muted overflow-hidden ${supplier.heroImage ? 'bg-surface p-0' : 'bg-gradient-to-br from-panel to-bg p-2'}`}
          style={supplier.heroBackground ? { backgroundColor: supplier.heroBackground } : undefined}
        >
          {supplier.heroImage ? (
            <Image
              src={supplier.heroImage}
              alt={`${supplier.name} hero`}
              width={512}
              height={256}
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="h-full w-full object-contain object-center"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-border bg-panel/80 px-4 py-3">
              {logoVisible ? (
                <Image
                  src={supplier.logo}
                  alt={`${supplier.name} logo`}
                  width={32}
                  height={32}
                  sizes="32px"
                  className="h-8 w-8 object-contain"
                  loading="lazy"
                  onError={() => setLogoVisible(false)}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-muted">
                  {initials}
                </div>
              )}
              <span className="text-sm font-semibold text-text">Curated slabs available on demand</span>
            </div>
          )}
        </div>
      </div>
      {showGallery && supplier.tiers ? (
        <div className="mt-8">
          <TierGrid tiers={supplier.tiers} />
        </div>
      ) : null}
      {!showGallery ? (
        <div className="mt-8 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
          Curated slab picks stay hidden until you load them to keep the homepage fast.
        </div>
      ) : null}
      {showGallery && isLoadingGallery ? (
        <div className="mt-8 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
          Loading slabs...
        </div>
      ) : null}
      {showGallery && galleryError ? (
        <div className="mt-8 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-[#9f3a2b]">
          {galleryError}
        </div>
      ) : null}
    </section>
  );
}
