import { useCallback, useState, type ReactElement } from 'react';
import { AccessibilityInfo, Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  BottomSheet,
  Button,
  Card,
  ChipGroup,
  TextField,
  TimeField,
  type ChipOption,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import {
  recordDoseTaken,
  skipDose,
  snoozeDose,
  undoDoseAction,
  type DoseEventWithMedication,
} from '@/db/repositories/doseEventRepository';
import { replaceDoseSideEffects } from '@/db/repositories/sideEffectRepository';
import {
  SNOOZE_OPTIONS,
  isVeryLate,
  resolveTakenStatus,
  snoozeUntil,
  validateTakenTime,
} from '@/features/medications/doseActions';
import { refreshReminders } from '@/services/notifications/reminderService';
import type { SideEffectTag } from '@/types/models';
import { useTheme } from '@/theme';
import { atLocalTime } from '@/utils/date';
import { formatTime } from '@/utils/format';

import { doseTitle } from './components/DoseRow';

const copy = strings.doseActions;

type SkipReasonKey = keyof typeof copy.skipReasons;
const SKIP_REASON_OPTIONS: readonly ChipOption<SkipReasonKey>[] = (
  Object.keys(copy.skipReasons) as SkipReasonKey[]
).map((key) => ({ value: key, label: copy.skipReasons[key] }));

type SheetState =
  | { mode: 'menu'; dose: DoseEventWithMedication }
  | { mode: 'late'; dose: DoseEventWithMedication; time: string }
  | { mode: 'skip'; dose: DoseEventWithMedication; reason: SkipReasonKey | null; custom: string };

export interface DoseActionController {
  /** Id cữ đang ghi (để khóa nút, tránh bấm 2 lần). */
  busyId: string | null;
  /** "Đã uống" ngay bây giờ (cữ trễ nhiều → mở bảng chọn giờ kèm lời nhắc hỏi bác sĩ / dược sĩ). */
  takeNow: (dose: DoseEventWithMedication) => void;
  /** Mở bảng thao tác khác: nhắc lại, uống lúc khác, bỏ qua. */
  openMore: (dose: DoseEventWithMedication) => void;
  /** Mở thẳng bảng chọn giờ uống (VD bấm "Đã uống" trên thông báo khi cữ đã trễ nhiều). */
  openLate: (dose: DoseEventWithMedication) => void;
  snooze: (dose: DoseEventWithMedication, minutes: number) => void;
  undo: (dose: DoseEventWithMedication) => void;
  saveSideEffects: (
    dose: DoseEventWithMedication,
    tags: readonly SideEffectTag[],
    note: string | null,
  ) => Promise<boolean>;
  /** Bảng thao tác — đặt một lần trong màn hình. */
  sheet: ReactElement | null;
}

/** Thao tác trên cữ thuốc ở màn hình Hôm nay (thường & Đang mệt). `onChanged` = tải lại dữ liệu. */
export function useDoseActions(onChanged: () => void): DoseActionController {
  const db = useDatabase();
  const { spacing } = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  function run(dose: DoseEventWithMedication, action: () => Promise<void>, announcement: string) {
    if (busyId) return;
    setBusyId(dose.id);
    setSheet(null);
    action()
      // Hủy / đặt lại thông báo của cữ vừa thao tác (VD nhắc lại → thông báo mới sau 10 phút).
      .then(() =>
        refreshReminders(db).catch((error: unknown) => console.warn('[dose] Không cập nhật được thông báo', error)),
      )
      .then(
        () => {
          setBusyId(null);
          AccessibilityInfo.announceForAccessibility(announcement);
          onChanged();
        },
        (error: unknown) => {
          console.error('[dose] Thao tác thất bại', error);
          setBusyId(null);
          Alert.alert(strings.common.errorTitle, copy.actionFailed);
        },
      );
  }

  function recordTaken(dose: DoseEventWithMedication, takenAt: Date) {
    const stamp = new Date().toISOString();
    run(
      dose,
      () => recordDoseTaken(db, dose.id, takenAt.toISOString(), resolveTakenStatus(dose.scheduledAt, takenAt), stamp),
      copy.announceTaken(dose.medicationName),
    );
  }

  const takeNow = (dose: DoseEventWithMedication) => {
    const now = new Date();
    if (isVeryLate(dose.scheduledAt, now)) {
      setSheet({ mode: 'late', dose, time: formatTime(now) });
      return;
    }
    recordTaken(dose, now);
  };

  const snooze = (dose: DoseEventWithMedication, minutes: number) => {
    const now = new Date();
    const until = snoozeUntil(now, minutes);
    run(
      dose,
      () => snoozeDose(db, dose.id, until.toISOString(), now.toISOString()),
      copy.announceSnoozed(dose.medicationName, formatTime(until)),
    );
  };

  const undo = (dose: DoseEventWithMedication) => {
    run(dose, () => undoDoseAction(db, dose.id, new Date().toISOString()), copy.announceUndone(dose.medicationName));
  };

  const saveSideEffects = async (
    dose: DoseEventWithMedication,
    tags: readonly SideEffectTag[],
    note: string | null,
  ): Promise<boolean> => {
    try {
      await replaceDoseSideEffects(db, dose, tags, note);
      onChanged();
      return true;
    } catch (error) {
      console.error('[dose] Không lưu được phản ứng', error);
      Alert.alert(strings.common.errorTitle, strings.sideEffects.saveFailed);
      return false;
    }
  };

  const close = () => setSheet(null);
  const openLate = useCallback(
    (dose: DoseEventWithMedication) => setSheet({ mode: 'late', dose, time: formatTime(new Date()) }),
    [],
  );
  let sheetElement: ReactElement | null = null;

  if (sheet) {
    const { dose } = sheet;
    const title = copy.sheetTitle(doseTitle(dose), formatTime(dose.scheduledAt));
    let body: ReactElement;

    if (sheet.mode === 'menu') {
      body = (
        <View style={{ gap: spacing.sm }}>
          {SNOOZE_OPTIONS.map((minutes) => (
            <Button
              key={minutes}
              title={copy.snooze(minutes)}
              icon="alarm-outline"
              variant="secondary"
              fullWidth
              onPress={() => snooze(dose, minutes)}
            />
          ))}
          <Button
            title={copy.takeLate}
            icon="time-outline"
            variant="outline"
            fullWidth
            onPress={() => setSheet({ mode: 'late', dose, time: formatTime(new Date()) })}
          />
          <Button
            title={copy.skip}
            icon="remove-circle-outline"
            variant="outline"
            fullWidth
            onPress={() => setSheet({ mode: 'skip', dose, reason: null, custom: '' })}
          />
        </View>
      );
    } else if (sheet.mode === 'late') {
      const now = new Date();
      const takenAt = atLocalTime(now, sheet.time);
      const error = validateTakenTime(dose.scheduledAt, takenAt, now);
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="subtitle">{copy.lateTitle}</AppText>
          <TimeField
            label={copy.lateTimeLabel}
            value={sheet.time}
            onChange={(time) => setSheet({ ...sheet, time })}
            error={error === 'future' ? copy.futureTimeError : error === 'too_early' ? copy.tooEarlyError : undefined}
          />
          {isVeryLate(dose.scheduledAt, takenAt) ? (
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <AppIcon name="information-circle" color="info" />
                <AppText style={{ flex: 1 }}>{copy.veryLateNote}</AppText>
              </View>
            </Card>
          ) : null}
          <Button
            title={copy.lateConfirm(sheet.time)}
            icon="checkmark-circle-outline"
            fullWidth
            disabled={error !== null}
            onPress={() => recordTaken(dose, takenAt)}
          />
        </View>
      );
    } else {
      const reasonText =
        sheet.reason === null
          ? null
          : sheet.reason === 'other'
            ? sheet.custom.trim() || null
            : copy.skipReasons[sheet.reason];
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="subtitle">{copy.skipTitle}</AppText>
          <AppText color="textSecondary">{copy.skipNote}</AppText>
          <ChipGroup<SkipReasonKey>
            options={SKIP_REASON_OPTIONS}
            value={sheet.reason}
            onChange={(reason) => setSheet({ ...sheet, reason: sheet.reason === reason ? null : reason })}
            accessibilityLabel={copy.skipReasonLabel}
          />
          {sheet.reason === 'other' ? (
            <TextField
              label={copy.skipCustomLabel}
              value={sheet.custom}
              onChangeText={(custom) => setSheet({ ...sheet, custom })}
              maxLength={100}
            />
          ) : null}
          <Button
            title={copy.skipConfirm}
            icon="remove-circle-outline"
            variant="danger"
            fullWidth
            onPress={() =>
              run(
                dose,
                () => skipDose(db, dose.id, reasonText, new Date().toISOString()),
                copy.announceSkipped(dose.medicationName),
              )
            }
          />
        </View>
      );
    }

    sheetElement = (
      <BottomSheet visible title={title} onClose={close}>
        {body}
      </BottomSheet>
    );
  }

  return {
    busyId,
    takeNow,
    openMore: (dose) => setSheet({ mode: 'menu', dose }),
    openLate,
    snooze,
    undo,
    saveSideEffects,
    sheet: sheetElement,
  };
}
