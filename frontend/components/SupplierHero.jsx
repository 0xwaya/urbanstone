import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';

const TierGrid = dynamic(() => import('./TierGrid'));

const supplierHeroImageTreatments = {
  'MSI Surfaces': {
    imageClassName: 'scale-[1.14]',
  },
  'Daltile Stone Center': {
    imageClassName: 'scale-[1.08]',
  },
  'Quartz America': {
    imageClassName: 'scale-[1.12]',
  },
  'Avani': {
    hideHeroImage: true,
  },
  'Citi Quartz': {
    imageClassName: 'scale-[1.26]',
  },
};

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
  const logoShellClassName = 'flex h-12 min-w-[3.5rem] items-center justify-center rounded-xl border border-border/80 bg-panel/75 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]';
  const compactLogoShellClassName = 'flex h-10 min-w-[3rem] items-center justify-center rounded-xl border border-border/80 bg-panel/75 p-2.5';
  const heroImageTreatment = supplierHeroImageTreatments[supplier.name] || {};
  const shouldShowHeroImage = supplier.heroImage && !heroImageTreatment.hideHeroImage;

  return (
    <section className="bg-surface border border-border rounded-2xl p-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            {logoVisible ? (
              <div className={logoShellClassName}>
                <Image
                  src={supplier.logo}
                  alt={`${supplier.name} logo`}
                  width={56}
                  height={40}
                  sizes="56px"
                  className="supplier-logo-image h-full w-full object-contain"
                  loading="lazy"
                  onError={() => setLogoVisible(false)}
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-panel text-xs font-semibold text-muted">
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
            {supplier.gallery && supplier.name !== 'Avani' && (
              <a className="text-accent" href={supplier.gallery} target="_blank" rel="noreferrer">
                View Gallery
              </a>
            )}
            {onToggleGallery && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(54,105,187,0.28)] transition hover:-translate-y-0.5 hover:bg-accentDark hover:shadow-[0_18px_36px_rgba(54,105,187,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
                onClick={onToggleGallery}
                disabled={isLoadingGallery}
              >
                {showGallery ? 'Hide Curated Slabs' : isLoadingGallery ? 'Loading curated slabs...' : 'Curated Slabs'}
              </button>
            )}
          </div>
        </div>
        <div
          className={`h-32 rounded-xl border border-border flex items-center justify-center text-muted overflow-hidden ${shouldShowHeroImage ? 'bg-surface/75 p-3 sm:p-4' : 'bg-gradient-to-br from-panel to-bg p-3'}`}
          style={supplier.heroBackground ? { backgroundColor: supplier.heroBackground } : undefined}
        >
          {shouldShowHeroImage ? (
            <Image
              src={supplier.heroImage}
              alt={`${supplier.name} hero`}
              width={512}
              height={256}
              sizes="(min-width: 1024px) 33vw, 100vw"
              className={`supplier-hero-image h-full w-full object-contain object-center ${heroImageTreatment.imageClassName || ''}`.trim()}
              loading="lazy"
            />
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-border bg-panel/80 px-4 py-3">
              {logoVisible ? (
                <div className={compactLogoShellClassName}>
                  <Image
                    src={supplier.logo}
                    alt={`${supplier.name} logo`}
                    width={48}
                    height={32}
                    sizes="48px"
                    className="supplier-logo-image h-full w-full object-contain"
                    loading="lazy"
                    onError={() => setLogoVisible(false)}
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-[10px] font-semibold text-muted">
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
          Curated slab selections stay hidden until you load them to keep the homepage fast.
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
