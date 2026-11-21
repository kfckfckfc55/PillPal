import { View } from 'react-native';

import { AppIcon, AppText, Badge, Card, Chip, ProgressBar, type IconName } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { Medication, Profile, Appointment } from '@/types/models';
import type { StockStatus } from '@/features/medications/stock';
import { useTheme, type ColorTokenName } from '@/theme';
import { differenceInCalendarDays } from '@/utils/date';
import { formatDateTime, formatDoseAmount } from '@/utils/format';

import type { DayProgress } from '../doseDisplay';

const copy = strings.today;

function CardHeading({ icon, title, color = 'primary' }: { icon: IconName; title: string; color?: ColorTokenName }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <AppIcon name={icon} color={color} />
      <AppText variant="label" style={{ flex: 1 }} accessibilityRole="header">
        {title}
      </AppText>
    </View>
  );
}

/** Thanh tiến độ "Đã uống x/y cữ". */
export function DayProgressCard({ progress }: { progress: DayProgress }) {
  const label = copy.progressLabel(progress.taken, progress.total);
  const done = progress.total > 0 && progress.taken === progress.total;
  return (
    <Card>
      <CardHeading icon="stats-chart-outline" title={copy.progressTitle} />
      <AppText>{label}</AppText>
      <ProgressBar value={progress.taken} max={progress.total} accessibilityLabel={label} />
      {done ? <Badge tone="success" label={copy.allDone} /> : null}
    </Card>
  );
}

/** Lịch khám sắp tới kèm đếm ngược. */
export function NextAppointmentCard({ appointment, now }: { appointment: Appointment | null; now: Date }) {
  if (!appointment) {
    return (
      <Card>
        <CardHeading icon="calendar-outline" title={copy.appointmentTitle} />
        <AppText color="textSecondary">{copy.noAppointment}</AppText>
      </Card>
    );
  }

  const days = differenceInCalendarDays(new Date(appointment.startsAt), now);
  const countdown =
    days <= 0 ? copy.countdown.today : days === 1 ? copy.countdown.tomorrow : copy.countdown.inDays(days);
  const typeLabel = copy.appointmentTypes[appointment.appointmentType];

  return (
    <Card>
      <CardHeading icon="calendar-outline" title={copy.appointmentTitle} />
      <Badge tone={days <= 1 ? 'warning' : 'info'} icon="hourglass-outline" label={countdown} />
      <AppText variant="title">
        {appointment.department ? `${typeLabel} · ${appointment.department}` : typeLabel}
      </AppText>
      <AppText>{formatDateTime(appointment.startsAt)}</AppText>
      {appointment.facility ? <AppText color="textSecondary">{appointment.facility}</AppText> : null}
    </Card>
  );
}

export interface LowStockItem {
  medication: Medication;
  stock: StockStatus;
}

/** Cảnh báo sắp hết thuốc. */
export function LowStockCard({ items }: { items: readonly LowStockItem[] }) {
  const { spacing } = useTheme();
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeading icon="alert-circle" title={copy.lowStockTitle} color="warning" />
      <View style={{ gap: spacing.xs }}>
        {items.map(({ medication, stock }) => (
          <AppText key={medication.id}>
            {copy.lowStockItem(
              medication.strength ? `${medication.name} ${medication.strength}` : medication.name,
              formatDoseAmount(stock.quantity, medication.doseUnit),
              stock.daysLeft,
            )}
          </AppText>
        ))}
      </View>
    </Card>
  );
}

/** Chọn hồ sơ để xem (bản đơn giản; chuyển hồ sơ đầy đủ ở Milestone 5). */
export function ProfileSwitcher({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: readonly Profile[];
  selectedId: string;
  onSelect: (profileId: string) => void;
}) {
  const { spacing } = useTheme();
  if (profiles.length < 2) return null;
  // Hàng tự xuống dòng (không dùng ScrollView ngang — dễ bị kéo giãn chiều cao, khó dùng với người lớn tuổi).
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={copy.profileSwitcherLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}
    >
      {profiles.map((profile) => (
        <Chip
          key={profile.id}
          label={profile.displayName}
          icon="person-circle-outline"
          selected={profile.id === selectedId}
          onPress={() => onSelect(profile.id)}
        />
      ))}
    </View>
  );
}
