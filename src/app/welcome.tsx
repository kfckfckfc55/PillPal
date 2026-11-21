import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppIcon, AppText, Button, Card, CheckboxRow, Screen, Section } from '@/components/ui';
import { LEGAL_DOCUMENT_VERSIONS, MEDICAL_DISCLAIMER } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { useConsent } from '@/features/onboarding/ConsentProvider';
import { useTheme } from '@/theme';

const copy = strings.welcome;

/**
 * Màn hình chào lần đầu: Medical Disclaimer + thông báo xử lý dữ liệu cá nhân.
 * Người dùng phải TỰ tick cả hai ô (không tick sẵn) rồi bấm nút — im lặng không phải là đồng ý.
 * Sau khi đồng ý, Stack.Protected ở root layout tự chuyển sang các tab chính.
 */
export default function WelcomeScreen() {
  const { colors, spacing, sickDayMode } = useTheme();
  const { accept } = useConsent();
  const [medicalChecked, setMedicalChecked] = useState(false);
  const [dataChecked, setDataChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const canStart = medicalChecked && dataChecked && !saving;
  const circle = sickDayMode ? 96 : 80;

  async function handleStart() {
    setSaving(true);
    try {
      await accept();
    } catch (error) {
      console.error('[welcome] Không ghi nhận được sự đồng ý', error);
      Alert.alert(copy.saveFailedTitle, copy.saveFailedMessage);
      setSaving(false);
    }
  }

  return (
    <Screen safeBottom>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md }}>
        <View
          style={{
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="heart" rawColor={colors.onPrimary} size={sickDayMode ? 48 : 40} />
        </View>
        <AppText variant="display" align="center">
          {strings.appName}
        </AppText>
        <AppText color="textSecondary" align="center">
          {copy.tagline}
        </AppText>
      </View>

      <Section title={copy.medicalTitle}>
        <Card>
          <AppText>{MEDICAL_DISCLAIMER}</AppText>
        </Card>
      </Section>

      <Section title={copy.dataTitle}>
        <Card>
          {copy.dataPoints.map((point) => (
            <View key={point} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <AppIcon name="shield-checkmark-outline" color="primary" size={20} />
              <AppText style={{ flex: 1 }}>{point}</AppText>
            </View>
          ))}
        </Card>
      </Section>

      <View style={{ gap: spacing.md }}>
        <CheckboxRow label={copy.confirmMedical} checked={medicalChecked} onChange={setMedicalChecked} />
        <CheckboxRow label={copy.confirmData} checked={dataChecked} onChange={setDataChecked} />
      </View>

      <Button
        title={copy.start}
        icon="arrow-forward"
        fullWidth
        disabled={!canStart}
        loading={saving}
        onPress={() => void handleStart()}
      />

      <View style={{ gap: spacing.xs }}>
        <AppText variant="bodySmall" color="textSecondary" align="center">
          {copy.declineHint}
        </AppText>
        <AppText variant="bodySmall" color="textSecondary" align="center">
          {copy.version(LEGAL_DOCUMENT_VERSIONS.data_processing_notice)}
        </AppText>
      </View>
    </Screen>
  );
}
