export default function Hero() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Premium Countertops. Fast Install. Built for Cincinnati.
        </h1>
        <p className="text-muted mt-4 text-lg">
          We source premium slabs from 5 top suppliers and fabricate custom 3cm countertops with a
          3–5 day turnaround from deposit to install.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="px-3 py-1 bg-panel border border-border rounded-full text-sm">3–5 Day Install</span>
          <span className="px-3 py-1 bg-panel border border-border rounded-full text-sm">1-Year Install Guarantee</span>
          <span className="px-3 py-1 bg-panel border border-border rounded-full text-sm">No Material Warranty (Supplier)</span>
        </div>
        <div className="mt-8 flex gap-4">
          <button className="bg-accent hover:bg-accentDark text-white px-5 py-3 rounded-md font-semibold transition hover:-translate-y-0.5 hover:shadow-xl">
            Book Measure
          </button>
          <button className="border border-border px-5 py-3 rounded-md font-semibold hover:border-accent transition hover:-translate-y-0.5">
            View Slabs
          </button>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
        <div className="text-sm text-muted">DBA Rebrand Coming Soon</div>
        <div className="text-2xl font-semibold mt-2">Urban Stone Collective</div>
        <div className="text-muted mt-2">Final brand reveal after launch.</div>
        <div className="mt-6 h-40 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
          Logo Placeholder
        </div>
      </div>
    </section>
  );
}
