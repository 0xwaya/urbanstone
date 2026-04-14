import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Option {
  value: string;
  label: string;
}

interface PickerProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  error?: string | null;
  multi?: boolean;
  multiValue?: string[];
  onMultiChange?: (vals: string[]) => void;
}

export default function OptionPicker({
  label,
  options,
  value,
  onChange,
  error,
  multi,
  multiValue = [],
  onMultiChange,
}: PickerProps) {
  const handlePress = (opt: string) => {
    if (multi && onMultiChange) {
      const next = multiValue.includes(opt)
        ? multiValue.filter(v => v !== opt)
        : [...multiValue, opt];
      onMultiChange(next);
    } else {
      onChange(opt);
    }
  };

  const isSelected = (opt: string) =>
    multi ? multiValue.includes(opt) : value === opt;

  return (
    <View className="mb-4">
      <Text className="text-muted text-xs uppercase tracking-widest mb-2">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row flex-wrap gap-2">
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => handlePress(opt.value)}
              className={[
                'px-3 py-2 rounded-lg border mr-2 mb-2',
                isSelected(opt.value)
                  ? 'bg-accent border-accent'
                  : 'bg-panel border-border',
              ].join(' ')}
            >
              <Text
                className={isSelected(opt.value) ? 'text-white text-sm font-medium' : 'text-muted text-sm'}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {error ? <Text className="text-red-400 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
