import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppIcon, AppText, Button, Card, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import {
  createMedication,
  deleteMedication,
  setMedicationActive,
  updateMedication,
} from '@/db/repositories/medicationRepository';
import { useTheme } from '@/theme';

import { syncDoseEvents } from '../doseSyncService';
import {
  buildScheduleInputs,
  createEmptyFormValues,
  formValuesFromMedication,
  hasErrors,
  toMedicationInput,
  validateMedicationForm,
  type MedicationFormValues,
} from '../medicationForm';
import type { MedicationEditorData } from '../useMedicationEditorData';

import { MedicationForm } from './MedicationForm';

const copy = strings.medications;

/** Màn hình nhập thuốc dùng chung cho Thêm & Sửa: kiểm tra → lưu → đồng bộ cữ thuốc → quay lại. */
export function MedicationEditor({ data }: { data: MedicationEditorData }) {
  const db = useDatabase();
  const router = useRouter();
  const { spacing } = useTheme();
  const [today] = useState(() => new Date());
  const [values, setValues] = useState<MedicationFormValues>(() =>
    data.medication ? formValuesFromMedication(data.medication, data.schedules) : createEmptyFormValues(today),
  );
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Chỉ hiện lỗi sau lần bấm Lưu đầu tiên, sau đó cập nhật ngay khi người dùng sửa.
  const errors = submitted ? validateMedicationForm(values) : {};
  const update = (patch: Partial<MedicationFormValues>) => setValues((previous) => ({ ...previous, ...patch }));

  /** Chạy thao tác ghi → đồng bộ cữ → quay lại; lỗi thì báo bằng tiếng Việt, ở lại màn hình. */
  function run(action: () => Promise<unknown>, failedMessage: string) {
    setBusy(true);
    action()
      .then(() => syncDoseEvents(db))
      .then(
        () => {
          setBusy(false);
          router.back();
        },
        (error: unknown) => {
          console.error('[medications] Lưu thất bại', error);
          setBusy(false);
          Alert.alert(strings.common.errorTitle, failedMessage);
        },
      );
  }

  function handleSave() {
    setSubmitted(true);
    if (busy || hasErrors(validateMedicationForm(values))) return;
    const input = toMedicationInput(values);
    const schedules = buildScheduleInputs(values, data.schedules);
    const { medication } = data;
    run(
      () =>
        medication
          ? updateMedication(db, medication.id, input, schedules)
          : createMedication(db, data.profile.id, input, schedules),
      copy.saveFailed,
    );
  }

  function confirmToggleActive() {
    const { medication } = data;
    if (!medication) return;
    if (!medication.isActive) {
      run(() => setMedicationActive(db, medication.id, true), copy.actionFailed);
      return;
    }
    Alert.alert(copy.stopConfirmTitle, copy.stopConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: copy.stop,
        style: 'destructive',
        onPress: () => run(() => setMedicationActive(db, medication.id, false), copy.actionFailed),
      },
    ]);
  }

  function confirmDelete() {
    const { medication } = data;
    if (!medication) return;
    Alert.alert(copy.deleteConfirmTitle, copy.deleteConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () => run(() => deleteMedication(db, medication.id), copy.actionFailed),
      },
    ]);
  }

  const showErrorSummary = submitted && hasErrors(errors);

  return (
    <Screen keyboardAware safeBottom>
      <AppText color="textSecondary">{copy.forProfile(data.profile.displayName)}</AppText>

      <MedicationForm
        values={values}
        errors={errors}
        onChange={update}
        allergies={data.allergies}
        routine={data.routine}
        today={today}
      />

      {showErrorSummary ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="alert-circle" color="danger" />
            <AppText color="danger" style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {copy.fixErrors}
            </AppText>
          </View>
        </Card>
      ) : null}

      <Button title={copy.save} icon="checkmark-circle-outline" fullWidth loading={busy} onPress={handleSave} />

      {data.medication ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            title={data.medication.isActive ? copy.stop : copy.resume}
            icon={data.medication.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            variant="outline"
            fullWidth
            disabled={busy}
            onPress={confirmToggleActive}
          />
          <Button
            title={copy.delete}
            icon="trash-outline"
            variant="ghost"
            fullWidth
            disabled={busy}
            onPress={confirmDelete}
          />
        </View>
      ) : null}
    </Screen>
  );
}
