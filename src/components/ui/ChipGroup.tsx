import { View } from 'react-native';

import { useTheme } from '@/theme';

import type { IconName } from './AppIcon';
import { Chip } from './Chip';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

interface ChipGroupBaseProps<T extends string | number> {
  options: readonly ChipOption<T>[];
  accessibilityLabel: string;
}

export interface SingleChipGroupProps<T extends string | number> extends ChipGroupBaseProps<T> {
  multiple?: false;
  value: T;
  onChange: (value: T) => void;
}

export interface MultiChipGroupProps<T extends string | number> extends ChipGroupBaseProps<T> {
  multiple: true;
  value: readonly T[];
  onChange: (value: T[]) => void;
}

export type ChipGroupProps<T extends string | number> = SingleChipGroupProps<T> | MultiChipGroupProps<T>;

/** Nhóm chip tự xuống dòng: chọn một (mặc định) hoặc chọn nhiều (`multiple`). */
export function ChipGroup<T extends string | number>(props: ChipGroupProps<T>) {
  const { spacing } = useTheme();

  const isSelected = (value: T) =>
    props.multiple ? props.value.includes(value) : props.value === value;

  const handlePress = (value: T) => {
    if (props.multiple) {
      const next = props.value.includes(value)
        ? props.value.filter((item) => item !== value)
        : [...props.value, value];
      props.onChange(next);
    } else {
      props.onChange(value);
    }
  };

  return (
    <View
      accessibilityRole={props.multiple ? undefined : 'radiogroup'}
      accessibilityLabel={props.accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
    >
      {props.options.map((option) => (
        <Chip
          key={String(option.value)}
          label={option.label}
          icon={option.icon}
          selected={isSelected(option.value)}
          onPress={() => handlePress(option.value)}
        />
      ))}
    </View>
  );
}
