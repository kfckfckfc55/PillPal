import { TextInput, type TextInputProps } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';

import { Field } from './Field';

export interface TextFieldProps
  extends Omit<TextInputProps, 'style' | 'placeholderTextColor' | 'onChangeText' | 'value'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
}

/** Ô nhập chữ theo theme: chữ ≥ cỡ nội dung, cao ≥ 48dp, viền đỏ + chữ báo lỗi khi sai. */
export function TextField({
  label,
  value,
  onChangeText,
  hint,
  error,
  multiline,
  accessibilityHint,
  ...rest
}: TextFieldProps) {
  const { colors, typography, spacing, radius, touch } = useTheme();

  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error ? `${strings.fields.errorPrefix}: ${error}` : (accessibilityHint ?? hint)}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        {...rest}
        style={{
          minHeight: multiline ? touch.min * 2 : touch.min,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          fontSize: typography.body.fontSize,
          lineHeight: multiline ? typography.body.lineHeight : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </Field>
  );
}
