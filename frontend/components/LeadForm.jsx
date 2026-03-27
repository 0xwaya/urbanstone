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

const defaultContent = {
    eyebrow: 'Request a quote',
    title: 'Get a Quartz, Granite, or Quartzite Countertop Estimate',
    description: 'Send your layout, measurements, and material preference for quartz countertops, granite countertops, or quartzite countertops in Cincinnati and the surrounding 50-mile service area.',
    placeholder: 'Kitchen or bath location, preferred material, neighborhood or city, timeline, and any measurements you already have.',
    submitLabel: 'Send estimate request',
    submittingLabel: 'Sending request...',
    directResponseTitle: 'Need a direct response?',
    coverageText: 'We respond to countertop estimate requests for Cincinnati, Mason, West Chester, Fairfield, Hamilton, Blue Ash, Loveland, Milford, Anderson Township, Covington, Newport, Florence, Erlanger, and nearby communities.',
};

export default function LeadForm({ content, routeId = 'homepage' }) {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const formContent = { ...defaultContent, ...(content || {}) };

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
            const requestPayload = {
                ...form,
                routeId,
            };

            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
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
        <section id="quote" className="rounded-3xl border border-border bg-panel p-5 shadow-soft sm:p-6 lg:sticky lg:top-24">
            <div className="eyebrow">{formContent.eyebrow}</div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">{formContent.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
                {formContent.description}
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
                        placeholder={formContent.placeholder}
                        required
                    />
                    {errors.projectDetails && <span className="form-error">{errors.projectDetails}</span>}
                </label>

                <button className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? formContent.submittingLabel : formContent.submitLabel}
                </button>
            </form>

            <div className="mt-4 min-h-6 text-sm" aria-live="polite">
                {status.message && (
                    <p className={status.type === 'error' ? 'text-rose-300' : 'text-cyan-300'}>{status.message}</p>
                )}
            </div>

            <div id="contact" className="mt-6 rounded-2xl border border-border bg-surface/75 p-4 text-sm text-muted">
                <div className="font-semibold text-text">{formContent.directResponseTitle}</div>
                <p className="mt-2 leading-6">
                    {formContent.coverageText}
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                        className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(61,110,196,0.18)] transition hover:bg-accentDark sm:w-auto sm:min-w-[11rem]"
                        href={`tel:${toTelHref(companyPhone)}`}
                        aria-label={`Call Amazon Granite at ${companyPhone}`}
                    >
                        Call
                    </a>
                    <a
                        className="inline-flex w-full items-center justify-center rounded-full border border-border bg-panel/80 px-4 py-3 font-semibold text-text transition hover:border-accent hover:text-accent sm:w-auto sm:min-w-[11rem]"
                        href={`mailto:${companyEmail}`}
                        aria-label={`Email Amazon Granite at ${companyEmail}`}
                    >
                        Email
                    </a>
                </div>
            </div>
        </section>
    );
}