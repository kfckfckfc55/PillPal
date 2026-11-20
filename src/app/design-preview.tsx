import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  RadioGroup,
  Screen,
  Section,
  SwitchRow,
  type BadgeTone,
  type ButtonVariant,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { THEME_OPTIONS } from '@/features/settings/themeOptions';
import { useTheme, type ColorTokenName, type TextVariant } from '@/theme';

const copy = strings.designPreview;

const COLOR_TOKENS: readonly ColorTokenName[] = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'background',
  'surface',
  'surfaceVariant',
  'textPrimary',
  'textSecondary',
  'border',
  'success',
  'warning',
  'danger',
  'info',
  'onStatus',
];

const TEXT_VARIANTS: readonly TextVariant[] = [
  'display',
  'title',
  'subtitle',
  'body',
  'bodySmall',
  'label',
];

const BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger'];

const BADGE_TONES: readonly BadgeTone[] = ['success', 'warning', 'danger', 'info', 'neutral'];

/** Màn hình kiểm tra bộ giao diện ở 4 tổ hợp: Sáng/Tối × Thường/Sick-Day. Chỉ dùng khi phát triển. */
export default function DesignPreviewScreen() {
  const { colors, spacing, radius, preference, setPreference, sickDayMode, setSickDayMode } =
    useTheme();
  const [selectedChip, setSelectedChip] = useState<string>(copy.chips[0]);

  return (
    <Screen safeBottom>
      <AppText color="textSecondary">{copy.intro}</AppText>

      <Section title={copy.themeTitle}>
        <RadioGroup
          options={THEME_OPTIONS}
          value={preference}
          onChange={setPreference}
          accessibilityLabel={copy.themeTitle}
        />
      </Section>

      <Section title={copy.sickDayTitle}>
        <SwitchRow
          icon="bed-outline"
          label={copy.sickDayLabel}
          description={copy.sickDayDescription}
          value={sickDayMode}
          onValueChange={setSickDayMode}
        />
      </Section>

      <Section title={copy.colorsTitle}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {COLOR_TOKENS.map((token) => (
            <View
              key={token}
              style={{
                flexBasis: 150,
                flexGrow: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.sm,
                  backgroundColor: colors[token],
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
              <View style={{ flexShrink: 1 }}>
                <AppText variant="bodySmall" weight="600">
                  {token}
                </AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  {colors[token]}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title={copy.typographyTitle}>
        <Card>
          {TEXT_VARIANTS.map((variant) => (
            <AppText key={variant} variant={variant}>
              {copy.typographySamples[variant]}
            </AppText>
          ))}
        </Card>
      </Section>

      <Section title={copy.buttonsTitle}>
        <View style={{ gap: spacing.md }}>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} title={copy.buttons[variant]} fullWidth />
          ))}
          <Button title={copy.buttons.disabled} disabled fullWidth />
          <Button title={copy.buttons.loading} loading fullWidth />
        </View>
      </Section>

      <Section title={copy.chipsTitle}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {copy.chips.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              selected={selectedChip === chip}
              onPress={() => setSelectedChip(chip)}
            />
          ))}
        </View>
      </Section>

      <Section title={copy.badgesTitle}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone} label={copy.badges[tone]} />
          ))}
        </View>
      </Section>

      <Section title={copy.cardTitle}>
        <Card>
          <Badge tone="neutral" icon="time-outline" label={copy.sampleCard.time} />
          <AppText variant="title">{copy.sampleCard.name}</AppText>
          <AppText color="textSecondary">{copy.sampleCard.dose}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button title={copy.buttons.primary} icon="checkmark" />
            <Button title={copy.buttons.secondary} icon="alarm-outline" variant="secondary" />
          </View>
        </Card>
        <Card variant="highlight">
          <Badge tone="warning" label={copy.badges.warning} />
          <AppText color="onPrimaryContainer">{copy.sampleCard.dose}</AppText>
        </Card>
      </Section>

      <Section title={copy.statesTitle}>
        <Card>
          <EmptyState
            icon="medkit-outline"
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            actionLabel={copy.emptyAction}
            onAction={() => undefined}
          />
        </Card>
        <Card>
          <LoadingState />
        </Card>
        <Card>
          <ErrorState message={copy.errorMessage} onRetry={() => undefined} />
        </Card>
      </Section>
    </Screen>
  );
}
