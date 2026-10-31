import Link from 'next/link';

const COPY = {
    en: {
        eyebrow: 'Customer reviews',
        title: 'Your experience helps the next homeowner choose well.',
        description: 'Reviews come from verified Urban Stone customers through a private invitation after their install.',
        empty: 'We are inviting recent customers now. Their reviews will appear here soon.',
        leave: 'Have an invitation? Write a review',
        share: 'Share your experience',
        talk: 'Prefer to talk first? Text us and we will help you find the right next step for your project.',
        text: 'Text the sales desk',
        verified: 'Verified customer',
        summary: (count) => `${count} verified review${count === 1 ? '' : 's'}`,
        listLabel: 'Published customer reviews',
        locale: 'en-US',
    },
    es: {
        eyebrow: 'Opiniones de clientes',
        title: 'Tu experiencia ayuda a otros propietarios a elegir mejor.',
        description: 'Las opiniones provienen de clientes verificados de Urban Stone mediante una invitación privada después de su instalación.',
        empty: 'Estamos invitando a clientes recientes. Sus opiniones aparecerán aquí pronto.',
        leave: '¿Tienes una invitación? Escribe una opinión',
        share: 'Comparte tu experiencia',
        talk: '¿Prefieres hablar primero? Envíanos un mensaje y te ayudaremos a encontrar el siguiente paso para tu proyecto.',
        text: 'Escribir al equipo de ventas',
        verified: 'Cliente verificado',
        summary: (count) => `${count} ${count === 1 ? 'opinión verificada' : 'opiniones verificadas'}`,
        listLabel: 'Opiniones publicadas de clientes',
        locale: 'es-US',
    },
};

function formatMonth(value, locale) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function StarRow({ rating, size = 'text-base' }) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return (
        <span className={`${size} tracking-[0.15em]`} role="img" aria-label={`${value} out of 5 stars`}>
            <span className="text-accent">{'★'.repeat(value)}</span>
            <span className="text-border">{'★'.repeat(5 - value)}</span>
        </span>
    );
}

export default function ReviewSection({ language = 'en', reviews = [] }) {
    const copy = COPY[language] || COPY.en;
    const list = Array.isArray(reviews) ? reviews.filter((review) => review && review.review_text) : [];
    const average = list.length ? list.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / list.length : 0;
    const smsHref = `sms:+15133075840?body=${encodeURIComponent(language === 'es'
        ? 'Hola Urban Stone, quiero compartir mi experiencia con mi proyecto.'
        : 'Hi Urban Stone, I would like to share my experience with my project.')}`;

    return (
        <section id="reviews" className="mt-12 scroll-mt-28 sm:mt-14">
            <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-soft sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="eyebrow">{copy.eyebrow}</div>
                        <h2 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{copy.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{list.length ? copy.description : copy.empty}</p>
                    </div>
                    {list.length ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-border bg-panel px-4 py-3">
                            <span className="font-display text-3xl font-semibold leading-none">{average.toFixed(1)}</span>
                            <div className="flex flex-col">
                                <StarRow rating={average} size="text-sm" />
                                <span className="text-xs font-semibold text-muted">{copy.summary(list.length)}</span>
                            </div>
                        </div>
                    ) : null}
                </div>

                {list.length ? (
                    <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label={copy.listLabel}>
                        {list.map((review) => {
                            const meta = [review.job_label, review.location].filter(Boolean).join(' · ');
                            const month = formatMonth(review.published_at, copy.locale);
                            return (
                                <li key={review.id} className="flex h-full flex-col rounded-[1.5rem] border border-border bg-panel p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <StarRow rating={review.rating} />
                                        {month ? <time className="text-xs text-muted" dateTime={review.published_at}>{month}</time> : null}
                                    </div>
                                    <blockquote className="mt-3 flex-1 whitespace-pre-wrap break-words text-sm leading-7 text-text">
                                        “{review.review_text}”
                                    </blockquote>
                                    <div className="mt-4 border-t border-border/70 pt-3">
                                        <div className="text-sm font-semibold text-text">{review.display_name}</div>
                                        <div className="mt-0.5 text-xs text-muted">
                                            {copy.verified}{meta ? ` · ${meta}` : ''}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-border bg-panel p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <p className="text-sm leading-6 text-muted"><span className="font-semibold text-text">{copy.share}.</span> {copy.talk}</p>
                    <div className="flex flex-wrap gap-2">
                        <Link className="brand-button-primary px-4 py-2.5 text-sm font-semibold" href="/reviews/invite">{copy.leave}</Link>
                        <a className="brand-button-secondary inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold" href={smsHref}>{copy.text}</a>
                    </div>
                </div>
            </div>
        </section>
    );
}
