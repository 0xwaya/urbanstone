import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import OptionPicker from '@/components/ui/OptionPicker';
import { submitLead } from '@/lib/api';
import { validateEmail, validateName, validatePhone, validateSqft } from '@/lib/validation';

// ---- Option sets (mirrored from frontend/data & frontend/lib/lead.js) ----

const REMOVAL_OPTIONS = [
  { value: 'yes', label: 'Yes, remove current tops' },
  { value: 'no', label: 'No removal needed' },
  { value: 'unsure', label: 'Not sure yet' },
];

const CURRENT_MATERIAL_OPTIONS = [
  { value: 'laminate', label: 'Laminate' },
  { value: 'granite', label: 'Granite' },
  { value: 'quartz', label: 'Quartz' },
  { value: 'tile', label: 'Tile' },
  { value: 'other', label: 'Other' },
];

const BASIN_OPTIONS = [
  { value: 'single', label: 'Single bowl' },
  { value: 'double', label: 'Double bowl' },
  { value: 'reuse-existing', label: 'Reuse existing' },
];

const MOUNT_OPTIONS = [
  { value: 'undermount', label: 'Undermount' },
  { value: 'topmount', label: 'Topmount' },
  { value: 'reuse-existing', label: 'Reuse existing' },
];

const SINK_MATERIAL_OPTIONS = [
  { value: 'stainless-steel', label: 'Stainless steel' },
  { value: 'composite', label: 'Composite' },
  { value: 'reuse-existing', label: 'Reuse existing' },
];

const BACKSPLASH_OPTIONS = [
  { value: '4-inch', label: '4-inch' },
  { value: 'full-height', label: 'Full height' },
  { value: 'none', label: 'None' },
];

const TIMEFRAME_OPTIONS = [
  { value: '1-week', label: '1 week' },
  { value: '2-weeks', label: '2 weeks' },
  { value: '1-month', label: '1 month' },
];

const MATERIAL_OPTIONS = [
  { value: 'msi-calacatta-laza', label: 'Calacatta Laza (MSI)' },
  { value: 'msi-calacatta-miraggio', label: 'Calacatta Miraggio (MSI)' },
  { value: 'msi-ivori-taj', label: 'Ivori Taj (MSI)' },
  { value: 'daltile-kodiak', label: 'Kodiak (Daltile)' },
  { value: 'quartz-america-calacatta-dolce', label: 'Calacatta Dolce' },
  { value: 'quartz-america-calacatta-nile', label: 'Calacatta Nile' },
  { value: 'quartz-america-carrara-classique', label: 'Carrara Classique' },
  { value: 'avani-calacatta-aurus-5035', label: 'Calacatta Aurus 5035' },
  { value: 'daltile-absolute-black', label: 'Absolute Black (Granite)' },
  { value: 'daltile-fantasy-brown', label: 'Fantasy Brown (Marble)' },
];

// ---- Blank form state ----

type FormState = {
  name: string;
  email: string;
  phone: string;
  sqft: string;
  projectDetails: string;
  currentTopRemoval: string;
  currentTopMaterial: string;
  sinkBasinPreference: string;
  sinkMountPreference: string;
  sinkMaterialPreference: string;
  backsplashPreference: string;
  timeframeGoal: string;
  materialPreferences: string[];
};

