import Link from 'next/link';

import { serviceAreas } from '../data/service-areas';

export default function ServiceAreasSection() {
    return (
        <section className="mt-6 rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:mt-8 sm:p-6">
            <div className="eyebrow">Service areas</div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">City Pages for Greater Cincinnati Countertop Projects</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                Explore local pages for quartz countertops, granite countertops, and quartzite countertops in the cities and suburbs we target most heavily around downtown Cincinnati.
            </p>
            <Link href="/coverage" className="mt-4 inline-flex font-semibold text-text transition hover:text-accent">
                Browse the full coverage hub
            </Link>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {serviceAreas.map((area) => (
                    <Link
                        key={area.slug}
                        href={`/service-areas/${area.slug}`}
                        className="rounded-2xl border border-border bg-panel/70 p-4 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
                    >
                        <div className="text-xs uppercase tracking-[0.24em] text-muted">{area.state}</div>
                        <div className="mt-2 text-xl font-semibold text-text">{area.city}</div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                            Quartz, granite, and quartzite countertops for {area.city}-area kitchens, baths, bars, and remodels.
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}