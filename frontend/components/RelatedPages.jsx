import Link from 'next/link';

export default function RelatedPages({ eyebrow = 'Related pages', title, sections, footerLink }) {
    const populatedSections = sections.filter((section) => section.links && section.links.length > 0);

    if (populatedSections.length === 0 && !footerLink) {
        return null;
    }

    return (
        <section className="mt-10 rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:p-6">
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
            <div className={`mt-6 grid gap-6 ${populatedSections.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                {populatedSections.map((section) => (
                    <div key={section.label} className="rounded-2xl border border-border bg-panel/70 p-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-muted">{section.label}</div>
                        <div className="mt-4 grid gap-2 text-sm">
                            {section.links.map((link) => (
                                <Link key={`${section.label}-${link.href}`} href={link.href} className="font-semibold text-text transition hover:text-accent">
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {footerLink ? (
                <div className="mt-6 text-sm leading-7 text-muted">
                    <Link href={footerLink.href} className="font-semibold text-text transition hover:text-accent">
                        {footerLink.label}
                    </Link>
                </div>
            ) : null}
        </section>
    );
}