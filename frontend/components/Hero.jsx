export default function Hero() {
  return (
    <section className="py-6 sm:py-8 lg:py-10">
      <div>
        <div className="eyebrow">Cincinnati quartz, granite, and quartzite fabrication</div>
        <h1 className="max-w-[11ch] font-display text-[2.5rem] font-semibold leading-[0.94] sm:max-w-none sm:text-5xl md:text-6xl">
          Quartz, Granite, and Quartzite Countertops Built for Cincinnati.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
          We fabricate and install quartz countertops, granite countertops, and quartzite countertops for kitchens,
          baths, bars, and remodels across Cincinnati with a 3-5 day turnaround from deposit to install.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Serving homeowners and renovation teams in downtown Cincinnati, Mason, West Chester, Fairfield, Hamilton,
          Blue Ash, Loveland, Milford, Covington, Newport, Florence, and nearby communities within roughly 50 miles of downtown.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <a className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accentDark hover:shadow-xl" href="#quote">
            Request Estimate
          </a>
          <a className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:-translate-y-0.5 hover:border-accent" href="#suppliers">
            View Materials
          </a>
        </div>
      </div>
    </section>
  );
}
