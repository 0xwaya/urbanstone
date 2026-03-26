import { useState } from 'react';

const initialForm = {
    name: '',
    email: '',
    phone: '',
    projectDetails: '',
    website: '',
};

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

export default function LeadForm() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 655-5544';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@amazongranite.com';

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => {
            if (!current[name]) {
                return current;
            }

            const nextErrors = { ...current };
            delete nextErrors[name];
            return nextErrors;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                setErrors(payload.errors || {});
                setStatus({
                    type: 'error',
                    message: payload.message || 'We could not submit your request. Call us directly and we will take it from there.',
                });
                return;
            }

            setErrors({});
            setForm(initialForm);
            setStatus({
                type: 'success',
                message: payload.message || 'Thanks. Your request is in the queue and we will follow up shortly.',
            });
        } catch {
            setStatus({
                type: 'error',
                message: 'The request could not be sent. Use the direct phone or email links below while delivery is being restored.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="quote" className="sticky top-24 rounded-3xl border border-border bg-panel p-6 shadow-soft">
            <div className="eyebrow">Request a quote</div>
            <h2 className="font-display text-4xl font-semibold">Start with a fast estimate</h2>
            <p className="mt-2 text-sm text-muted">
                Send project details and we will use the configured lead destination for follow-up. Direct contact options stay visible as a fallback.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                />

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-text">Full name</span>
                    <input
                        className="form-input"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                        required
                    />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-text">Email</span>
                    <input
                        className="form-input"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                    />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-text">Phone</span>
                    <input
                        className="form-input"
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                        required
                    />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-text">Project details</span>
                    <textarea
                        className="form-input min-h-32 resize-y"
                        name="projectDetails"
                        value={form.projectDetails}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="Kitchen, baths, material preferences, timeline, and any measurements you already have."
                        required
                    />
                    {errors.projectDetails && <span className="form-error">{errors.projectDetails}</span>}
                </label>

                <button className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending request...' : 'Send estimate request'}
                </button>
            </form>

            <div className="mt-4 min-h-6 text-sm" aria-live="polite">
                {status.message && (
                    <p className={status.type === 'error' ? 'text-[#9f3a2b]' : 'text-[#1e6a52]'}>{status.message}</p>
                )}
            </div>

            <div id="contact" className="mt-6 rounded-2xl border border-border bg-white/70 p-4 text-sm text-muted">
                <div className="font-semibold text-text">Need a direct response?</div>
                <div className="mt-2 flex flex-wrap gap-3">
                    <a className="inline-flex rounded-full border border-border px-3 py-2 font-semibold text-text transition hover:border-accent" href={`tel:${toTelHref(companyPhone)}`}>
                        Call {companyPhone}
                    </a>
                    <a className="inline-flex rounded-full border border-border px-3 py-2 font-semibold text-text transition hover:border-accent" href={`mailto:${companyEmail}`}>
                        Email {companyEmail}
                    </a>
                </div>
            </div>
        </section>
    );
}