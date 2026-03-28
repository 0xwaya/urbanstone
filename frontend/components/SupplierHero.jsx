import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useId, useState } from 'react';

const TierGrid = dynamic(() => import('./TierGrid'));

const supplierHeroImageTreatments = {
  'MSI Surfaces': {
    imageClassName: 'scale-[1.14]',
    assetClassName: 'max-h-[86%] max-w-full',
    mediaClassName: 'px-3 py-3 sm:px-4 sm:py-4',
  },
  'Daltile Stone Center': {
    imageClassName: 'scale-[1.12]',
    assetClassName: 'max-h-[86%] max-w-full',
    frameClassName: 'supplier-hero-frame--bright p-1.5 sm:p-2',
    mediaClassName: 'px-3 py-3 sm:px-4 sm:py-4',
  },
  'Quartz America': {
    imageClassName: 'scale-[1.12]',
    assetClassName: 'max-h-[86%] max-w-full',
    mediaClassName: 'px-3 py-3 sm:px-4 sm:py-4',
  },
  'Avani': {
    assetClassName: 'max-h-[58%] max-w-[78%] sm:max-h-[62%] sm:max-w-[74%]',
    imageClassName: 'scale-[0.84]',
    frameClassName: 'supplier-hero-frame--bright supplier-hero-frame--whitewash p-2.5 sm:p-3',
    mediaClassName: 'px-5 py-5 sm:px-7 sm:py-6',
  },
  'Citi Quartz': {
    assetClassName: 'max-h-[56%] max-w-[72%] sm:max-h-[62%] sm:max-w-[70%]',
    imageClassName: 'scale-[0.92]',
    frameClassName: 'supplier-hero-frame--bright supplier-hero-frame--whitewash supplier-hero-frame--citi p-2.5 sm:p-3',
    mediaClassName: 'px-5 py-5 sm:px-6 sm:py-6',
  },
};

