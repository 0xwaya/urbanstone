import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
}

export default function Button({ label, loading, variant = 'primary', disabled, ...props }: ButtonProps) {
  const base = 'rounded-xl px-6 py-4 items-center justify-center flex-row';
  const styles =
    variant === 'primary'
      ? `${base} bg-accent ${disabled || loading ? 'opacity-50' : ''}`
      : `${base} border border-border ${disabled || loading ? 'opacity-50' : ''}`;
  const textStyle = variant === 'primary' ? 'text-white font-semibold text-base' : 'text-foreground font-semibold text-base';

  return (
    <TouchableOpacity className={styles} disabled={disabled || loading} {...props}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : '#4a90e2'} className="mr-2" /> : null}
      <Text className={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}
