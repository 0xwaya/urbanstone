import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Full-screen photo viewer. Esc closes, arrow keys page, swipe on touch. */
export function ProjectLightbox({ project, index, labels, onClose, onMove }) {
    const closeRef = useRef(null);
    const touchX = useRef(null);
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
            onTouchStart={(event) => { touchX.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
                if (!many || touchX.current === null) return;
                const dx = event.changedTouches[0].clientX - touchX.current;
                touchX.current = null;
                if (Math.abs(dx) > 40) onMove(dx < 0 ? 1 : -1);
            }}
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
                    <span>{project.title} · {project.location}{many ? ` · ${index + 1} ${labels.of} ${project.photos.length}` : ''}</span>
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

/** State helper: returns [lightboxElement|null, open(project, index) => clickHandler]. */
export function useProjectLightbox(labels) {
    const [open, setOpen] = useState(null);
    const lastTrigger = useRef(null);
    const close = useCallback(() => {
        setOpen(null);
        lastTrigger.current?.focus();
    }, []);
    const move = useCallback((step) => {
        setOpen((cur) => (cur ? { ...cur, index: (cur.index + step + cur.project.photos.length) % cur.project.photos.length } : cur));
    }, []);
    const show = useCallback((project, index = 0) => (event) => {
        lastTrigger.current = event?.currentTarget || null;
        setOpen({ project, index });
    }, []);
    const element = open ? <ProjectLightbox project={open.project} index={open.index} labels={labels} onClose={close} onMove={move} /> : null;
    return [element, show, Boolean(open)];
}

export function ListingLink({ listing, className = '' }) {
    if (!listing) return null;
    return (
        <p className={`text-sm text-muted ${className}`}>
            {listing.text}:{' '}
            <a className="font-semibold text-accent underline underline-offset-4 hover:text-text" href={listing.url} target="_blank" rel="noopener noreferrer nofollow">
                {listing.linkText} ↗
            </a>
        </p>
    );
}
