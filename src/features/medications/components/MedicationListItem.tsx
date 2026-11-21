import { View } from 'react-native';

import { AppIcon, AppText, Badge, Card } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { Medication, MedicationSchedule } from '@/types/models';
import { useTheme } from '@/theme';
import { parseLocalDateKey } from '@/utils/date';
import { formatDate, formatDoseAmount } from '@/utils/format';

import { describeDays, describeSchedules } from '../scheduleText';
import { getCourseProgress, getStockStatus } from '../stock';

const copy = strings.medications;

export interface MedicationListItemProps {
  medication: Medication;
  schedules: readonly MedicationSchedule[];
  today: Date;
  onPress: () => void;
}

function courseText(medication: Medication, today: Date): string {
  if (medication.durationDays === null) return copy.longTerm;
  const progress = getCourseProgress(medication, today);
  if (!progress) {
    try {
      return copy.courseNotStarted(formatDate(parseLocalDateKey(medication.startDate)));
    } catch {
      return copy.courseDays(medication.durationDays);
    }
  }
  if (progress.finished) return copy.courseFinished;
  return strings.today.courseProgress(progress.day, progress.totalDays);
}

/** Một thuốc trong danh sách: tên · liều · giờ uống · ngày uống · liệu trình · số lượng còn. */
export function MedicationListItem({ medication, schedules, today, onPress }: MedicationListItemProps) {
  const { spacing } = useTheme();
  const title = medication.strength ? `${medication.name} ${medication.strength}` : medication.name;
  const stock = medication.isActive ? getStockStatus(medication, schedules, today) : null;

  return (
    <Card onPress={onPress} accessibilityLabel={copy.openItem(title)}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="label">{title}</AppText>
          <AppText>
            {formatDoseAmount(medication.doseAmount, medication.doseUnit)} ·{' '}
            {describeSchedules(schedules)}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {describeDays(schedules)} · {courseText(medication, today)}
          </AppText>
        </View>
        <AppIcon name="chevron-forward" color="textSecondary" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {!medication.isActive ? <Badge tone="neutral" icon="pause-circle" label={copy.stopped} /> : null}
        {medication.quantityOnHand !== null ? (
          <Badge
            tone={stock?.isLow ? 'warning' : 'neutral'}
            icon={stock?.isLow ? 'alert-circle' : 'cube-outline'}
            label={copy.stockLeft(formatDoseAmount(medication.quantityOnHand, medication.doseUnit))}
          />
        ) : null}
        {medication.causesDrowsiness ? (
          <Badge tone="warning" icon="moon-outline" label={strings.medications.drowsyLabel} />
        ) : null}
        {medication.causesDizziness ? (
          <Badge tone="warning" icon="sync-outline" label={strings.medications.dizzyLabel} />
        ) : null}
      </View>
    </Card>
  );
}
