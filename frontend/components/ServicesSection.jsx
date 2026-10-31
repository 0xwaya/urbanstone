import { servicesContent } from '../data/services-content';

export default function ServicesSection({ language = 'en' }) {
    const copy = servicesContent[language] || servicesContent.en;
    return (
        <section id="services" aria-labelledby="services-heading" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
            <div className="rounded-[2rem] border border-border bg-surface/65 p-6 shadow-soft backdrop-blur sm:p-8">
                <div className="eyebrow">{copy.eyebrow}</div>
                <h2 id="services-heading" className="mt-1 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
                    {copy.title}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg">{copy.intro}</p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {copy.groups.map((group) => (
                        <article key={group.title} className="rounded-[1.35rem] border border-border bg-panel/75 p-5">
                            <h3 className="font-display text-xl font-semibold text-text">{group.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted">{group.text}</p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {group.items.map((item) => (
                                    <li key={item} className="hero-chip text-xs">{item}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-border/70 pt-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{copy.tradesTitle}</div>
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {copy.trades.map((trade) => (
                                <li key={trade} className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-semibold text-text">{trade}</li>
                            ))}
                        </ul>
                    </div>
                    <a className="brand-button-primary shrink-0 rounded-md px-5 py-3 text-center font-semibold" href="#quote">
                        {copy.cta}
                    </a>
                </div>
            </div>
        </section>
    );
}
