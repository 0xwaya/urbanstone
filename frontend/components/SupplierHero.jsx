import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useId, useState } from 'react';

const TierGrid = dynamic(() => import('./TierGrid'));

const defaultHeroTreatment = {
  mediaPadding: { mobile: '0.75rem', desktop: '1rem' },
  assetMaxWidth: { mobile: '100%', desktop: '100%' },
  assetMaxHeight: { mobile: '86%', desktop: '86%' },
  scale: { mobile: 1, desktop: 1 },
  shiftX: { mobile: '0px', desktop: '0px' },
  shiftY: { mobile: '0px', desktop: '0px' },
};

const supplierHeroImageTreatments = {
  'MSI Surfaces': {
    scale: { mobile: 0.91, desktop: 0.91 },
    assetMaxHeight: { mobile: '86%', desktop: '86%' },
    assetMaxWidth: { mobile: '100%', desktop: '100%' },
    mediaPadding: { mobile: '0.75rem', desktop: '1rem' },
    shiftY: { mobile: '-2px', desktop: '-3px' },
  },
  'Daltile Stone Center': {
    scale: { mobile: 0.92, desktop: 0.98 },
    assetMaxHeight: { mobile: '72%', desktop: '76%' },
    assetMaxWidth: { mobile: '82%', desktop: '86%' },
    mediaPadding: { mobile: '0.8rem', desktop: '1rem' },
    shiftY: { mobile: '22px', desktop: '16px' },
    frameClassName: 'supplier-hero-frame--bright supplier-hero-frame--pure-white p-1.5 sm:p-2',
  },
  'Quartz America': {
    scale: { mobile: 0.95, desktop: 0.95 },
    assetMaxHeight: { mobile: '80%', desktop: '80%' },
    assetMaxWidth: { mobile: '92%', desktop: '92%' },
    mediaPadding: { mobile: '0.75rem', desktop: '1rem' },
    shiftY: { mobile: '-4px', desktop: '-5px' },
  },
  'Avani': {
    scale: { mobile: 1.08, desktop: 1.12 },
    assetMaxHeight: { mobile: '70%', desktop: '74%' },
    assetMaxWidth: { mobile: '88%', desktop: '84%' },
    mediaPadding: { mobile: '1.1rem', desktop: '1.6rem' },
    shiftY: { mobile: '18px', desktop: '12px' },
    frameClassName: 'supplier-hero-frame--bright supplier-hero-frame--whitewash p-2.5 sm:p-3',
  },
  'Citi Quartz': {
    scale: { mobile: 2.45, desktop: 2.32 },
    assetMaxHeight: { mobile: '94%', desktop: '92%' },
    assetMaxWidth: { mobile: '94%', desktop: '92%' },
    mediaPadding: { mobile: '0.4rem', desktop: '0.65rem' },
    shiftX: { mobile: '0px', desktop: '1px' },
    shiftY: { mobile: '18px', desktop: '14px' },
    frameClassName: 'supplier-hero-frame--bright supplier-hero-frame--whitewash supplier-hero-frame--citi p-2.5 sm:p-3',
  },
};

function getResponsiveValue(values, fallback) {
  if (values === undefined || values === null) {
    return { mobile: fallback, desktop: fallback };
  }

  if (typeof values === 'object' && !Array.isArray(values)) {
    return {
      mobile: values.mobile ?? fallback,
      desktop: values.desktop ?? values.mobile ?? fallback,
    };
  }

  return { mobile: values, desktop: values };
}

