import { useMemo, useState } from 'react';

const PROPERTY_TYPE_OPTIONS = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'mixed-use', label: 'Mixed-use' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'student-housing', label: 'Student housing' },
    { value: 'senior-living', label: 'Senior living' },
    { value: 'office', label: 'Office' },
];

const STEP_FIELDS = [
    ['name', 'email', 'phone', 'companyName', 'projectName', 'projectLocation', 'propertyType'],
    ['numberOfUnits', 'averageUnitSquareFootage', 'projectStartDate', 'unitsPerWeek', 'fabricationLeadWeeks', 'installationLeadWeeks', 'completionGoal'],
    ['materialInterests', 'projectDetails'],
];

const STEP_CONTENT = [
    {
        eyebrow: 'Step 1',
        title: 'Project basics',
        description: 'Tell us who is leading the rollout, where the project sits, and what type of property we are scoping.',
    },
    {
        eyebrow: 'Step 2',
        title: 'Production cadence',
        description: 'Define unit count, weekly throughput, and the fabrication and installation windows you need us to hit.',
    },
    {
        eyebrow: 'Step 3',
        title: 'Materials and goals',
        description: 'Choose likely materials and add the site details that shape commercial pricing: access, schedule compression, and completion targets.',
    },
];

const initialForm = {
    name: '',
    email: '',
    phone: '',
    companyName: '',
    projectName: '',
    projectLocation: '',
    propertyType: '',
    numberOfUnits: '',
    averageUnitSquareFootage: '',
    projectStartDate: '',
    unitsPerWeek: '',
    fabricationLeadWeeks: '',
    installationLeadWeeks: '',
    completionGoal: '',
    materialInterests: [],
    projectDetails: '',
    website: '',
};

function getFirstErrorStep(errors) {
    return STEP_FIELDS.findIndex(fields => fields.some(field => errors[field]));
}

