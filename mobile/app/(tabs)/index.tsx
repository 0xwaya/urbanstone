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
import {
  backsplashOptions,
  currentTopMaterialOptions,
  materialOptions,
  removalOptions,
  sinkBasinOptions,
  sinkMaterialOptions,
  sinkMountOptions,
  timeframeOptions,
  validateLeadForm,
} from '../../../shared/lead-form.js';

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
    const sharedErrors = validateLeadForm({
      ...form,
      totalSquareFootage: form.sqft,
    });

    return {
      ...sharedErrors,
      sqft: sharedErrors.totalSquareFootage,
    };
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
          options={materialOptions}
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
          options={removalOptions}
          value={form.currentTopRemoval}
          onChange={set('currentTopRemoval')}
          error={errors.currentTopRemoval}
        />
        {form.currentTopRemoval === 'yes' && (
          <OptionPicker
            label="Current Top Material"
            options={currentTopMaterialOptions}
            value={form.currentTopMaterial}
            onChange={set('currentTopMaterial')}
            error={errors.currentTopMaterial}
          />
        )}

        {/* Sink config */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Sink Configuration</Text>
        <OptionPicker
          label="Basin Type"
          options={sinkBasinOptions}
          value={form.sinkBasinPreference}
          onChange={set('sinkBasinPreference')}
          error={errors.sinkBasinPreference}
        />
        <OptionPicker
          label="Mount Style"
          options={sinkMountOptions}
          value={form.sinkMountPreference}
          onChange={set('sinkMountPreference')}
          error={errors.sinkMountPreference}
        />
        <OptionPicker
          label="Sink Material"
          options={sinkMaterialOptions}
          value={form.sinkMaterialPreference}
          onChange={set('sinkMaterialPreference')}
          error={errors.sinkMaterialPreference}
        />

        {/* Backsplash + timeframe */}
        <Text className="text-accent text-xs uppercase tracking-widest mb-3 mt-2">Finishing</Text>
        <OptionPicker
          label="Backsplash"
          options={backsplashOptions}
          value={form.backsplashPreference}
          onChange={set('backsplashPreference')}
          error={errors.backsplashPreference}
        />
        <OptionPicker
          label="Target Timeframe"
          options={timeframeOptions}
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
