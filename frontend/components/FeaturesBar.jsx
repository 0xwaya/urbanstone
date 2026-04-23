import { homepageAnnouncement } from '../data/homepage-content';

export default function FeaturesBar({ announcement = homepageAnnouncement }) {
    return (
        <section aria-label="Current business announcement" className="py-6 sm:py-8">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <article
                    className="backdrop-blur-xl glassmorphism-gradient border border-border rounded-3xl px-6 py-6 sm:px-10 sm:py-8 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                    style={{ boxShadow: '0 8px 48px 0 rgba(74,144,226,0.10), 0 1.5px 12px 0 rgba(255,255,255,0.10) inset' }}
                >
                    <div className="flex-1 min-w-0">
                        <div className="feature-highlight-badge feature-highlight-badge--spring inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] mb-3 shadow-md bg-gradient-to-r from-pink-400/20 to-indigo-400/10">
                            {announcement.eyebrow}
                        </div>
                        <div className="text-2xl font-bold font-display text-text drop-shadow-sm sm:text-3xl md:text-4xl mb-2 tracking-tight">
                            {announcement.title}
                        </div>
                        <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg mb-2">
                            {announcement.detail}
                        </p>
                        {announcement.disclaimer ? (
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.1em] text-muted/90">
                                {announcement.disclaimer}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-row flex-wrap gap-2 items-center justify-end min-w-[220px]">
                        {announcement.tags.map((tag) => (
                            <span
                                key={tag}
                                className="feature-highlight-tag rounded-full px-4 py-2 text-xs font-semibold text-text bg-gradient-to-r from-accent/20 to-pink-400/10 shadow"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </article>
            </div>
        </section>
    );
}