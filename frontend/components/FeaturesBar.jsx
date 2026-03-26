const features = [
    {
        label: 'Lead time',
        value: '3-5 days',
        detail: 'Measured, fabricated, and installed on a tight residential schedule.',
    },
    {
        label: 'Suppliers',
        value: '5 curated partners',
        detail: 'A mix of large national inventory and regional showroom access.',
    },
    {
        label: 'Material format',
        value: '3cm slabs',
        detail: 'Focused on durable countertop installs with practical sourcing.',
    },
    {
        label: 'Service footprint',
        value: 'Cincinnati metro',
        detail: 'Built for homeowners, investors, and fast-moving renovation teams.',
    },
];

export default function FeaturesBar() {
    return (
        <section aria-label="Key business highlights" className="grid gap-4 py-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
                <article key={feature.label} className="rounded-2xl border border-border bg-surface/75 p-5 shadow-soft">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted">{feature.label}</div>
                    <div className="mt-3 text-2xl font-semibold text-text">{feature.value}</div>
                    <p className="mt-2 text-sm text-muted">{feature.detail}</p>
                </article>
            ))}
        </section>
    );
}