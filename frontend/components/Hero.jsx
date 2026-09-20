const HERO_COPY = {
  en: {
    eyebrow: 'Cincinnati fabrication and install',
    title: 'Premium Countertops. Fast Install. Built for Cincinnati.',
    intro: 'We source premium slabs from curated suppliers and fabricate custom quartz, granite, and quartzite countertops with a 3-5 day turnaround from deposit to install.',
    install: '3-5 Day Install', suppliers: 'Curated Supplier Network', warranty: '1-Year Install Guarantee',
    estimate: 'Request Estimate', browse: 'Browse Curated Slabs', days: 'Days to install', curated: 'Curated suppliers', warrantyLabel: 'Install warranty', next: 'What happens next',
    one: '1. Send layout or inspiration', oneText: 'Photos, rough measurements, or a cabinet drawing is enough to start.', two: '2. Shortlist slab directions', twoText: 'We narrow the material lane before you spend time visiting every supplier.', three: '3. Measure, fabricate, install', threeText: 'Urban Stone handles field measure, final stone coordination, fabrication, and install.',
  },
  es: {
    eyebrow: 'Fabricación e instalación en Cincinnati',
    title: 'Cubiertas premium. Instalación rápida. Hechas para Cincinnati.',
    intro: 'Seleccionamos losas premium de proveedores curados y fabricamos cubiertas de cuarzo, granito y cuarcita con un plazo de 3 a 5 días desde el depósito hasta la instalación.',
    install: 'Instalación en 3-5 días', suppliers: 'Red de proveedores curados', warranty: 'Garantía de instalación de 1 año',
    estimate: 'Solicitar presupuesto', browse: 'Ver losas seleccionadas', days: 'Días para instalar', curated: 'Proveedores curados', warrantyLabel: 'Garantía de instalación', next: 'Qué sucede después',
    one: '1. Envía tu plano o inspiración', oneText: 'Fotos, medidas aproximadas o un dibujo de los gabinetes son suficientes para comenzar.', two: '2. Selecciona opciones de losa', twoText: 'Reducimos las opciones de material antes de que visites cada proveedor.', three: '3. Medimos, fabricamos e instalamos', threeText: 'Urban Stone coordina la medición, la piedra final, la fabricación y la instalación.',
  },
};

export default function Hero({ language = 'en' }) {
  const copy = HERO_COPY[language] || HERO_COPY.en;
  return (
    <section className="py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-[2rem] border border-border bg-surface/65 p-6 shadow-soft backdrop-blur sm:p-8">
            <div className="eyebrow">{copy.eyebrow}</div>
            <h1 className="max-w-[11ch] font-display text-[2.5rem] font-semibold leading-[0.94] sm:max-w-none sm:text-5xl md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
              {copy.intro}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
              <span className="hero-chip hero-chip--accent">{copy.install}</span>
              <span className="hero-chip">{copy.suppliers}</span>
              <span className="hero-chip">{copy.warranty}</span>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-4">
              <a className="brand-button-primary rounded-md px-5 py-3 font-semibold" href="#quote">
                {copy.estimate}
              </a>
              <a className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold transition hover:-translate-y-0.5 hover:border-accent" href="#suppliers">
                {copy.browse}
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-border bg-panel/80 p-5 shadow-soft sm:p-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[1.35rem] border border-border bg-surface/70 px-3 py-4 text-center">
                  <div className="text-2xl font-display font-semibold text-text sm:text-3xl">3-5</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{copy.days}</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-surface/70 px-3 py-4 text-center">
                  <div className="text-2xl font-display font-semibold text-text sm:text-3xl">5</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{copy.curated}</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-surface/70 px-3 py-4 text-center">
                  <div className="text-2xl font-display font-semibold text-text sm:text-3xl">1 yr</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{copy.warrantyLabel}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-surface/70 p-5 shadow-soft sm:p-6">
              <div className="eyebrow mb-2">{copy.next}</div>
              <div className="grid gap-3">
                <div className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-4">
                  <div className="text-sm font-semibold text-text">{copy.one}</div>
                  <div className="mt-1 text-sm leading-6 text-muted">{copy.oneText}</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-4">
                  <div className="text-sm font-semibold text-text">{copy.two}</div>
                  <div className="mt-1 text-sm leading-6 text-muted">{copy.twoText}</div>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-panel/75 px-4 py-4">
                  <div className="text-sm font-semibold text-text">{copy.three}</div>
                  <div className="mt-1 text-sm leading-6 text-muted">{copy.threeText}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
