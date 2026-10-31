import Image from 'next/image';

/** Grid card used on /projects. Images are lazy-loaded (next/image default). */
export default function ProjectCard({ project, copy, onOpen }) {
    const [lead, ...rest] = project.photos;
    return (
        <li className="overflow-hidden rounded-[1.35rem] border border-border bg-panel/75">
            <button
                type="button"
                className="group relative block aspect-[3/2] w-full overflow-hidden"
                onClick={onOpen(project, 0)}
                aria-label={`${copy.viewLabel}: ${project.title}, ${project.location} (${copy.photoCount(project.photos.length)})`}
            >
                <Image
                    src={lead.src}
                    alt={lead.alt}
                    fill
                    sizes="(min-width: 1024px) 540px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                {project.tag ? <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{project.tag}</span> : null}
            </button>
            <div className="flex min-w-0 flex-col gap-3 p-4">
                {rest.length ? (
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                        {rest.map((p, i) => (
                            <button key={p.src} type="button" className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border" onClick={onOpen(project, i + 1)} aria-label={`${copy.viewLabel}: ${p.alt}`}>
                                <Image src={p.src} alt="" fill sizes="80px" className="object-cover" />
                            </button>
                        ))}
                    </div>
                ) : null}
                <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-text">{project.title}</h3>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{project.location}</p>
                    <p className="mt-1 text-justify text-sm leading-6 text-muted hyphens-auto sm:text-left">{project.text}</p>
                </div>
            </div>
        </li>
    );
}
