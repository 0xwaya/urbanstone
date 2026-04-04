import { homepageAnnouncement } from '../data/homepage-content';

export default function FeaturesBar({ announcement = homepageAnnouncement }) {
    return (
        <section aria-label="Current business announcement" className="py-2 sm:py-3">
            <article className="feature-highlight feature-highlight--spring overflow-hidden rounded-2xl border border-border px-4 py-3 shadow-soft sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="feature-highlight-badge feature-highlight-badge--spring inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">{announcement.eyebrow}</div>
                        <div className="mt-3 text-lg font-semibold text-text sm:text-[1.5rem]">{announcement.title}</div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{announcement.detail}</p>
                        {announcement.disclaimer ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.1em] text-muted/90">{announcement.disclaimer}</p> : null}
                    </div>
                    <div className="hidden flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted lg:flex lg:justify-end">
                        {announcement.tags.map((tag) => (
                            <span key={tag} className="feature-highlight-tag rounded-full px-3 py-2 text-text">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </article>
        </section>
    );
}