export default function CommercialEstimateAssistant({ tiers }) {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [activeStep, setActiveStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    const selectedMaterialCount = form.materialInterests.length;
    const currentStep = STEP_CONTENT[activeStep];
    const completionProgress = useMemo(() => `${activeStep + 1}/${STEP_CONTENT.length}`, [activeStep]);

    const clearError = (name) => {
        setErrors((current) => {
            if (!current[name]) {
                return current;
            }

            const nextErrors = { ...current };
            delete nextErrors[name];
            return nextErrors;
        });
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        clearError(name);
    };

    const handleMaterialToggle = (value) => {
        setForm((current) => {
            const normalizedValue = String(value || '').toLowerCase();
            const exists = current.materialInterests.includes(normalizedValue);
            const materialInterests = exists
                ? current.materialInterests.filter((entry) => entry !== normalizedValue)
                : [...current.materialInterests, normalizedValue];

            return {
                ...current,
                materialInterests,
            };
        });
        clearError('materialInterests');
    };

    const validateCurrentStep = () => {
        const stepErrors = {};

        STEP_FIELDS[activeStep].forEach((field) => {
            if (field === 'materialInterests' && form.materialInterests.length === 0) {
                stepErrors.materialInterests = 'Select at least one material target.';
            }

            if (field !== 'materialInterests' && !String(form[field] || '').trim()) {
                stepErrors[field] = 'Complete this field before moving on.';
            }
        });

        if (Object.keys(stepErrors).length > 0) {
            setErrors((current) => ({ ...current, ...stepErrors }));
            return false;
        }

        return true;
    };

    const handleNextStep = () => {
        if (!validateCurrentStep()) {
            return;
        }

        setActiveStep((current) => Math.min(current + 1, STEP_CONTENT.length - 1));
    };

    const handlePreviousStep = () => {
        setActiveStep((current) => Math.max(current - 1, 0));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'idle', message: '' });

        try {
            const response = await fetch('/api/contractor-estimate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...form,
                    routeId: 'contractor-portal-assistant',
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const nextErrors = payload.errors || {};
                setErrors(nextErrors);
                setStatus({
                    type: 'error',
                    message: payload.message || 'We could not submit the commercial estimate request. Please try again.',
                });

                const firstErrorStep = getFirstErrorStep(nextErrors);
                if (firstErrorStep >= 0) {
                    setActiveStep(firstErrorStep);
                }
                return;
            }

            setErrors({});
            setForm(initialForm);
            setActiveStep(0);
            setStatus({
                type: 'success',
                message: payload.message || 'Commercial estimate request received. Urban Stone will follow up shortly.',
            });
        } catch {
            setStatus({
                type: 'error',
                message: 'Delivery is temporarily unavailable. Email sales@urbanstone.co and we will route the project manually.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="commercial-estimate" className="rounded-[2rem] border border-border bg-surface/90 p-5 shadow-soft sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_1.25fr]">
                <div>
                    <div className="rounded-[1.75rem] border border-border bg-panel/80 p-5">
                        <p className="eyebrow mb-3">Commercial estimate assistant</p>
                        <h2 className="text-2xl font-display font-semibold leading-tight text-text sm:text-[2.15rem]">
                            Scope the project the way a commercial rollout actually gets priced.
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
                            This assistant is tuned for apartment, hospitality, office, and mixed-use work. Feed us the rollout cadence, unit count, and completion goals now, and the sales desk can respond with a sharper takeoff path.
                        </p>
                        <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-surface/75 px-4 py-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Response target</div>
                                <div className="mt-2 text-text">Commercial intake review with rollout context instead of a generic residential quote reply.</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-surface/75 px-4 py-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Best use</div>
                                <div className="mt-2 text-text">3+ units, phased delivery schedules, compressed timelines, and property-level scope planning.</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 rounded-[1.75rem] border border-border bg-panel/80 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Assistant prompt</div>
                                <h3 className="mt-2 text-xl font-semibold text-text">{currentStep.title}</h3>
                            </div>
                            <div className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                                {completionProgress}
                            </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-muted">{currentStep.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {STEP_CONTENT.map((step, index) => (
                                <button
                                    key={step.title}
                                    type="button"
                                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${index === activeStep
                                        ? 'border-accent bg-accent/10 text-accent'
                                        : 'border-border bg-surface/70 text-muted hover:border-accent/40 hover:text-text'}`}
                                    onClick={() => setActiveStep(index)}
                                >
                                    {step.eyebrow}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <form className="rounded-[1.9rem] border border-border bg-panel/90 p-5 sm:p-6" onSubmit={handleSubmit}>
                    {status.type !== 'idle' ? (
                        <div className={`form-status ${status.type === 'error' ? 'form-status--error' : 'form-status--success'}`}>
                            {status.message}
                        </div>
                    ) : null}

                    <input
                        type="text"
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                    />

                    {activeStep === 0 ? (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Contact name</label>
                                <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="Project lead" />
                                {errors.name ? <span className="form-error">{errors.name}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Business email</label>
                                <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="estimating@builderco.com" />
                                {errors.email ? <span className="form-error">{errors.email}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Phone</label>
                                <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="(513) 307-5840" />
                                {errors.phone ? <span className="form-error">{errors.phone}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Company</label>
                                <input className="form-input" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Apex Development Group" />
                                {errors.companyName ? <span className="form-error">{errors.companyName}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Project name</label>
                                <input className="form-input" name="projectName" value={form.projectName} onChange={handleChange} placeholder="Riverside Phase II" />
                                {errors.projectName ? <span className="form-error">{errors.projectName}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Project location</label>
                                <input className="form-input" name="projectLocation" value={form.projectLocation} onChange={handleChange} placeholder="Cincinnati, OH" />
                                {errors.projectLocation ? <span className="form-error">{errors.projectLocation}</span> : null}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Property type</label>
                                <div className="flex flex-wrap gap-2">
                                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`form-chip ${form.propertyType === option.value ? 'form-chip--active' : ''}`}
                                            onClick={() => {
                                                setForm((current) => ({ ...current, propertyType: option.value }));
                                                clearError('propertyType');
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {errors.propertyType ? <span className="form-error">{errors.propertyType}</span> : null}
                            </div>
                        </div>
                    ) : null}

                    {activeStep === 1 ? (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Number of units</label>
                                <input className="form-input" name="numberOfUnits" inputMode="numeric" value={form.numberOfUnits} onChange={handleChange} placeholder="48" />
                                {errors.numberOfUnits ? <span className="form-error">{errors.numberOfUnits}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Avg. sq ft per unit</label>
                                <div className="form-input-group">
                                    <input className="form-input form-input--grouped" name="averageUnitSquareFootage" inputMode="decimal" value={form.averageUnitSquareFootage} onChange={handleChange} placeholder="52" />
                                    <span className="form-input-suffix">sq ft</span>
                                </div>
                                {errors.averageUnitSquareFootage ? <span className="form-error">{errors.averageUnitSquareFootage}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Project start date</label>
                                <input className="form-input" name="projectStartDate" type="date" value={form.projectStartDate} onChange={handleChange} />
                                {errors.projectStartDate ? <span className="form-error">{errors.projectStartDate}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Units per week</label>
                                <div className="form-input-group">
                                    <input className="form-input form-input--grouped" name="unitsPerWeek" inputMode="decimal" value={form.unitsPerWeek} onChange={handleChange} placeholder="12" />
                                    <span className="form-input-suffix">units/wk</span>
                                </div>
                                {errors.unitsPerWeek ? <span className="form-error">{errors.unitsPerWeek}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Fabrication lead time</label>
                                <div className="form-input-group">
                                    <input className="form-input form-input--grouped" name="fabricationLeadWeeks" inputMode="numeric" value={form.fabricationLeadWeeks} onChange={handleChange} placeholder="3" />
                                    <span className="form-input-suffix">weeks</span>
                                </div>
                                {errors.fabricationLeadWeeks ? <span className="form-error">{errors.fabricationLeadWeeks}</span> : null}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Installation lead time</label>
                                <div className="form-input-group">
                                    <input className="form-input form-input--grouped" name="installationLeadWeeks" inputMode="numeric" value={form.installationLeadWeeks} onChange={handleChange} placeholder="2" />
                                    <span className="form-input-suffix">weeks</span>
                                </div>
                                {errors.installationLeadWeeks ? <span className="form-error">{errors.installationLeadWeeks}</span> : null}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Completion goal</label>
                                <input className="form-input" name="completionGoal" type="date" value={form.completionGoal} onChange={handleChange} />
                                {errors.completionGoal ? <span className="form-error">{errors.completionGoal}</span> : null}
                            </div>
                        </div>
                    ) : null}

                    {activeStep === 2 ? (
                        <div className="mt-5">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Curated material targets</label>
                                <div className="flex flex-wrap gap-2">
                                    {tiers.map((tier) => {
                                        const normalizedName = tier.name.toLowerCase();
                                        const isSelected = form.materialInterests.includes(normalizedName);

                                        return (
                                            <button
                                                key={tier.name}
                                                type="button"
                                                className={`form-chip ${isSelected ? 'form-chip--active' : ''}`}
                                                onClick={() => handleMaterialToggle(tier.name)}
                                            >
                                                {tier.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">{selectedMaterialCount} selected</div>
                                {errors.materialInterests ? <span className="form-error">{errors.materialInterests}</span> : null}
                            </div>
                            <div className="mt-5">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">Project scope notes</label>
                                <textarea
                                    className="form-input min-h-40"
                                    name="projectDetails"
                                    value={form.projectDetails}
                                    onChange={handleChange}
                                    placeholder="Include access constraints, punch sequencing, amenity spaces, island count, demolition conditions, elevator/loading limitations, and any completion milestones."
                                />
                                {errors.projectDetails ? <span className="form-error">{errors.projectDetails}</span> : null}
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                        <button
                            type="button"
                            className="brand-button-secondary inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                            onClick={handlePreviousStep}
                            disabled={activeStep === 0 || isSubmitting}
                        >
                            Previous
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                            {activeStep < STEP_CONTENT.length - 1 ? (
                                <button
                                    type="button"
                                    className="brand-button-primary px-5 py-3 text-sm font-semibold"
                                    onClick={handleNextStep}
                                    disabled={isSubmitting}
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="brand-button-primary px-5 py-3 text-sm font-semibold"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Send commercial estimate request'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </section>
    );
}