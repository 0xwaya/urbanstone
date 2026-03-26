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
        <div key={tier.name} className="bg-panel border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">{tier.name}</div>
            <div className="text-sm text-muted">{tier.range}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tier.slabs.map((slab) => (
              <button
                key={slab.name}
                type="button"
                onClick={() => setActiveSlab(slab)}
                className="text-left bg-surface border border-border rounded-lg p-4 hover:border-accent hover:-translate-y-1 hover:shadow-xl transition"
                aria-label={`View ${slab.name} material image`}
              >
                {slab.image ? (
                  <Image
                    src={slab.image}
                    alt={slab.name}
                    width={320}
                    height={96}
                    sizes="(min-width: 1024px) 16vw, (min-width: 640px) 40vw, 100vw"
                    className="mb-3 h-24 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-24 rounded-md bg-gradient-to-br from-panel to-bg border border-border mb-3" />
                )}
                <div className="font-semibold">{slab.name}</div>
                <div className="text-sm text-muted">{slab.notes}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {activeSlab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true" onClick={() => setActiveSlab(null)}>
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-surface p-6" onClick={(event) => event.stopPropagation()}>
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
                className="w-full max-h-[70vh] object-contain rounded-xl border border-border"
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
