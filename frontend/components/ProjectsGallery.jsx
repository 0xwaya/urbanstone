import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { projectsContent } from '../data/projects-content';

function Lightbox({ project, index, labels, onClose, onMove }) {
    const closeRef = useRef(null);
    const photo = project.photos[index];
    const many = project.photos.length > 1;

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
            if (many && event.key === 'ArrowRight') onMove(1);
            if (many && event.key === 'ArrowLeft') onMove(-1);
        };
        document.addEventListener('keydown', onKey);
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [many, onClose, onMove]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={project.title}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-8"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-5xl">
                <Image
                    src={photo.src}
                    width={photo.width}
                    height={photo.height}
                    alt={photo.alt}
                    sizes="(min-width: 1024px) 1024px, 100vw"
                    className="h-auto max-h-[80vh] w-full rounded-2xl object-contain"
                />
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/85">
                    <span>{project.title}{many ? ` · ${index + 1} ${labels.of} ${project.photos.length}` : ''}</span>
                    <div className="flex gap-2">
                        {many ? (
                            <>
                                <button type="button" className="rounded-full border border-white/40 px-3 py-1.5 hover:bg-white/10" aria-label={labels.prev} onClick={() => onMove(-1)}>←</button>
                                <button type="button" className="rounded-full border border-white/40 px-3 py-1.5 hover:bg-white/10" aria-label={labels.next} onClick={() => onMove(1)}>→</button>
                            </>
                        ) : null}
                        <button ref={closeRef} type="button" className="rounded-full border border-white/40 px-3 py-1.5 hover:bg-white/10" onClick={onClose}>{labels.close}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProjectsGallery({ language = 'en' }) {
    const copy = projectsContent[language] || projectsContent.en;
    const [open, setOpen] = useState(null); // { project, index }
    const lastTrigger = useRef(null);

    const close = useCallback(() => {
        setOpen(null);
        lastTrigger.current?.focus();
    }, []);
    const move = useCallback((step) => {
        setOpen((cur) => (cur ? { ...cur, index: (cur.index + step + cur.project.photos.length) % cur.project.photos.length } : cur));
    }, []);
    const show = (project, index) => (event) => {
        lastTrigger.current = event.currentTarget;
        setOpen({ project, index });
    };

    return (
        <section id="projects" aria-labelledby="projects-heading" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
            <div className="rounded-[2rem] border border-border bg-surface/65 p-6 shadow-soft backdrop-blur sm:p-8">
                <div className="eyebrow">{copy.eyebrow}</div>
                <h2 id="projects-heading" className="mt-1 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
                    {copy.title}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg">{copy.intro}</p>

                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {copy.projects.map((project, projectIndex) => {
                        const [lead, ...rest] = project.photos;
                        return (
                            <li key={project.id} className="overflow-hidden rounded-[1.35rem] border border-border bg-panel/75">
                                <button
                                    type="button"
                                    className="group relative block aspect-[3/2] w-full overflow-hidden"
                                    onClick={show(project, 0)}
                                    aria-label={`${copy.viewLabel}: ${project.title} (${copy.photoCount(project.photos.length)})`}
                                >
                                    <Image
                                        src={lead.src}
                                        alt={lead.alt}
                                        fill
                                        sizes="(min-width: 1024px) 540px, (min-width: 640px) 50vw, 100vw"
                                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                                        priority={projectIndex === 0}
                                    />
                                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{project.tag}</span>
                                </button>
                                <div className="flex items-start justify-between gap-3 p-4">
                                    <div>
                                        <h3 className="font-display text-lg font-semibold text-text">{project.title}</h3>
                                        <p className="mt-1 text-sm leading-6 text-muted">{project.text}</p>
                                    </div>
                                    {rest.length ? (
                                        <div className="flex shrink-0 gap-2">
                                            {rest.map((p, i) => (
                                                <button
                                                    key={p.src}
                                                    type="button"
                                                    className="relative h-12 w-16 overflow-hidden rounded-lg border border-border"
                                                    onClick={show(project, i + 1)}
                                                    aria-label={`${copy.viewLabel}: ${p.alt}`}
                                                >
                                                    <Image src={p.src} alt="" fill sizes="64px" className="object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-6 flex justify-end border-t border-border/70 pt-5">
                    <a className="brand-button-primary rounded-md px-5 py-3 text-center font-semibold" href="#quote">{copy.cta}</a>
                </div>
            </div>
            {open ? <Lightbox project={open.project} index={open.index} labels={copy.lightbox} onClose={close} onMove={move} /> : null}
        </section>
    );
}