export default function SupplierHero({
  supplier,
  showGallery = false,
  isLoadingGallery = false,
  galleryError,
  onToggleGallery,
}) {
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const hoursRegionId = useId();
  const hoursLines = supplier.hoursLines || (supplier.hours
    ? [`Mon-Fri ${supplier.hours.mon_fri}${supplier.hours.sat ? ` · Sat ${supplier.hours.sat}` : ''}`]
    : []);
  const heroImageTreatment = supplierHeroImageTreatments[supplier.name] || {};
  const shouldShowHeroImage = Boolean(supplier.heroImage);
  const heroFrameClassName = shouldShowHeroImage
    ? `supplier-hero-frame p-3 sm:p-4 ${heroImageTreatment.frameClassName || ''}`.trim()
    : 'bg-gradient-to-br from-panel to-bg p-3';
  const heroMediaClassName = `flex h-full w-full items-center justify-center overflow-hidden rounded-[1.15rem] ${heroImageTreatment.mediaClassName || 'px-3 py-3 sm:px-4 sm:py-4'}`.trim();
  const heroAssetClassName = `flex h-full w-full items-center justify-center ${heroImageTreatment.assetClassName || 'max-h-[86%] max-w-full'}`.trim();
  const heroFrameStyle = supplier.heroBackground ? { backgroundColor: supplier.heroBackground } : undefined;
  const hasContactDetails = Boolean(supplier.address || supplier.phone || hoursLines.length);
  const galleryButtonLabel = showGallery
    ? 'Hide Curated Slabs'
    : isLoadingGallery
      ? 'Loading curated slabs...'
      : 'Browse Curated Slabs';

  return (
    <section className="mb-6 rounded-[1.55rem] border border-border bg-surface p-4 shadow-soft sm:mb-10 sm:rounded-[1.7rem] sm:p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch lg:gap-5">
        <a
          className="supplier-hero-card group"
          href={supplier.portal}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${supplier.name} supplier portal`}
        >
          <span className="sr-only">{supplier.name}</span>
          <div
            className={`supplier-hero-card__media ${heroFrameClassName}`}
            style={heroFrameStyle}
          >
            {shouldShowHeroImage ? (
              <div className={heroMediaClassName}>
                <div className={heroAssetClassName}>
                  <Image
                    src={supplier.heroImage}
                    alt={`${supplier.name} supplier hero`}
                    width={512}
                    height={256}
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    className={`supplier-hero-image h-auto max-h-full w-auto max-w-full object-contain object-center ${heroImageTreatment.imageClassName || ''}`.trim()}
                    loading="lazy"
                  />
                </div>
              </div>
            ) : (
              <div className="supplier-hero-fallback flex h-full w-full items-center justify-center rounded-[1.15rem] border border-border/70 bg-panel/75 px-6 text-center text-sm font-semibold text-text">
                Supplier portal
              </div>
            )}
          </div>
          <div className="supplier-hero-card__overlay">
            <div className="supplier-hero-card__eyebrow">Official supplier portal</div>
            <div className="supplier-hero-card__cta">
              <span>Visit Supplier Portal</span>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M6 14L14 6M8 6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </a>
        <div className="flex min-h-full flex-col justify-between rounded-[1.3rem] border border-border/70 bg-panel/35 p-3.5 sm:rounded-[1.45rem] sm:p-5">
          <div>
            <h3 className="sr-only">{supplier.name}</h3>
            <p className="text-[0.98rem] leading-7 text-text sm:text-[1.05rem]">{supplier.note}</p>
            {hasContactDetails ? (
              <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3 sm:grid-cols-2">
                {supplier.address ? (
                  <div className="supplier-meta-card sm:col-span-2">
                    <div className="supplier-meta-card__label">Address</div>
                    <div className="supplier-meta-card__value">{supplier.address}</div>
                  </div>
                ) : null}
                {supplier.phone ? (
                  <div className="supplier-meta-card sm:col-span-1">
                    <div className="supplier-meta-card__label">Phone</div>
                    <div className="supplier-meta-card__value">{supplier.phone}</div>
                  </div>
                ) : null}
                {hoursLines.length > 0 ? (
                  <div className="supplier-meta-card sm:col-span-1">
                    <button
                      type="button"
                      className="supplier-hours-button"
                      aria-expanded={isHoursOpen}
                      aria-controls={hoursRegionId}
                      onClick={() => setIsHoursOpen((current) => !current)}
                    >
                      <span>
                        <span className="supplier-meta-card__label">Hours of operation</span>
                        <span className="mt-1 block text-sm font-semibold text-text">
                          {isHoursOpen ? 'Hide hours' : 'Show hours'}
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                        className={`supplier-chevron h-5 w-5 ${isHoursOpen ? 'rotate-180' : ''}`.trim()}
                      >
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div id={hoursRegionId} className={`${isHoursOpen ? 'mt-3 block' : 'hidden'}`}>
                      <div className="space-y-1.5 text-sm leading-6 text-muted">
                        {hoursLines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
            {onToggleGallery ? (
              <button
                type="button"
                className="supplier-secondary-button w-full sm:w-auto"
                onClick={onToggleGallery}
                disabled={isLoadingGallery}
              >
                <span>{galleryButtonLabel}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className={`supplier-chevron h-4 w-4 ${showGallery ? 'rotate-180' : ''}`.trim()}
                >
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
            {supplier.gallery && supplier.name !== 'Avani' ? (
              <a className="supplier-tertiary-link w-full sm:w-auto" href={supplier.gallery} target="_blank" rel="noreferrer">
                Open Full Gallery
              </a>
            ) : null}
          </div>
        </div>
      </div>
      {showGallery && supplier.tiers ? (
        <div className="mt-7 sm:mt-8">
          <TierGrid tiers={supplier.tiers} />
        </div>
      ) : null}
      {!showGallery ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-panel/65 px-4 py-3 text-sm leading-6 text-muted sm:mt-5">
          Use Browse Curated Slabs when you want a quick preview without loading every supplier catalog upfront.
        </div>
      ) : null}
      {showGallery && isLoadingGallery ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-panel/65 px-4 py-3 text-sm text-muted sm:mt-5">
          Loading slabs...
        </div>
      ) : null}
      {showGallery && galleryError ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-panel/65 px-4 py-3 text-sm text-[#9f3a2b] sm:mt-5">
          {galleryError}
        </div>
      ) : null}
    </section>
  );
}
