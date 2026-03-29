export default function Hero() {
  return (
    <section className="py-6 sm:py-8 lg:py-10">
      <div>
        <div className="eyebrow">Cincinnati fabrication and install</div>
        <h1 className="max-w-[11ch] font-display text-[2.5rem] font-semibold leading-[0.94] sm:max-w-none sm:text-5xl md:text-6xl">
          Premium Countertops. Fast Install. Built for Cincinnati.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
          We source premium slabs from curated suppliers and fabricate custom quartz, granite, and quartzite countertops
          with a 3-5 day turnaround from deposit to install.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
          <span className="hero-chip hero-chip--accent">3-5 Day Install</span>
          <span className="hero-chip">Curated Supplier Network</span>
          <span className="hero-chip">1-Year Install Guarantee</span>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-4">
          <a className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accentDark hover:shadow-xl" href="#quote">
            Request Estimate
          </a>
          <a className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:-translate-y-0.5 hover:border-accent" href="#suppliers">
            Browse Curated Slabs
          </a>
        </div>
      </div>
    </section>
  );
}