function getHeroTreatmentStyle(treatment) {
  const mediaPadding = getResponsiveValue(treatment.mediaPadding, defaultHeroTreatment.mediaPadding.mobile);
  const assetMaxWidth = getResponsiveValue(treatment.assetMaxWidth, defaultHeroTreatment.assetMaxWidth.mobile);
  const assetMaxHeight = getResponsiveValue(treatment.assetMaxHeight, defaultHeroTreatment.assetMaxHeight.mobile);
  const scale = getResponsiveValue(treatment.scale, defaultHeroTreatment.scale.mobile);
  const shiftX = getResponsiveValue(treatment.shiftX, defaultHeroTreatment.shiftX.mobile);
  const shiftY = getResponsiveValue(treatment.shiftY, defaultHeroTreatment.shiftY.mobile);

  return {
    '--supplier-hero-media-padding-mobile': mediaPadding.mobile,
    '--supplier-hero-media-padding-desktop': mediaPadding.desktop,
    '--supplier-hero-asset-max-width-mobile': assetMaxWidth.mobile,
    '--supplier-hero-asset-max-width-desktop': assetMaxWidth.desktop,
    '--supplier-hero-asset-max-height-mobile': assetMaxHeight.mobile,
    '--supplier-hero-asset-max-height-desktop': assetMaxHeight.desktop,
    '--supplier-hero-scale-mobile': String(scale.mobile),
    '--supplier-hero-scale-desktop': String(scale.desktop),
    '--supplier-hero-shift-x-mobile': shiftX.mobile,
    '--supplier-hero-shift-x-desktop': shiftX.desktop,
    '--supplier-hero-shift-y-mobile': shiftY.mobile,
    '--supplier-hero-shift-y-desktop': shiftY.desktop,
  };
}

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
  const heroTreatmentStyle = getHeroTreatmentStyle(heroImageTreatment);
  const heroFrameStyle = supplier.heroBackground ? { backgroundColor: supplier.heroBackground } : undefined;
  const hasPhone = Boolean(supplier.phone);
  const hasHours = hoursLines.length > 0;
  const hasContactDetails = Boolean(supplier.address || supplier.phone || hoursLines.length);
  const galleryButtonLabel = showGallery
    ? 'Hide Curated Slabs'
    : isLoadingGallery
      ? 'Loading curated slabs...'
      : 'Browse Curated Slabs';
  const galleryButtonMobileLabel = showGallery
    ? 'Hide Slabs'
    : isLoadingGallery
      ? 'Loading...'
      : 'Browse Slabs';

  return (
    <section className="mb-4 rounded-[1.35rem] border border-border bg-surface p-3.5 shadow-soft sm:mb-7 sm:rounded-[1.55rem] sm:p-4.5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-stretch lg:gap-4">
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
            style={{ ...heroFrameStyle, ...heroTreatmentStyle }}
          >
            {shouldShowHeroImage ? (
              <div className="supplier-hero-card__asset-shell">
                <div className="supplier-hero-card__asset-wrap">
                  <Image
                    src={supplier.heroImage}
                    alt={`${supplier.name} supplier hero`}
                    width={512}
                    height={256}
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    className="supplier-hero-image supplier-hero-card__image h-auto w-auto object-contain object-center"
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
        <div className="flex min-h-full flex-col justify-between rounded-[1.15rem] border border-border/70 bg-panel/35 p-3 sm:rounded-[1.3rem] sm:p-4">
          <div>
            <h3 className="sr-only">{supplier.name}</h3>
            <p className="text-[0.94rem] leading-6 text-text sm:text-base">{supplier.note}</p>
            {hasContactDetails ? (
              <div className="supplier-contact-grid mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5">
                {supplier.address ? (
                  <div className="supplier-meta-card col-span-2">
                    <div className="supplier-meta-card__label">Address</div>
                    <div className="supplier-meta-card__value">{supplier.address}</div>
                  </div>
                ) : null}
                {hasPhone ? (
                  <div className={`supplier-meta-card ${hasHours ? 'col-span-1' : 'col-span-2 sm:col-span-1'}`.trim()}>
                    <div className="supplier-meta-card__label">Phone</div>
                    <div className="supplier-meta-card__value">{supplier.phone}</div>
                  </div>
                ) : null}
                {hasHours ? (
                  <div className={`supplier-meta-card ${hasPhone ? 'col-span-1' : 'col-span-2 sm:col-span-1'}`.trim()}>
                    <button
                      type="button"
                      className="supplier-hours-button"
                      aria-expanded={isHoursOpen}
                      aria-controls={hoursRegionId}
                      onClick={() => setIsHoursOpen((current) => !current)}
                    >
                      <span className="supplier-hours-button__summary">
                        <span className="supplier-meta-card__label">Hours</span>
                        <span className="supplier-hours-button__state">
                          {isHoursOpen ? 'Hide' : 'Show'}
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
          <div className="supplier-actions mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:gap-2.5">
            {onToggleGallery ? (
              <button
                type="button"
                className="supplier-secondary-button self-start sm:w-auto"
                onClick={onToggleGallery}
                disabled={isLoadingGallery}
                aria-label={galleryButtonLabel}
              >
                <span className="sm:hidden">{galleryButtonMobileLabel}</span>
                <span className="hidden sm:inline">{galleryButtonLabel}</span>
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
        <div className="mt-3 rounded-[1rem] border border-border/70 bg-panel/65 px-3.5 py-2.5 text-[0.82rem] leading-5 text-muted sm:mt-4 sm:text-sm sm:leading-6">
          Use Browse Curated Slabs when you want a quick preview without loading every supplier catalog upfront.
        </div>
      ) : null}
      {showGallery && isLoadingGallery ? (
        <div className="mt-3 rounded-[1rem] border border-border/70 bg-panel/65 px-3.5 py-2.5 text-[0.82rem] text-muted sm:mt-4 sm:text-sm">
          Loading slabs...
        </div>
      ) : null}
      {showGallery && galleryError ? (
        <div className="mt-3 rounded-[1rem] border border-border/70 bg-panel/65 px-3.5 py-2.5 text-[0.82rem] text-[#9f3a2b] sm:mt-4 sm:text-sm">
          {galleryError}
        </div>
      ) : null}
    </section>
  );
}
