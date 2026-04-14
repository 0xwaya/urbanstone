import React from 'react';
import {
  Text,
  TextInput,
  View,
  TextInputProps,
} from 'react-native';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export default function Field({ label, error, style, ...props }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-muted text-xs uppercase tracking-widest mb-1">{label}</Text>
      <TextInput
        placeholderTextColor="#a8afbf"
        className={[
          'bg-panel border rounded-xl px-4 py-3 text-foreground text-base',
          error ? 'border-red-500' : 'border-border',
        ].join(' ')}
        {...props}
      />
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
