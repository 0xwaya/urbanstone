export default function Hero() {
  return (
    <section className="grid grid-cols-1 items-center gap-8 py-8 sm:gap-10 sm:py-10 lg:grid-cols-2 lg:py-14">
      <div>
        <div className="eyebrow">Cincinnati fabrication and install</div>
        <h1 className="max-w-[11ch] font-display text-[2.5rem] font-semibold leading-[0.94] sm:max-w-none sm:text-5xl md:text-6xl">
          Premium Countertops. Fast Install. Built for Cincinnati.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
          We source premium slabs from 5 top suppliers and fabricate custom 3cm countertops with a
          3–5 day turnaround from deposit to install.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-border bg-panel px-3 py-1 text-sm">3–5 Day Install</span>
          <span className="rounded-full border border-border bg-panel px-3 py-1 text-sm">1-Year Install Guarantee</span>
          <span className="rounded-full border border-border bg-panel px-3 py-1 text-sm">No Material Warranty (Supplier)</span>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <a className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accentDark hover:shadow-xl" href="#quote">
            Request Estimate
          </a>
          <a className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:-translate-y-0.5 hover:border-accent" href="#suppliers">
            View Materials
          </a>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-panel p-4 shadow-soft sm:p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
        <div className="text-xs uppercase tracking-[0.18em] text-muted sm:text-sm">DBA Rebrand Coming Soon</div>
        <div className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Urban Stone Collective</div>
        <div className="mt-2 max-w-md text-sm text-muted sm:text-base">Final brand reveal after launch, with the current site acting as the high-conviction sales layer during rollout.</div>
        <div className="mt-5 grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:mt-6 sm:p-5 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F0] text-center text-[#0A0A0A] sm:h-20 sm:w-20">
            <div className="font-display text-2xl tracking-[0.12em]">USC</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted">UrbanStone Brand Sample</div>
            <div className="mt-2 font-display text-xl sm:text-2xl">
              Urban<span className="italic text-[#C9A96E]">Stone</span>
            </div>
            <div className="mt-2 text-sm text-muted">
              Precision-fabricated stone for architects, designers, and builders who demand more.
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] sm:text-[11px] sm:tracking-[0.15em]">
              <span className="rounded-full border border-border bg-panel px-3 py-1 text-muted">Explore Brand Kit</span>
              <span className="rounded-full border border-border px-3 py-1 text-muted">View Wireframe</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="h-3 w-6 rounded-sm border border-border" style={{ background: "#0A0A0A" }} />
              <span className="h-3 w-6 rounded-sm border border-border" style={{ background: "#111113" }} />
              <span className="h-3 w-6 rounded-sm border border-border" style={{ background: "#161618" }} />
              <span className="h-3 w-6 rounded-sm border border-border" style={{ background: "#9B7A44" }} />
              <span className="h-3 w-6 rounded-sm border border-border" style={{ background: "#C9A96E" }} />
              <span className="h-3 w-6 rounded-sm border border-border" style={{ background: "#E2C896" }} />
              <span className="uppercase tracking-[0.2em] text-[10px]">Palette Sample</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
