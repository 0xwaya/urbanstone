import { useEffect, useState } from 'react';
import Link from 'next/link';

const COPY = {
    en: {
        eyebrow: 'Customer feedback',
        title: 'Your experience helps the next homeowner choose well.',
        description: 'Verified previous customers can share honest feedback after signing in with Google.',
        rating: 'Customer reviews',
        leave: 'Have an invitation? Write a review',
        share: 'Share your experience',
        note: 'Reviews are collected on this site and moderated by Urban Stone. Google sign-in verifies identity; nothing is forwarded to Google or Google Maps.',
        material: 'Premium material guidance',
        speed: '3-5 day target installs',
        service: 'Personal project support',
        text: 'Text the sales desk',
    },
    es: {
        eyebrow: 'Opiniones de clientes',
        title: 'Tu experiencia ayuda a otros propietarios a elegir mejor.',
        description: 'Los clientes anteriores verificados pueden compartir comentarios sinceros después de iniciar sesión con Google.',
        rating: 'Opiniones de clientes',
        leave: '¿Tienes una invitación? Escribe una opinión',
        share: 'Comparte tu experiencia',
        note: 'Las opiniones se recopilan en este sitio y Urban Stone las modera. Google verifica la identidad; nada se envía a Google ni a Google Maps.',
        text: 'Escribir al equipo de ventas',
        material: 'Guía de materiales premium',
        speed: 'Instalaciones objetivo en 3-5 días',
        service: 'Atención personalizada',
    },
};

export default function ReviewSection({ language = 'en' }) {
    const [reviews, setReviews] = useState([]);
    const copy = COPY[language] || COPY.en;
    const smsHref = `sms:+15133075840?body=${encodeURIComponent(language === 'es'
        ? 'Hola Urban Stone, quiero compartir mi experiencia con mi proyecto.'
        : 'Hi Urban Stone, I would like to share my experience with my project.')}`;

    useEffect(() => {
        let active = true;
        if (typeof fetch !== 'function') return undefined;

        fetch('/api/reviews/published')
            .then((response) => (response.ok ? response.json() : null))
            .then((result) => {
                if (active && Array.isArray(result?.reviews)) setReviews(result.reviews);
            })
            .catch(() => {});

        return () => {
            active = false;
        };
    }, []);

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
                                <div className="mt-2 text-sm font-semibold text-text">{copy.rating}</div>
                            </div>
                            <Link
                                className="brand-button-primary px-4 py-3 text-sm font-semibold"
                                href="/reviews/invite"
                            >
                                {copy.leave}
                            </Link>
                        </div>
                        <p className="mt-4 border-t border-border/70 pt-4 text-sm leading-6 text-muted">{copy.note}</p>
                    </div>

                    {reviews.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Published customer reviews">
                            {reviews.map((review) => (
                                <article key={review.id} className="rounded-[1.5rem] border border-border bg-panel p-4">
                                    <div className="text-sm font-semibold text-accent" aria-label={`${review.rating} out of 5 stars`}>
                                        {'★'.repeat(Math.max(0, Math.min(5, Number(review.rating))))}
                                    </div>
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{review.review_text}</p>
                                    <div className="mt-3 text-xs font-semibold text-text">{review.display_name}</div>
                                </article>
                            ))}
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
