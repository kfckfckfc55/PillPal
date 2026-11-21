import { View } from 'react-native';

import { AppIcon, AppText, Badge, Button } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import { canActOnDose, canUndoDose } from '@/features/medications/doseActions';
import type { CourseProgress } from '@/features/medications/stock';
import type { SideEffectLog } from '@/types/models';
import { useTheme } from '@/theme';
import { formatDoseAmount, formatTime } from '@/utils/format';

import { describeDoseStatus } from '../doseDisplay';
import type { DoseActionController } from '../useDoseActions';

import { SideEffectPanel } from './SideEffectPanel';

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
  /** Phản ứng sau uống đã ghi cho cữ này. */
  sideEffects: readonly SideEffectLog[];
  /** Lý do tạm dừng (khi cữ đang tạm dừng). */
  pauseReason: string | null;
  actions: DoseActionController;
}

/** Một cữ thuốc: giờ · tên thuốc · liều · trạng thái (icon + chữ, không chỉ dùng màu) · thao tác. */
export function DoseRow({ dose, now, course, showDivider, sideEffects, pauseReason, actions }: DoseRowProps) {
  const { colors, spacing } = useTheme();
  const status = describeDoseStatus(dose, now);
  const time = formatTime(dose.scheduledAt);
  const meta = doseMeta(dose, course);
  const title = doseTitle(dose);
  const busy = actions.busyId === dose.id;
  const statusLabel =
    dose.status === 'paused' && pauseReason ? `${status.label} · ${pauseReason}` : status.label;
  const undoButton = canUndoDose(dose) ? (
    <Button
      title={strings.doseActions.undo}
      icon="arrow-undo-outline"
      variant="ghost"
      compact
      accessibilityLabel={strings.doseActions.undoFor(title, time)}
      loading={busy}
      disabled={actions.busyId !== null}
      onPress={() => actions.undo(dose)}
    />
  ) : null;

  return (
    <View
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
        <View accessible accessibilityLabel={`${time}, ${title}, ${meta}, ${statusLabel}`} style={{ gap: spacing.xs }}>
          <AppText variant="label">{title}</AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {meta}
          </AppText>
          <DoseSafetyNotes dose={dose} />
          <Badge tone={status.tone} icon={status.icon} label={statusLabel} />
        </View>

        {canActOnDose(dose, now) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs }}>
            <Button
              title={strings.doseActions.take}
              icon="checkmark-circle-outline"
              accessibilityLabel={strings.doseActions.takeFor(title, time)}
              loading={busy}
              disabled={actions.busyId !== null}
              onPress={() => actions.takeNow(dose)}
            />
            <Button
              title={strings.doseActions.more}
              variant="outline"
              compact
              accessibilityLabel={strings.doseActions.moreFor(title)}
              disabled={actions.busyId !== null}
              onPress={() => actions.openMore(dose)}
            />
          </View>
        ) : null}

        {dose.status === 'taken' || dose.status === 'taken_late' ? (
          <SideEffectPanel
            medicationName={title}
            logs={sideEffects}
            onSave={(tags, note) => actions.saveSideEffects(dose, tags, note)}
            trailing={undoButton}
          />
        ) : canUndoDose(dose) ? (
          undoButton
        ) : null}
      </View>
    </View>
  );
}
