import { useEffect, useState } from 'react';
import { curatedSlabOptions } from '../data/curated-slab-options';

const initialForm = {
    name: '',
    email: '',
    phone: '',
    projectDetails: '',
    totalSquareFootage: '',
    currentTopRemoval: '',
    currentTopMaterial: '',
    sinkBasinPreference: '',
    sinkMountPreference: '',
    sinkMaterialPreference: '',
    backsplashPreference: '',
    timeframeGoal: '',
    materialPreferences: [],
    drawingImage: null,
    website: '',
};

const MAX_DRAWING_BYTES = 5 * 1024 * 1024;

const removalOptions = [
    { value: 'yes', label: 'Yes, remove current tops' },
    { value: 'no', label: 'No removal needed' },
    { value: 'unsure', label: 'Not sure yet' },
];

const currentTopMaterialOptions = [
    { value: 'laminate', label: 'Laminate' },
    { value: 'granite', label: 'Granite' },
    { value: 'quartz', label: 'Quartz' },
    { value: 'tile', label: 'Tile' },
];

const sinkBasinOptions = [
    { value: 'single', label: 'Single bowl' },
    { value: 'double', label: 'Double bowl' },
];

const sinkMountOptions = [
    { value: 'undermount', label: 'Undermount' },
    { value: 'topmount', label: 'Topmount' },
];

const sinkMaterialOptions = [
    { value: 'stainless-steel', label: 'Stainless steel' },
    { value: 'composite', label: 'Composite' },
];

const backsplashOptions = [
    { value: '4-inch', label: '4 in backsplash' },
    { value: 'full-height', label: 'Full-height backsplash' },
    { value: 'none', label: 'No backsplash' },
];

const timeframeOptions = [
    { value: '1-week', label: '1 week' },
    { value: '2-weeks', label: '2 weeks' },
    { value: '1-month', label: '1 month' },
];

function toTelHref(value) {
    return value.replace(/[^\d+]/g, '');
}

const defaultContent = {
    eyebrow: 'Request a quote',
    title: 'Get a Quartz, Granite, or Quartzite Countertop Estimate',
    description: 'Share your drawing, measurements, and selection preferences so we can scope your project quickly and accurately.',
    placeholder: 'Anything unusual to note: appliance changes, access constraints, edge requests, demo concerns, or scheduling notes.',
    submitLabel: 'Send estimate request',
    submittingLabel: 'Sending request...',
    directResponseTitle: 'Need a direct response?',
    coverageText: 'We respond to countertop estimate requests for Cincinnati, Mason, West Chester, Fairfield, Hamilton, Blue Ash, Loveland, Milford, Anderson Township, Covington, Newport, Florence, Erlanger, and nearby communities.',
};

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 KB';
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
    });
}

