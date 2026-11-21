import { View } from 'react-native';

import { AppIcon, AppText, Badge } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import type { CourseProgress } from '@/features/medications/stock';
import { useTheme } from '@/theme';
import { formatDoseAmount, formatTime } from '@/utils/format';

import { describeDoseStatus } from '../doseDisplay';

const copy = strings.today;

export function doseTitle(dose: DoseEventWithMedication): string {
  return dose.strength ? `${dose.medicationName} ${dose.strength}` : dose.medicationName;
}

/** "1 viên · Sau ăn · Ngày 4/7" */
export function doseMeta(dose: DoseEventWithMedication, course: CourseProgress | null): string {
  const parts = [formatDoseAmount(dose.doseAmount, dose.doseUnit)];
  if (dose.mealRelation !== 'any') parts.push(copy.mealRelation[dose.mealRelation]);
  if (course) parts.push(copy.courseProgress(course.day, course.totalDays));
  return parts.join(' · ');
}

/** Lưu ý an toàn cho thuốc người dùng đã đánh dấu có thể gây buồn ngủ / chóng mặt. */
export function DoseSafetyNotes({ dose }: { dose: DoseEventWithMedication }) {
  const { spacing } = useTheme();
  const notes: string[] = [];
  if (dose.causesDrowsiness) notes.push(copy.drowsyWarning);
  if (dose.causesDizziness) notes.push(copy.dizzyWarning);

  if (notes.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {notes.map((note) => (
        <View key={note} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
          <AppIcon name="warning-outline" color="warning" size={18} />
          <AppText variant="bodySmall" color="warning" style={{ flex: 1 }}>
            {note}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export interface DoseRowProps {
  dose: DoseEventWithMedication;
  now: Date;
  course: CourseProgress | null;
  showDivider: boolean;
}

/** Một cữ thuốc: giờ · tên thuốc · liều · trạng thái (icon + chữ, không chỉ dùng màu). */
export function DoseRow({ dose, now, course, showDivider }: DoseRowProps) {
  const { colors, spacing } = useTheme();
  const status = describeDoseStatus(dose, now);
  const time = formatTime(dose.scheduledAt);
  const meta = doseMeta(dose, course);

  return (
    <View
      accessible
      accessibilityLabel={`${time}, ${doseTitle(dose)}, ${meta}, ${status.label}`}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: colors.border,
      }}
    >
      <AppText variant="subtitle" style={{ minWidth: 64 }}>
        {time}
      </AppText>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText variant="label">{doseTitle(dose)}</AppText>
        <AppText variant="bodySmall" color="textSecondary">
          {meta}
        </AppText>
        <DoseSafetyNotes dose={dose} />
        <Badge tone={status.tone} icon={status.icon} label={status.label} />
      </View>
    </View>
  );
}
