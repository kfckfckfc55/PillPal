import { TextInput, View } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Field } from './Field';
import { StepButton } from './StepButton';

export interface NumberFieldProps {
  label: string;
  /** Giá trị dạng chữ (cho phép đang gõ dở, VD "1,"). */
  value: string;
  onChangeText: (value: string) => void;
  /** Bước của nút −/+ (mặc định 1). */
  step?: number;
  min?: number;
  max?: number;
  /** Cho phép số thập phân (dấu phẩy). */
  decimal?: boolean;
  /** Chữ đứng sau ô (VD đơn vị). */
  suffix?: string;
  hint?: string;
  error?: string;
}

function parse(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function format(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** Ô nhập số: gõ trực tiếp hoặc bấm −/+ (tiện cho người lớn tuổi). */
export function NumberField({
  label,
  value,
  onChangeText,
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  decimal = false,
  suffix,
  hint,
  error,
}: NumberFieldProps) {
  const { colors, typography, spacing, radius, touch } = useTheme();
  const current = parse(value);

  const change = (direction: 1 | -1) => {
    const base = current ?? (direction > 0 ? min - step : min + step);
    // Làm tròn về bội số của bước để tránh lỗi số thực (0,1 + 0,2…).
    const next = Math.round((base + direction * step) / step) * step;
    onChangeText(format(Math.min(max, Math.max(min, next))));
  };

  return (
    <Field label={label} hint={hint} error={error}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <StepButton
          icon="remove"
          accessibilityLabel={strings.fields.decrease(label)}
          onPress={() => change(-1)}
          disabled={current !== null && current <= min}
        />
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(text.replace(decimal ? /[^\d,.]/g : /\D/g, ''))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          accessibilityLabel={label}
          accessibilityHint={error ? `${strings.fields.errorPrefix}: ${error}` : hint}
          selectionColor={colors.primary}
          placeholderTextColor={colors.textSecondary}
          style={{
            flex: 1,
            minWidth: 64,
            // Màn hình rộng (tablet): không kéo ô số dài hết chiều ngang.
            maxWidth: 200,
            minHeight: touch.min,
            paddingHorizontal: spacing.md,
            borderRadius: radius.sm,
            borderWidth: error ? 2 : 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: typography.title.fontSize,
            fontWeight: '600',
            textAlign: 'center',
          }}
        />
        <StepButton
          icon="add"
          accessibilityLabel={strings.fields.increase(label)}
          onPress={() => change(1)}
          disabled={current !== null && current >= max}
        />
        {suffix ? (
          <AppText style={{ minWidth: 40 }} numberOfLines={2}>
            {suffix}
          </AppText>
        ) : null}
      </View>
    </Field>
  );
}
