import { homepageAnnouncement } from '../data/homepage-content';

function CheckIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" />
        </svg>
    );
}

/**
 * Homepage seasonal offer: copy on the left, featured product cutout on the right,
 * over a leathered black stone texture under a brand-navy overlay (dark in both themes).
 * Offer terms come from data/homepage-content.js (EN) and data/spanish-homepage-content.js (ES).
 */
export default function FeaturesBar({ announcement = homepageAnnouncement }) {
    const { image, seal } = announcement;
    const titleId = 'fall-promo-title';

    return (
        <section aria-label={announcement.sectionLabel || 'Current business announcement'} className="py-6 sm:py-8">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <article aria-labelledby={titleId} className={`fall-promo relative isolate overflow-hidden rounded-[1.75rem] border border-border shadow-soft`}>
                    <div aria-hidden="true" className="fall-promo__stone absolute inset-0 -z-20" />
                    <div aria-hidden="true" className="fall-promo__overlay absolute inset-0 -z-10" />

                    <div className="grid items-center gap-2 px-6 py-7 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-8 lg:py-12">
                        <div className="min-w-0">
                            <div className="fall-promo__eyebrow inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em]">
                                <span aria-hidden="true" className="fall-promo__dot h-1.5 w-1.5 rounded-full" />
                                {announcement.eyebrow}
                            </div>
                            <h2 id={titleId} className="mt-4 max-w-xl font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-text sm:text-[2.6rem] lg:text-[3rem]">
                                {announcement.title}
                            </h2>
                            <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
                                {announcement.detail}
                            </p>
                            {announcement.tags?.length ? (
                                <ul className="mt-5 flex flex-wrap gap-2">
                                    {announcement.tags.map((tag) => (
                                        <li key={tag} className="fall-promo__tag inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-text">
                                            <CheckIcon />
                                            {tag}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                                <a href={announcement.ctaHref} className="brand-button-primary self-start px-6 py-3 text-sm font-semibold">
                                    {announcement.ctaLabel}
                                    <span aria-hidden="true" className="ml-2">→</span>
                                </a>
                                {announcement.disclaimer ? (
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                                        {announcement.disclaimer}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {image ? (
                            <div className="relative order-first mx-auto w-full max-w-[22rem] pt-2 sm:max-w-md lg:order-none lg:max-w-none lg:pt-0">
                                <div aria-hidden="true" className="fall-promo__halo absolute inset-x-[6%] inset-y-[10%] rounded-full" />
                                <picture>
                                    <source type="image/webp" srcSet={image.webp} />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={image.png}
                                        alt={image.alt}
                                        width={image.width}
                                        height={image.height}
                                        decoding="async"
                                        className="fall-promo__sink relative h-auto w-full"
                                    />
                                </picture>
                                {seal ? (
                                    <div aria-hidden="true" className="fall-promo__seal absolute -top-1 right-1 flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full text-center sm:-top-3 sm:right-2 sm:h-24 sm:w-24">
                                        <span className="font-display text-2xl font-bold leading-none sm:text-[1.7rem]">{seal.top}</span>
                                        <span className="mt-1 max-w-[4.4rem] text-[0.6rem] font-extrabold uppercase leading-tight tracking-[0.12em]">{seal.bottom}</span>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </article>
            </div>
        </section>
    );
}
