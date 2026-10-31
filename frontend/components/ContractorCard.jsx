import Link from 'next/link';
import { contractorPartnerContent } from '../data/services-content';

export default function ContractorCard({ language = 'en' }) {
    const copy = contractorPartnerContent[language] || contractorPartnerContent.en;
    return (
        <div id="contractors" className="scroll-mt-28 rounded-2xl border border-border bg-surface p-8">
            <p className="eyebrow mb-2">{copy.eyebrow}</p>
            <h2 className="mb-2 max-w-3xl font-display text-xl font-semibold text-text sm:text-2xl">{copy.title}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">{copy.intro}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {copy.paths.map((path) => (
                    <div key={path.title} className="rounded-[1.35rem] border border-border bg-panel/75 p-5">
                        <h3 className="text-base font-semibold text-text">{path.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted">{path.text}</p>
                    </div>
                ))}
            </div>
            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-muted">{copy.multiUnit}</p>
                <div className="flex flex-shrink-0 flex-wrap gap-3">
                    <a
                        href="#quote"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-border px-6 py-3 font-semibold transition hover:border-accent"
                    >
                        {copy.talkLabel}
                    </a>
                    <Link href="/contractors/login" className="brand-button-primary inline-block whitespace-nowrap px-8 py-3">
                        {copy.portalLabel}
                    </Link>
                </div>
            </div>
        </div>
    );
}
