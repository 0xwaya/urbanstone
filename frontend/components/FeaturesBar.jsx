import { homepageAnnouncement } from '../data/homepage-content';

export default function FeaturesBar({ announcement = homepageAnnouncement }) {
    return (
        <section aria-label="Current business announcement" className="py-2 sm:py-3">
            <article className="overflow-hidden rounded-2xl border border-border bg-[linear-gradient(135deg,rgba(61,110,196,0.16),rgba(244,239,231,0.04))] px-4 py-3 shadow-soft sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full border border-[rgba(74,144,226,0.35)] bg-[rgba(61,110,196,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b9d0ff]">{announcement.eyebrow}</div>
                        <div className="mt-3 text-lg font-semibold text-text sm:text-[1.35rem]">{announcement.title}</div>
                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{announcement.detail}</p>
                    </div>
                    <div className="hidden flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted lg:flex lg:justify-end">
                        {announcement.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-[rgba(74,144,226,0.3)] bg-panel/70 px-3 py-2 text-text">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </article>
        </section>
    );
}