export default function LeadForm({ content, routeId = 'homepage', collapsible = false, defaultExpanded = true, collapsedLabel = 'Start', expandedLabel = 'Cancel' }) {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isDesktopViewport, setIsDesktopViewport] = useState(false);

    const companyPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const companyEmail = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';
    const formContent = { ...defaultContent, ...(content || {}) };
    const isReusingSink = form.sinkBasinPreference === 'reuse-existing'
        && form.sinkMountPreference === 'reuse-existing'
        && form.sinkMaterialPreference === 'reuse-existing';
    const useDesktopModal = collapsible && isDesktopViewport;
    const showInlineForm = isExpanded && !useDesktopModal;
    const showDesktopModal = isExpanded && useDesktopModal;

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

    const handleSingleSelect = (name, value) => {
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

    const handleMaterialToggle = (value) => {
        setForm((current) => {
            const exists = current.materialPreferences.includes(value);
            const materialPreferences = exists
                ? current.materialPreferences.filter((entry) => entry !== value)
                : [...current.materialPreferences, value];

            return { ...current, materialPreferences };
        });

        setErrors((current) => {
            if (!current.materialPreferences) {
                return current;
            }

            const nextErrors = { ...current };
            delete nextErrors.materialPreferences;
            return nextErrors;
        });
    };

    const handleReuseExistingSinkToggle = () => {
        if (isReusingSink) {
            setForm((current) => ({
                ...current,
                sinkBasinPreference: '',
                sinkMountPreference: '',
                sinkMaterialPreference: '',
            }));
            return;
        }

        setForm((current) => ({
            ...current,
            sinkBasinPreference: 'reuse-existing',
            sinkMountPreference: 'reuse-existing',
            sinkMaterialPreference: 'reuse-existing',
        }));

        setErrors((current) => {
            const nextErrors = { ...current };
            delete nextErrors.sinkBasinPreference;
            delete nextErrors.sinkMountPreference;
            delete nextErrors.sinkMaterialPreference;
            return nextErrors;
        });
    };

    const handleDrawingFileChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setErrors((current) => ({ ...current, drawingImage: 'Upload a PNG or JPG image.' }));
            return;
        }

        if (file.size > MAX_DRAWING_BYTES) {
            setErrors((current) => ({ ...current, drawingImage: 'Image must be 5 MB or smaller.' }));
            return;
        }

        try {
            const dataUrl = await readFileAsDataUrl(file);

            setForm((current) => ({
                ...current,
                drawingImage: {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl,
                },
            }));

            setErrors((current) => {
                const nextErrors = { ...current };
                delete nextErrors.drawingImage;
                delete nextErrors.totalSquareFootage;
                return nextErrors;
            });
        } catch {
            setErrors((current) => ({ ...current, drawingImage: 'Unable to read the uploaded file. Please try another image.' }));
        }
    };

    const handleClearDrawing = () => {
        setForm((current) => ({ ...current, drawingImage: null }));
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

    useEffect(() => {
        if (!collapsible || typeof window === 'undefined') {
            return undefined;
        }

        const syncExpandedState = () => {
            if (window.location.hash === '#quote') {
                setIsExpanded(true);
            }
        };

        syncExpandedState();
        window.addEventListener('hashchange', syncExpandedState);

        const handleDocumentClick = (event) => {
            const trigger = event.target instanceof Element
                ? event.target.closest('a[href="#quote"], a[href="/#quote"]')
                : null;

            if (trigger) {
                setIsExpanded(true);
            }
        };

        document.addEventListener('click', handleDocumentClick);

        return () => {
            window.removeEventListener('hashchange', syncExpandedState);
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [collapsible]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(min-width: 1024px)');
        const syncViewport = () => setIsDesktopViewport(mediaQuery.matches);

        syncViewport();
        mediaQuery.addEventListener('change', syncViewport);

        return () => mediaQuery.removeEventListener('change', syncViewport);
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined' || !showDesktopModal) {
            return undefined;
        }

        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = overflow;
        };
    }, [showDesktopModal]);

    const formPanel = (
        <>
            <form id="quote-form-panel" className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
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
                        autoComplete="off"
                        placeholder="Rocky Quartzman"
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
                    <span className="mb-2 block text-sm font-medium text-text">Notes</span>
                    <textarea
                        className="form-input min-h-24 resize-y"
                        name="projectDetails"
                        value={form.projectDetails}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder={formContent.placeholder}
                    />
                    {errors.projectDetails && <span className="form-error">{errors.projectDetails}</span>}
                </label>

                <div className="rounded-2xl border border-border bg-surface/50 p-4">
                    <div className="text-sm font-semibold text-text">Rough drawing with measurements</div>
                    <p className="mt-1 text-xs leading-5 text-muted">Upload a phone photo, JPG, or PNG drawing. This is optional if you provide total square footage.</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border bg-panel/80 px-4 py-2 text-sm font-semibold text-text transition hover:border-accent hover:text-accent">
                            Upload drawing image
                            <input
                                className="hidden"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/*"
                                onChange={handleDrawingFileChange}
                            />
                        </label>

                        {form.drawingImage ? (
                            <>
                                <span className="text-xs text-muted">{form.drawingImage.name} ({formatFileSize(form.drawingImage.size)})</span>
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text transition hover:border-accent hover:text-accent"
                                    onClick={handleClearDrawing}
                                >
                                    Remove
                                </button>
                            </>
                        ) : null}
                    </div>

                    {errors.drawingImage && <span className="form-error">{errors.drawingImage}</span>}
                </div>

                <div className="rounded-2xl border border-border bg-surface/50 p-4">
                    <div className="text-sm font-semibold text-text">Square footage fallback</div>
                    <p className="mt-1 text-xs leading-5 text-muted">If you are not uploading a drawing, enter the rough total area here. Final measurements are confirmed on site.</p>
                    <label className="mt-3 block">
                        <span className="sr-only">Total square footage</span>
                        <div className="form-input-group">
                            <input
                                className="form-input form-input--grouped"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                name="totalSquareFootage"
                                value={form.totalSquareFootage}
                                onChange={handleChange}
                                placeholder="54.5"
                                aria-label="Total square footage"
                            />
                            <span className="form-input-suffix">sq ft</span>
                        </div>
                    </label>
                    {errors.totalSquareFootage && <span className="form-error">{errors.totalSquareFootage}</span>}
                </div>

                <div>
                    <span className="mb-2 block text-sm font-medium text-text">Current tops removal?</span>
                    <div className="flex flex-wrap gap-2">
                        {removalOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`form-chip${form.currentTopRemoval === option.value ? ' form-chip--active' : ''}`}
                                onClick={() => handleSingleSelect('currentTopRemoval', option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {errors.currentTopRemoval && <span className="form-error">{errors.currentTopRemoval}</span>}
                </div>

                <div>
                    <span className="mb-2 block text-sm font-medium text-text">Current tops material</span>
                    <div className="flex flex-wrap gap-1.5">
                        {currentTopMaterialOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`form-chip${form.currentTopMaterial.toLowerCase() === option.value ? ' form-chip--active' : ''}`}
                                onClick={() => handleSingleSelect('currentTopMaterial', option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {errors.currentTopMaterial && <span className="form-error">{errors.currentTopMaterial}</span>}
                </div>

                <div className="rounded-2xl border border-border bg-surface/50 p-4">
                    <div className="text-sm font-semibold text-text">Sink preference</div>
                    <div className="mt-2.5 space-y-2.5">
                        <button
                            type="button"
                            className={`form-chip form-chip--advisory${isReusingSink ? ' form-chip--active' : ''}`}
                            onClick={handleReuseExistingSinkToggle}
                        >
                            Keep current sink
                            <span className="form-chip-note">Not recommended</span>
                        </button>

                        {!isReusingSink ? (
                            <div className="grid gap-2.5 xl:grid-cols-3">
                                <div>
                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Basin</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sinkBasinOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`form-chip${form.sinkBasinPreference === option.value ? ' form-chip--active' : ''}`}
                                                onClick={() => handleSingleSelect('sinkBasinPreference', option.value)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.sinkBasinPreference && <span className="form-error">{errors.sinkBasinPreference}</span>}
                                </div>

                                <div>
                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Mount</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sinkMountOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`form-chip${form.sinkMountPreference === option.value ? ' form-chip--active' : ''}`}
                                                onClick={() => handleSingleSelect('sinkMountPreference', option.value)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.sinkMountPreference && <span className="form-error">{errors.sinkMountPreference}</span>}
                                </div>

                                <div>
                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Material</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sinkMaterialOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`form-chip${form.sinkMaterialPreference === option.value ? ' form-chip--active' : ''}`}
                                                onClick={() => handleSingleSelect('sinkMaterialPreference', option.value)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.sinkMaterialPreference && <span className="form-error">{errors.sinkMaterialPreference}</span>}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div>
                    <span className="mb-2 block text-sm font-medium text-text">Backsplash preference</span>
                    <div className="flex flex-wrap gap-2">
                        {backsplashOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`form-chip${form.backsplashPreference === option.value ? ' form-chip--active' : ''}`}
                                onClick={() => handleSingleSelect('backsplashPreference', option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {errors.backsplashPreference && <span className="form-error">{errors.backsplashPreference}</span>}
                </div>

                <div>
                    <span className="mb-2 block text-sm font-medium text-text">Target timeframe</span>
                    <div className="flex flex-wrap gap-2">
                        {timeframeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`form-chip${form.timeframeGoal === option.value ? ' form-chip--active' : ''}`}
                                onClick={() => handleSingleSelect('timeframeGoal', option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {errors.timeframeGoal && <span className="form-error">{errors.timeframeGoal}</span>}
                </div>

                <div>
                    <span className="mb-2 block text-sm font-medium text-text">Curated slab preference</span>
                    <p className="mb-3 text-xs leading-5 text-muted">Selections are limited to curated slabs so pricing and quoting can be automated.</p>
                    <div className="space-y-3">
                        {curatedSlabOptions.map((group) => (
                            <div key={group.group}>
                                <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{group.group}</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`form-chip${form.materialPreferences.includes(option.value) ? ' form-chip--active' : ''}`}
                                            onClick={() => handleMaterialToggle(option.value)}
                                            aria-label={`${option.label} from ${option.supplier}`}
                                            title={option.supplier}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    {errors.materialPreferences && <span className="form-error">{errors.materialPreferences}</span>}
                </div>

                <button className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? formContent.submittingLabel : formContent.submitLabel}
                </button>
            </form>

            <div className="mt-4 min-h-6 text-sm" aria-live="polite">
                {status.message && (
                    <p className={`form-status${status.type === 'error' ? ' form-status--error' : ' form-status--success'}`}>{status.message}</p>
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
                        aria-label={`Call Urban Stone Collective at ${companyPhone}`}
                    >
                        Call
                    </a>
                    <a
                        className="inline-flex w-full items-center justify-center rounded-full border border-border bg-panel/80 px-4 py-3 font-semibold text-text transition hover:border-accent hover:text-accent sm:w-auto sm:min-w-[11rem]"
                        href={`mailto:${companyEmail}`}
                        aria-label={`Email Urban Stone Collective at ${companyEmail}`}
                    >
                        Email
                    </a>
                </div>
            </div>
        </>
    );

    return (
        <>
            <section id="quote" className="rounded-3xl border border-border bg-panel p-5 shadow-soft sm:p-6 lg:sticky lg:top-24">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="eyebrow">{formContent.eyebrow}</div>
                        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{formContent.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">
                            {formContent.description}
                        </p>
                    </div>

                    {collapsible ? (
                        <button
                            type="button"
                            className="inline-flex min-w-[6.5rem] items-center justify-center self-start whitespace-nowrap rounded-full border border-border bg-panel/80 px-4 py-2 text-sm font-semibold text-text transition hover:border-accent hover:text-accent sm:self-auto"
                            aria-expanded={isExpanded}
                            aria-controls="quote-form-panel"
                            onClick={() => setIsExpanded((current) => !current)}
                        >
                            {isExpanded ? expandedLabel : collapsedLabel}
                        </button>
                    ) : null}
                </div>

                {showInlineForm ? formPanel : null}
            </section>
            {showDesktopModal ? (
                <div className="lead-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title" onClick={() => setIsExpanded(false)}>
                    <div className="lead-modal-shell" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="eyebrow">Request a quote</p>
                                <h2 id="quote-modal-title" className="font-display text-3xl font-semibold text-text sm:text-4xl">Start your estimate</h2>
                            </div>
                            <button
                                type="button"
                                className="inline-flex min-w-[6.5rem] items-center justify-center self-start whitespace-nowrap rounded-full border border-border bg-panel/80 px-4 py-2 text-sm font-semibold text-text transition hover:border-accent hover:text-accent"
                                onClick={() => setIsExpanded(false)}
                            >
                                {expandedLabel}
                            </button>
                        </div>
                        {formPanel}
                    </div>
                </div>
            ) : null}
        </>
    );
}