const BLANK: FormState = {
  name: '',
  email: '',
  phone: '',
  sqft: '',
  projectDetails: '',
  currentTopRemoval: '',
  currentTopMaterial: '',
  sinkBasinPreference: '',
  sinkMountPreference: '',
  sinkMaterialPreference: '',
  backsplashPreference: '',
  timeframeGoal: '',
  materialPreferences: [],
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function QuoteScreen() {
  const [form, setForm] = useState<FormState>(BLANK);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormState>(key: K) =>
    (val: FormState[K]) => {
      setForm(prev => ({ ...prev, [key]: val }));
      setErrors(prev => ({ ...prev, [key]: undefined }));
    };

  const validate = (): Errors => {
    const e: Errors = {};
    e.name = validateName(form.name) ?? undefined;
    e.email = validateEmail(form.email) ?? undefined;
    e.phone = validatePhone(form.phone) ?? undefined;
    e.sqft = validateSqft(form.sqft) ?? undefined;
    if (!form.currentTopRemoval) e.currentTopRemoval = 'Select an option.';
    if (form.currentTopRemoval === 'yes' && form.currentTopMaterial.trim().length < 2)
      e.currentTopMaterial = 'Enter current top material.';
    if (!form.sinkBasinPreference) e.sinkBasinPreference = 'Select an option.';
    if (!form.sinkMountPreference) e.sinkMountPreference = 'Select an option.';
    if (!form.sinkMaterialPreference) e.sinkMaterialPreference = 'Select an option.';
    if (!form.backsplashPreference) e.backsplashPreference = 'Select an option.';
    if (!form.timeframeGoal) e.timeframeGoal = 'Select a timeframe.';
    if (form.materialPreferences.length === 0)
      e.materialPreferences = 'Select at least one material.';
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v));
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const result = await submitLead({
        name: form.name,
        email: form.email,
        phone: form.phone,
        totalSquareFootage: form.sqft,
        projectDetails: form.projectDetails,
        currentTopRemoval: form.currentTopRemoval,
        currentTopMaterial: form.currentTopMaterial,
        sinkBasinPreference: form.sinkBasinPreference,
        sinkMountPreference: form.sinkMountPreference,
        sinkMaterialPreference: form.sinkMaterialPreference,
        backsplashPreference: form.backsplashPreference,
        timeframeGoal: form.timeframeGoal,
        materialPreferences: form.materialPreferences,
      });
      if (result.ok) {
        setSubmitted(true);
      } else if (result.errors) {
        setErrors(result.errors as Errors);
        Alert.alert('Check your form', result.message ?? 'Please fix the errors and try again.');
      } else {
        Alert.alert('Error', result.message ?? 'Submission failed. Please try again.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-4xl mb-4">✓</Text>
        <Text className="text-foreground text-2xl font-semibold mb-2 text-center">
          Request Received
        </Text>
        <Text className="text-muted text-base text-center mb-8">
          We'll be in touch within one business day to confirm your appointment.
        </Text>
        <Button label="Submit Another" onPress={() => { setForm(BLANK); setSubmitted(false); }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-foreground text-2xl font-semibold">Get a Free Quote</Text>
          <Text className="text-muted text-sm mt-1">
            Cincinnati area · 3–5 day installs · Premium stone
          </Text>
        </View>

        {/* Contact */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3">Contact Info</Text>
        <Field
          label="Full Name"
          value={form.name}
          onChangeText={set('name')}
          error={errors.name}
          autoCapitalize="words"
          autoComplete="name"
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Phone"
          value={form.phone}
          onChangeText={set('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        {/* Project details */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Project Details</Text>
        <Field
          label="Total Square Footage"
          value={form.sqft}
          onChangeText={set('sqft')}
          error={errors.sqft}
          keyboardType="decimal-pad"
          placeholder="e.g. 45"
        />
        <Field
          label="Additional Notes (optional)"
          value={form.projectDetails}
          onChangeText={set('projectDetails')}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          placeholder="Describe your project, layout, preferences..."
        />

        {/* Material preferences */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Materials</Text>
        <OptionPicker
          label="Material Preferences (select all that interest you)"
          options={MATERIAL_OPTIONS}
          value=""
          onChange={() => {}}
          multi
          multiValue={form.materialPreferences}
          onMultiChange={set('materialPreferences')}
          error={errors.materialPreferences}
        />

        {/* Removal */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Current Tops</Text>
        <OptionPicker
          label="Remove Existing Tops?"
          options={REMOVAL_OPTIONS}
          value={form.currentTopRemoval}
          onChange={set('currentTopRemoval')}
          error={errors.currentTopRemoval}
        />
        {form.currentTopRemoval === 'yes' && (
          <OptionPicker
            label="Current Top Material"
            options={CURRENT_MATERIAL_OPTIONS}
            value={form.currentTopMaterial}
            onChange={set('currentTopMaterial')}
            error={errors.currentTopMaterial}
          />
        )}

        {/* Sink config */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Sink Configuration</Text>
        <OptionPicker
          label="Basin Type"
          options={BASIN_OPTIONS}
          value={form.sinkBasinPreference}
          onChange={set('sinkBasinPreference')}
          error={errors.sinkBasinPreference}
        />
        <OptionPicker
          label="Mount Style"
          options={MOUNT_OPTIONS}
          value={form.sinkMountPreference}
          onChange={set('sinkMountPreference')}
          error={errors.sinkMountPreference}
        />
        <OptionPicker
          label="Sink Material"
          options={SINK_MATERIAL_OPTIONS}
          value={form.sinkMaterialPreference}
          onChange={set('sinkMaterialPreference')}
          error={errors.sinkMaterialPreference}
        />

        {/* Backsplash + timeframe */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Finishing</Text>
        <OptionPicker
          label="Backsplash"
          options={BACKSPLASH_OPTIONS}
          value={form.backsplashPreference}
          onChange={set('backsplashPreference')}
          error={errors.backsplashPreference}
        />
        <OptionPicker
          label="Target Timeframe"
          options={TIMEFRAME_OPTIONS}
          value={form.timeframeGoal}
          onChange={set('timeframeGoal')}
          error={errors.timeframeGoal}
        />

        <View className="mt-4">
          <Button label="Request Quote" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
