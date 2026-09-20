export const removalOptions = [
    { value: 'yes', label: 'Yes, remove current tops' },
    { value: 'no', label: 'No removal needed' },
    { value: 'unsure', label: 'Not sure yet' },
];

export const currentTopMaterialOptions = [
    { value: 'laminate', label: 'Laminate' },
    { value: 'granite', label: 'Granite' },
    { value: 'quartz', label: 'Quartz' },
    { value: 'tile', label: 'Tile' },
    { value: 'other', label: 'Other' },
];

export const sinkBasinOptions = [
    { value: 'single', label: 'Single bowl' },
    { value: 'double', label: 'Double bowl' },
    { value: 'reuse-existing', label: 'Reuse existing' },
];

export const sinkMountOptions = [
    { value: 'undermount', label: 'Undermount' },
    { value: 'topmount', label: 'Topmount' },
    { value: 'reuse-existing', label: 'Reuse existing' },
];

export const sinkMaterialOptions = [
    { value: 'stainless-steel', label: 'Stainless steel' },
    { value: 'composite', label: 'Composite' },
    { value: 'reuse-existing', label: 'Reuse existing' },
];

export const backsplashOptions = [
    { value: '4-inch', label: '4 in backsplash' },
    { value: 'full-height', label: 'Full-height backsplash' },
    { value: 'none', label: 'No backsplash' },
];

export const timeframeOptions = [
    { value: '1-week', label: '1 week' },
    { value: '2-weeks', label: '2 weeks' },
    { value: '1-month', label: '1 month' },
];

export const materialOptions = [
    { value: 'daltile-kodiak', label: 'Kodiak (Daltile)' },
    { value: 'quartz-america-calacatta-dolce', label: 'Calacatta Dolce' },
    { value: 'quartz-america-calacatta-nile', label: 'Calacatta Nile' },
    { value: 'quartz-america-carrara-classique', label: 'Carrara Classique' },
    { value: 'avani-calacatta-aurus-5035', label: 'Calacatta Aurus 5035' },
    { value: 'avani-calacatta-andromeda-5040', label: 'Calacatta Andromeda 5040' },
    { value: 'avani-calacatta-gelato-5520', label: 'Calacatta Gelato 5520' },
    { value: 'citi-quartz-8023-calacatta-royale', label: '8023 Calacatta Royale' },
    { value: 'citi-quartz-9023-calacatta-nova', label: '9023 Calacatta Nova' },
    { value: 'citi-quartz-pt34-taj-mahal', label: 'PT34 Taj Mahal' },
    { value: 'daltile-absolute-black', label: 'Absolute Black (Granite)' },
    { value: 'daltile-fantasy-brown', label: 'Fantasy Brown (Marble)' },
];

export const leadOptionSets = {
    removal: removalOptions,
    currentTopMaterial: currentTopMaterialOptions,
    sinkBasin: sinkBasinOptions,
    sinkMount: sinkMountOptions,
    sinkMaterial: sinkMaterialOptions,
    backsplash: backsplashOptions,
    timeframe: timeframeOptions,
    materials: materialOptions,
};

export const leadOptionValues = Object.fromEntries(
    Object.entries(leadOptionSets).map(([name, options]) => [name, new Set(options.map(({ value }) => value))])
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9()+.\-\s]{7,24}$/;

export function validateLeadForm(form, { hasDrawing = false } = {}) {
    const errors = {};

    if (String(form.name || '').trim().length < 2) errors.name = 'Enter your full name.';
    if (!EMAIL_PATTERN.test(String(form.email || '').trim())) errors.email = 'Enter a valid email address.';
    if (!PHONE_PATTERN.test(String(form.phone || '').trim())) errors.phone = 'Enter a valid phone number.';
    if (!hasDrawing && !(Number(form.totalSquareFootage) > 0)) errors.totalSquareFootage = 'Enter total square footage or upload a drawing.';
    if (form.currentTopRemoval && !leadOptionValues.removal.has(form.currentTopRemoval)) errors.currentTopRemoval = 'Select an option.';
    if (!form.currentTopRemoval) errors.currentTopRemoval = 'Select an option.';
    if (form.currentTopRemoval === 'yes' && String(form.currentTopMaterial || '').trim().length < 2) errors.currentTopMaterial = 'Enter current top material.';
    if (!leadOptionValues.sinkBasin.has(form.sinkBasinPreference)) errors.sinkBasinPreference = 'Select an option.';
    if (!leadOptionValues.sinkMount.has(form.sinkMountPreference)) errors.sinkMountPreference = 'Select an option.';
    if (!leadOptionValues.sinkMaterial.has(form.sinkMaterialPreference)) errors.sinkMaterialPreference = 'Select an option.';
    if (!leadOptionValues.backsplash.has(form.backsplashPreference)) errors.backsplashPreference = 'Select an option.';
    if (!leadOptionValues.timeframe.has(form.timeframeGoal)) errors.timeframeGoal = 'Select a timeframe.';
    if (!Array.isArray(form.materialPreferences) || form.materialPreferences.length === 0) errors.materialPreferences = 'Select at least one material.';

    return errors;
}