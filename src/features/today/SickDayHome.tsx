import { Alert, Linking, View } from 'react-native';

import { AppText, Badge, Button, Card, Screen, Section } from '@/components/ui';
import { MEDICAL_DISCLAIMER_SHORT } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { getCourseProgress } from '@/features/medications/stock';
import { useTheme } from '@/theme';
import { formatTime, formatWeekdayDate } from '@/utils/format';

import { DoseSafetyNotes, doseMeta, doseTitle } from './components/DoseRow';
import { describeDoseStatus, getNextDose } from './doseDisplay';
import type { TodayData } from './useTodayData';

const copy = strings.sickDay;

async function callNumber(phone: string) {
  try {
    await Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
  } catch {
    // Máy ảo / máy tính bảng không có SIM không gọi được → báo rõ số cần gọi.
    Alert.alert(copy.callFailedTitle, copy.callFailedMessage(phone));
  }
}

export interface SickDayHomeProps {
  /** null khi chưa có hồ sơ nào — vẫn hiện nút gọi cấp cứu và nút tắt chế độ. */
  data: TodayData | null;
  onTurnOff: () => void;
}

/**
 * Chế độ Đang mệt: chữ to, nút lớn, chỉ giữ việc cần thiết —
 * cữ thuốc tiếp theo, gọi người thân / cấp cứu, thông tin khẩn cấp, nút tắt chế độ.
 */
export function SickDayHome({ data, onTurnOff }: SickDayHomeProps) {
  const { spacing } = useTheme();
  const now = data?.now ?? new Date();
  const nextDose = data ? getNextDose(data.doses) : null;
  const contact = data?.contacts[0] ?? null;
  const nextDoseMedication = nextDose
    ? data?.medications.find((medication) => medication.id === nextDose.medicationId)
    : undefined;
  const course = nextDoseMedication ? getCourseProgress(nextDoseMedication, now) : null;

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="display">{data ? copy.title(data.profile.displayName) : copy.titleNoName}</AppText>
        <AppText color="textSecondary">{formatWeekdayDate(now)}</AppText>
      </View>

      <Card>
        <AppText variant="subtitle" accessibilityRole="header">
          {copy.nextDoseTitle}
        </AppText>
        {nextDose ? (
          <>
            <AppText variant="display">{formatTime(nextDose.scheduledAt)}</AppText>
            <AppText variant="title">{doseTitle(nextDose)}</AppText>
            <AppText>{doseMeta(nextDose, course)}</AppText>
            <DoseSafetyNotes dose={nextDose} />
            {(() => {
              const status = describeDoseStatus(nextDose, now);
              return <Badge tone={status.tone} icon={status.icon} label={status.label} />;
            })()}
          </>
        ) : (
          <AppText>{copy.noNextDose}</AppText>
        )}
        <AppText variant="bodySmall" color="textSecondary">
          {strings.today.actionsComingSoon}
        </AppText>
      </Card>

      <Section title={copy.callFamilyTitle}>
        {contact ? (
          <Button
            title={copy.callContact(contact.name, contact.relation)}
            icon="call"
            fullWidth
            onPress={() => void callNumber(contact.phone)}
          />
        ) : (
          <AppText color="textSecondary">{copy.noContact}</AppText>
        )}
        <Button
          title={copy.callEmergency}
          icon="medkit"
          variant="danger"
          fullWidth
          onPress={() => void callNumber('115')}
        />
      </Section>

      {data ? (
        <Card>
          <AppText variant="subtitle" accessibilityRole="header">
            {copy.emergencyTitle}
          </AppText>
          <AppText>
            {copy.bloodType}: {data.profile.bloodType ?? copy.notRecorded}
          </AppText>
          <AppText variant="label">{copy.allergies}</AppText>
          {data.allergies.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {data.allergies.map((allergy) => (
                <Badge key={allergy.id} tone="danger" label={allergy.substance} />
              ))}
            </View>
          ) : (
            <AppText color="textSecondary">{copy.noAllergies}</AppText>
          )}
          <AppText variant="label">{copy.conditions}</AppText>
          <AppText color={data.conditions.length > 0 ? 'textPrimary' : 'textSecondary'}>
            {data.conditions.length > 0
              ? data.conditions.map((condition) => condition.name).join(', ')
              : copy.noConditions}
          </AppText>
        </Card>
      ) : null}

      <Button title={copy.turnOff} icon="sunny-outline" variant="outline" fullWidth onPress={onTurnOff} />

      <AppText variant="bodySmall" color="textSecondary">
        {MEDICAL_DISCLAIMER_SHORT}
      </AppText>
    </Screen>
  );
}
