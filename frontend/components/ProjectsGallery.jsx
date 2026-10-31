import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { projectsContent } from '../data/projects-content';
import { getFeaturedProjects, getProjects } from '../data/projects';
import { ListingLink, useProjectLightbox } from './projects/ProjectLightbox';

const INTERVAL_MS = 6500;

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(Boolean(mq.matches));
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return reduced;
}

/**
 * Homepage "Our work" section: an auto-rotating carousel of featured projects (data/projects.js).
 * Pauses on hover, keyboard focus, when the tab is hidden or the lightbox is open; never auto-plays
 * with prefers-reduced-motion; swipe on touch; prev/next, dots and a pause/play button.
 */
export default function ProjectsGallery({ language = 'en', intervalMs = INTERVAL_MS }) {
    const copy = projectsContent[language] || projectsContent.en;
    const projects = getFeaturedProjects(language);
    const count = projects.length;
    const allHref = language === 'es' ? '/es/projects' : '/projects';

    const reducedMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const [userPaused, setUserPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [loaded, setLoaded] = useState(() => new Set([0, 1 % Math.max(count, 1)]));
    const touchX = useRef(null);
    const [lightbox, openLightbox, lightboxOpen] = useProjectLightbox(copy.lightbox);

    const autoplay = count > 1 && !reducedMotion && !userPaused;
    const running = autoplay && !hovered && !focused && !hidden && !lightboxOpen;

    const go = useCallback((next) => {
        setIndex(((next % count) + count) % count);
    }, [count]);

    // Only load images for the current slide and its neighbours (plus any already seen).
    useEffect(() => {
        if (!count) return;
        setLoaded((prev) => {
            const want = [index, (index + 1) % count, (index - 1 + count) % count];
            if (want.every((i) => prev.has(i))) return prev;
            return new Set([...prev, ...want]);
        });
    }, [index, count]);

    useEffect(() => {
        if (!running) return undefined;
        const t = setTimeout(() => go(index + 1), intervalMs);
        return () => clearTimeout(t);
    }, [running, index, go, intervalMs]);

    useEffect(() => {
        const onVis = () => setHidden(document.visibilityState === 'hidden');
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    if (!count) return null;

    const onKeyDown = (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    };
    const ctrl = 'inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-border bg-panel/70 px-3 text-sm font-semibold text-text transition hover:border-accent hover:text-accent';

    return (
        <section id="projects" aria-labelledby="projects-heading" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
            <div className="rounded-[2rem] border border-border bg-surface/65 p-6 shadow-soft backdrop-blur sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="eyebrow">{copy.eyebrow}</div>
                        <h2 id="projects-heading" className="mt-1 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl">{copy.title}</h2>
                        <p className="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg">{copy.intro}</p>
                    </div>
                    <Link href={allHref} className="shrink-0 text-sm font-semibold text-accent underline underline-offset-4 hover:text-text">
                        {copy.seeAll} →
                    </Link>
                </div>

                <div
                    className="mt-6"
                    role="region"
                    aria-roledescription="carousel"
                    aria-label={copy.carousel.label}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onFocus={() => setFocused(true)}
                    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
                    onKeyDown={onKeyDown}
                >
                    <div
                        className="overflow-hidden rounded-[1.35rem] border border-border bg-panel/75"
                        onTouchStart={(event) => { touchX.current = event.touches[0].clientX; }}
                        onTouchEnd={(event) => {
                            if (touchX.current === null) return;
                            const dx = event.changedTouches[0].clientX - touchX.current;
                            touchX.current = null;
                            if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
                        }}
                    >
                        <div
                            className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
                            style={{ transform: `translateX(-${index * 100}%)` }}
                            aria-live={running ? 'off' : 'polite'}
                        >
                            {projects.map((project, i) => {
                                const active = i === index;
                                const lead = project.photos[0];
                                return (
                                    <div
                                        key={project.id}
                                        role="group"
                                        aria-roledescription="slide"
                                        aria-label={`${copy.carousel.slide(i + 1, count)}: ${project.title}`}
                                        aria-hidden={!active}
                                        inert={!active}
                                        className="grid w-full shrink-0 grid-cols-1 md:grid-cols-3"
                                    >
                                        <button
                                            type="button"
                                            className="group relative block aspect-[3/2] w-full overflow-hidden bg-surface md:col-span-2"
                                            onClick={openLightbox(project, 0)}
                                            aria-label={`${copy.viewLabel}: ${project.title}, ${project.location} (${copy.photoCount(project.photos.length)})`}
                                        >
                                            {loaded.has(i) ? (
                                                <Image
                                                    src={lead.src}
                                                    alt={lead.alt}
                                                    fill
                                                    sizes="(min-width: 1024px) 720px, (min-width: 768px) 66vw, 100vw"
                                                    className="object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                                    priority={i === 0}
                                                />
                                            ) : null}
                                            {project.tag ? <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{project.tag}</span> : null}
                                        </button>
                                        <div className="flex flex-col justify-between gap-4 p-5">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{project.location}</p>
                                                <h3 className="mt-1 font-display text-2xl font-semibold text-text">{project.title}</h3>
                                                <p className="mt-2 text-sm leading-6 text-muted">{project.text}</p>
                                                <ListingLink listing={project.listing} className="mt-3" />
                                            </div>
                                            <button type="button" className="self-start rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-accent hover:text-accent" onClick={openLightbox(project, 0)}>
                                                {copy.viewPhotos(project.photos.length)}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {count > 1 ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <button type="button" className={ctrl} aria-label={copy.carousel.prev} onClick={() => go(index - 1)}>←</button>
                                <button type="button" className={ctrl} aria-label={copy.carousel.next} onClick={() => go(index + 1)}>→</button>
                                {!reducedMotion ? (
                                    <button
                                        type="button"
                                        className={ctrl}
                                        aria-label={autoplay ? copy.carousel.pause : copy.carousel.play}
                                        aria-pressed={!autoplay}
                                        onClick={() => setUserPaused((p) => !p)}
                                    >
                                        {autoplay ? '❚❚' : '▶'}
                                    </button>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-1.5">
                                {projects.map((project, i) => (
                                    <button
                                        key={project.id}
                                        type="button"
                                        className="flex h-6 w-6 items-center justify-center"
                                        aria-label={copy.carousel.goTo(i + 1)}
                                        aria-current={i === index ? 'true' : undefined}
                                        onClick={() => go(i)}
                                    >
                                        <span className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${i === index ? 'w-6 bg-accent' : 'w-2 bg-border'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={allHref} className="text-sm font-semibold text-text underline underline-offset-4 hover:text-accent">
                        {copy.seeAll} ({getProjects(language).length})
                    </Link>
                    <a className="brand-button-primary rounded-md px-5 py-3 text-center font-semibold" href="#quote">{copy.cta}</a>
                </div>
            </div>
            {lightbox}
        </section>
    );
}
