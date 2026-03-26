import { useState } from 'react';

export default function TierGrid({ tiers }) {
  const [activeSlab, setActiveSlab] = useState(null);

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
                aria-label={`View ${slab.name} slab image`}
              >
                {slab.image ? (
                  <img src={slab.image} alt={slab.name} className="h-24 w-full rounded-md object-cover mb-3" />
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <div className="bg-surface border border-border rounded-2xl max-w-4xl w-full p-6 relative">
            <button
              type="button"
              onClick={() => setActiveSlab(null)}
              className="absolute top-4 right-4 text-sm text-muted hover:text-text"
              aria-label="Close slab preview"
            >
              Close
            </button>
            <div className="text-xl font-semibold mb-2">{activeSlab.name}</div>
            <div className="text-sm text-muted mb-4">{activeSlab.notes}</div>
            {activeSlab.imageLarge || activeSlab.image ? (
              <img
                src={activeSlab.imageLarge || activeSlab.image}
                alt={`${activeSlab.name} full slab`}
                className="w-full max-h-[70vh] object-contain rounded-xl border border-border"
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
