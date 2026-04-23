export default function Hero() {
  return (
    <section className="py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-[2rem] border border-border bg-surface/65 p-6 shadow-soft backdrop-blur sm:p-8">
            <div className="eyebrow">Cincinnati fabrication and install</div>
            <h1 className="max-w-[11ch] font-display text-[2.5rem] font-semibold leading-[0.94] sm:max-w-none sm:text-5xl md:text-6xl">
              Premium Countertops. Fast Install. Built for Cincinnati.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
              We source premium slabs from curated suppliers and fabricate custom quartz, granite, and quartzite countertops
              with a 3-5 day turnaround from deposit to install.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
              <span className="hero-chip hero-chip--accent">3-5 Day Install</span>
              <span className="hero-chip">Curated Supplier Network</span>
              <span className="hero-chip">1-Year Install Guarantee</span>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-4">
              <a className="brand-button-primary rounded-md px-5 py-3 font-semibold" href="#quote">
                Request Estimate
              </a>
              <a className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:-translate-y-0.5 hover:border-accent" href="#suppliers">
                Browse Curated Slabs
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-border bg-panel/80 p-5 shadow-soft sm:p-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[1.35rem] border border-border bg-surface/70 px-3 py-4 text-center">
                  <div className="text-2xl font-display font-semibold text-text sm:text-3xl">3-5</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Days to install</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-surface/70 px-3 py-4 text-center">
                  <div className="text-2xl font-display font-semibold text-text sm:text-3xl">5</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Curated suppliers</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-surface/70 px-3 py-4 text-center">
                  <div className="text-2xl font-display font-semibold text-text sm:text-3xl">1 yr</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Install warranty</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-surface/70 p-5 shadow-soft sm:p-6">
              <div className="eyebrow mb-2">What happens next</div>
              <div className="grid gap-3">
                <div className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-4">
                  <div className="text-sm font-semibold text-text">1. Send layout or inspiration</div>
                  <div className="mt-1 text-sm leading-6 text-muted">Photos, rough measurements, or a cabinet drawing is enough to start.</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-4">
                  <div className="text-sm font-semibold text-text">2. Shortlist slab directions</div>
                  <div className="mt-1 text-sm leading-6 text-muted">We narrow the material lane before you spend time visiting every supplier.</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-4">
                  <div className="text-sm font-semibold text-text">3. Measure, fabricate, install</div>
                  <div className="mt-1 text-sm leading-6 text-muted">Urban Stone handles field measure, final stone coordination, fabrication, and install.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
