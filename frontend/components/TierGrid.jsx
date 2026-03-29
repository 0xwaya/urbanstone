import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function TierGrid({ tiers }) {
  const [activeSlab, setActiveSlab] = useState(null);

  useEffect(() => {
    if (!activeSlab) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        setActiveSlab(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [activeSlab]);

  return (
    <div className="space-y-6">
      {tiers.map((tier) => (
        <div key={tier.name} className="rounded-2xl border border-border bg-panel p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="text-lg font-semibold sm:text-[1.1rem]">{tier.name}</div>
            <div className="text-sm text-muted">{tier.range}</div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tier.slabs.map((slab) => (
              <button
                key={slab.name}
                type="button"
                onClick={() => setActiveSlab(slab)}
                className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-xl"
                aria-label={`View ${slab.name} material image`}
              >
                {slab.image ? (
                  <Image
                    src={slab.image}
                    alt={slab.name}
                    width={480}
                    height={320}
                    sizes="(min-width: 1280px) 22vw, (min-width: 768px) 40vw, 100vw"
                    className="mb-4 aspect-[4/3] w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="mb-4 aspect-[4/3] rounded-xl border border-border bg-gradient-to-br from-panel to-bg" />
                )}
                <div className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-muted transition group-hover:text-accent">
                  Curated slab
                </div>
                <div className="mt-2 text-[1.1rem] font-semibold leading-tight text-text sm:text-[1.2rem]">{slab.name}</div>
                <div className="mt-2 flex-1 text-sm leading-7 text-muted">{slab.notes}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted">Next step</div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text sm:text-[0.95rem]">
          After you shortlist a few slab directions, contact Urban Stone for final stone selection, measurements, deposit, fabrication planning, and installation scheduling.
        </p>
        <div className="mt-4">
          <a className="materials-next-step-button" href="#quote">
            Talk Through Next Steps
          </a>
        </div>
      </div>

      {activeSlab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true" onClick={() => setActiveSlab(null)}>
          <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-surface p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveSlab(null)}
              className="absolute top-4 right-4 text-sm text-muted hover:text-text"
              aria-label="Close material preview"
            >
              Close
            </button>
            <div className="text-xl font-semibold mb-2">{activeSlab.name}</div>
            <div className="text-sm text-muted mb-4">{activeSlab.notes}</div>
            {activeSlab.imageLarge || activeSlab.image ? (
              <Image
                src={activeSlab.imageLarge || activeSlab.image}
                alt={`${activeSlab.name} full material`}
                width={1440}
                height={960}
                sizes="100vw"
                className="w-full max-h-[72vh] rounded-xl border border-border object-contain"
                loading="eager"
              />
            ) : (
              <div className="h-96 rounded-xl bg-gradient-to-br from-panel to-bg border border-border" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
