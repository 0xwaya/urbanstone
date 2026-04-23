import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useId, useState } from 'react';

const TierGrid = dynamic(() => import('./TierGrid'));

export default function SupplierHero({
    supplier,
    showGallery = false,
    isLoadingGallery = false,
    galleryError,
    onToggleGallery,
}) {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const infoRegionId = useId();
    const infoRegionIdMobile = `${infoRegionId}-mobile`;
    const infoRegionIdDesktop = `${infoRegionId}-desktop`;
    const hoursLines = supplier.hoursLines || (supplier.hours
        ? [`Mon-Fri ${supplier.hours.mon_fri}${supplier.hours.sat ? ` · Sat ${supplier.hours.sat}` : ''}`]
        : []);
    const hasLocation = Boolean(supplier.address);
    const hasHours = hoursLines.length > 0;
    const hasContactDetails = Boolean(hasLocation || hoursLines.length);
    const galleryButtonLabel = showGallery
        ? 'Hide Curated Slabs'
        : isLoadingGallery
            ? 'Loading curated slabs...'
            : 'View Curated Slabs';
    const galleryButtonMobileLabel = showGallery
        ? 'Hide Slabs'
        : isLoadingGallery
            ? 'Loading...'
            : 'View Slabs';
    const supplierInitials = supplier.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');

    return (
        <section className="mb-3 rounded-[1.2rem] border border-border bg-surface p-2.5 shadow-soft sm:mb-7 sm:rounded-[1.55rem] sm:p-4.5">
            <div className="supplier-card">
                <div className="supplier-card__header">
                    <div className="supplier-brand-lockup">
                        <div className={`supplier-brand-mark${supplier.logo ? '' : ' supplier-brand-mark--placeholder'}`}>
                            {supplier.logo ? (
                                <Image
                                    src={supplier.logo}
                                    alt={`${supplier.name} logo`}
                                    width={72}
                                    height={72}
                                    className="supplier-logo-image h-auto w-auto object-contain"
                                    loading="lazy"
                                />
                            ) : (
                                <span className="supplier-brand-mark__placeholder-text" aria-hidden="true">{supplierInitials}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-text sm:text-2xl">{supplier.name}</h3>
                        </div>
                    </div>
                    {onToggleGallery ? (
                        <button
                            type="button"
                            className="supplier-primary-button"
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
                </div>

                {hasContactDetails ? (
                    <>
                        <div className="mt-3 sm:hidden">
                            <div className="supplier-meta-card">
                                <button
                                    type="button"
                                    className="supplier-hours-button"
                                    aria-expanded={isInfoOpen}
                                    aria-controls={infoRegionIdMobile}
                                    onClick={() => setIsInfoOpen((current) => !current)}
                                >
                                    <span className="supplier-hours-button__summary">
                                        <span className="supplier-meta-card__label">Location &amp; Hours</span>
                                        <span className="supplier-hours-button__state">
                                            {isInfoOpen ? 'Hide' : 'Show'}
                                        </span>
                                    </span>
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        aria-hidden="true"
                                        className={`supplier-chevron h-5 w-5 ${isInfoOpen ? 'rotate-180' : ''}`.trim()}
                                    >
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div id={infoRegionIdMobile} className={`${isInfoOpen ? 'mt-3 block' : 'hidden'}`}>
                                    <div className="supplier-hours-list">
                                        {hasLocation ? <div>{supplier.address}</div> : null}
                                        {hasLocation && hasHours ? <div className="my-2 border-t border-border/60" /> : null}
                                        {hasHours
                                            ? hoursLines.map((line) => (
                                                <div key={line}>{line}</div>
                                            ))
                                            : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="supplier-contact-grid mt-4 hidden grid-cols-1 gap-2.5 sm:grid sm:grid-cols-1 sm:gap-3">
                            <div className="supplier-meta-card">
                                <button
                                    type="button"
                                    className="supplier-hours-button"
                                    aria-expanded={isInfoOpen}
                                    aria-controls={infoRegionIdDesktop}
                                    onClick={() => setIsInfoOpen((current) => !current)}
                                >
                                    <span className="supplier-hours-button__summary">
                                        <span className="supplier-meta-card__label">Location &amp; Hours</span>
                                        <span className="supplier-hours-button__state">
                                            {isInfoOpen ? 'Hide' : 'Show'}
                                        </span>
                                    </span>
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        aria-hidden="true"
                                        className={`supplier-chevron h-5 w-5 ${isInfoOpen ? 'rotate-180' : ''}`.trim()}
                                    >
                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div id={infoRegionIdDesktop} className={`${isInfoOpen ? 'mt-3 block' : 'hidden'}`}>
                                    <div className="supplier-hours-list">
                                        {hasLocation ? <div>{supplier.address}</div> : null}
                                        {hasLocation && hasHours ? <div className="my-2 border-t border-border/60" /> : null}
                                        {hasHours
                                            ? hoursLines.map((line) => (
                                                <div key={line}>{line}</div>
                                            ))
                                            : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
            {showGallery && supplier.tiers ? (
                <div className="mt-7 sm:mt-8">
                    <TierGrid tiers={supplier.tiers} />
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
