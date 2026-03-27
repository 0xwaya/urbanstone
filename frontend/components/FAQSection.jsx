import { homepageFaqContent, homepageFaqItems } from '../data/homepage-content';

export default function FAQSection({ eyebrow = homepageFaqContent.eyebrow, title = homepageFaqContent.title, description = homepageFaqContent.description, items = homepageFaqContent.items }) {
    return (
        <section id="faq" className="mt-12 rounded-3xl border border-border bg-surface/75 p-5 shadow-soft sm:mt-14 sm:p-6">
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                {description}
            </p>

            <div className="mt-6 space-y-4">
                {items.map((item) => (
                    <article key={item.question} className="rounded-2xl border border-border bg-panel/70 p-4 sm:p-5">
                        <h3 className="text-lg font-semibold text-text sm:text-xl">{item.question}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted sm:text-base">{item.answer}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

export { homepageFaqItems as faqItems };