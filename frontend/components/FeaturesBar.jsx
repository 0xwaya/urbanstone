import { homepageAnnouncement } from '../data/homepage-content';

export default function FeaturesBar({ announcement = homepageAnnouncement }) {
    return (
        <section aria-label="Current business announcement" className="py-2 sm:py-3">
            <article className="rounded-2xl border border-border bg-surface/75 px-4 py-3 shadow-soft sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="text-xs uppercase tracking-[0.24em] text-muted">{announcement.eyebrow}</div>
                        <div className="mt-1.5 text-base font-semibold text-text sm:text-lg">{announcement.title}</div>
                        <p className="mt-1.5 text-sm leading-6 text-muted">{announcement.detail}</p>
                    </div>
                    <div className="hidden flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted lg:flex lg:justify-end">
                        {announcement.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-border bg-panel/70 px-3 py-2">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </article>
        </section>
    );
}