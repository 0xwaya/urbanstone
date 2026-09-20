const COPY = {
    en: {
        eyebrow: 'Customer feedback',
        title: 'Your experience helps the next homeowner choose well.',
        description: 'Read current feedback on Google or share your own experience. Google handles sign-in and publishing securely.',
        rating: 'See our latest Google reviews',
        leave: 'Leave a Google review',
        share: 'Share your experience',
        note: 'We are building this review wall from verified customer feedback. Your project story belongs here.',
        material: 'Premium material guidance',
        speed: '3-5 day target installs',
        service: 'Personal project support',
        text: 'Text the sales desk',
    },
    es: {
        eyebrow: 'Opiniones de clientes',
        title: 'Tu experiencia ayuda a otros propietarios a elegir mejor.',
        description: 'Lee las opiniones actuales en Google o comparte tu experiencia. Google gestiona el inicio de sesión y la publicación de forma segura.',
        rating: 'Ver opiniones recientes en Google',
        leave: 'Dejar una opinión en Google',
        share: 'Comparte tu experiencia',
        note: 'Estamos creando este espacio con comentarios verificados de clientes. Tu proyecto puede ayudar a la próxima familia.',
        text: 'Escribir al equipo de ventas',
        material: 'Guía de materiales premium',
        speed: 'Instalaciones objetivo en 3-5 días',
        service: 'Atención personalizada',
    },
};

const DEFAULT_REVIEW_URL = 'https://www.google.com/search?q=Urban+Stone+Collective+Cincinnati+reviews';

const DEMO_REVIEWS = [
    {
        name: 'Demo homeowner',
        location: 'Staging placeholder',
        quote: 'Replace this clearly labeled placeholder with an approved customer review before production.',
    },
    {
        name: 'Demo remodel client',
        location: 'Staging placeholder',
        quote: 'Use this space to preview the review card layout. Do not publish as a customer testimonial.',
    },
];

function StarRow() {
    return (
        <div className="flex gap-1 text-lg leading-none text-[#d8b978]" aria-label="Google reviews">
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
        </div>
    );
}

export default function ReviewSection({ language = 'en' }) {
    const copy = COPY[language] || COPY.en;
    const reviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || DEFAULT_REVIEW_URL;
    const showDemoReviews = process.env.NEXT_PUBLIC_REVIEW_DEMO_MODE === 'true';
    const smsHref = `sms:+15133075840?body=${encodeURIComponent(language === 'es'
        ? 'Hola Urban Stone, quiero compartir mi experiencia con mi proyecto.'
        : 'Hi Urban Stone, I would like to share my experience with my project.')}`;

    return (
        <section id="reviews" className="mt-12 rounded-[2rem] border border-border bg-surface p-5 shadow-soft sm:mt-14 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
                <div>
                    <div className="eyebrow">{copy.eyebrow}</div>
                    <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">{copy.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">{copy.description}</p>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                        {[copy.material, copy.speed, copy.service].map((item) => (
                            <div key={item} className="rounded-xl border border-border bg-panel px-3 py-3 text-xs font-semibold leading-5 text-text">
                                {item}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-[1.5rem] border border-border bg-panel p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <StarRow />
                                <div className="mt-2 text-sm font-semibold text-text">{copy.rating}</div>
                            </div>
                            <a
                                className="brand-button-primary px-4 py-3 text-sm font-semibold"
                                href={reviewUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {copy.leave}
                            </a>
                        </div>
                        <p className="mt-4 border-t border-border/70 pt-4 text-sm leading-6 text-muted">{copy.note}</p>
                    </div>

                    {showDemoReviews ? (
                        <div className="mt-4 rounded-[1.5rem] border border-dashed border-accent/60 bg-accent/5 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Demo content - staging only</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {DEMO_REVIEWS.map((review) => (
                                    <article key={review.name} className="rounded-xl border border-border bg-panel p-4">
                                        <StarRow />
                                        <p className="mt-3 text-sm leading-6 text-muted">{review.quote}</p>
                                        <div className="mt-3 text-xs font-semibold text-text">{review.name}</div>
                                        <div className="text-xs text-muted">{review.location}</div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col justify-between rounded-[1.5rem] border border-border bg-panel p-5 sm:p-6">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{copy.share}</div>
                        <p className="mt-3 text-sm leading-7 text-muted">
                            {language === 'es'
                                ? '¿Prefieres hablar primero? Envíanos un mensaje y te ayudaremos a encontrar el enlace correcto para tu proyecto.'
                                : 'Prefer to talk first? Text us and we will help you find the right next step for your project.'}
                        </p>
                    </div>
                    <a className="brand-button-secondary mt-6 inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold" href={smsHref}>
                        {copy.text}
                    </a>
                </div>
            </div>
        </section>
    );
}
