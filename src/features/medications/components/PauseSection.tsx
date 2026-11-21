import { useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  BottomSheet,
  Button,
  Card,
  ChipGroup,
  DateField,
  Section,
  SwitchRow,
  TextField,
  type ChipOption,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { createPause, endPauseNow, listPausesForMedication } from '@/db/repositories/pauseRepository';
import type { Medication, MedicationPause } from '@/types/models';
import { useTheme } from '@/theme';

import { syncDoseEvents } from '../doseSyncService';
import {
  PAUSE_REASON_PRESETS,
  createPauseFormValues,
  describePause,
  findOpenPause,
  isPauseActive,
  toPauseInput,
  validatePauseForm,
  type PauseFormValues,
  type PauseReasonPreset,
} from '../pauses';

const copy = strings.pauses;

const REASON_OPTIONS: readonly ChipOption<PauseReasonPreset>[] = PAUSE_REASON_PRESETS.map((preset) => ({
  value: preset,
  label: copy.reasons[preset],
}));

type StartChoice = 'now' | 'date';
const START_OPTIONS: readonly ChipOption<StartChoice>[] = [
  { value: 'now', label: copy.startNow },
  { value: 'date', label: copy.startOnDate },
];

/** Tạm dừng có lý do & tự dùng lại (trong màn hình Sửa thuốc). */
export function PauseSection({ medication }: { medication: Medication }) {
  const db = useDatabase();
  const { spacing } = useTheme();
  const [pauses, setPauses] = useState<MedicationPause[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<PauseFormValues | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPausesForMedication(db, medication.id).then(
      (rows) => {
        if (!cancelled) setPauses(rows);
      },
      (error: unknown) => console.error('[pauses] Không đọc được tạm dừng', error),
    );
    return () => {
      cancelled = true;
    };
  }, [db, medication.id, reloadKey]);

  const now = new Date();
  const openPause = pauses ? findOpenPause(pauses, now) : null;

  function run(action: () => Promise<unknown>, announcement: string) {
    setBusy(true);
    action()
      .then(() => syncDoseEvents(db))
      .then(
        () => {
          setBusy(false);
          setForm(null);
          setReloadKey((value) => value + 1);
          AccessibilityInfo.announceForAccessibility(announcement);
        },
        (error: unknown) => {
          console.error('[pauses] Thao tác thất bại', error);
          setBusy(false);
          Alert.alert(strings.common.errorTitle, copy.saveFailed);
        },
      );
  }

  function save() {
    if (!form) return;
    setSubmitted(true);
    const at = new Date();
    if (Object.keys(validatePauseForm(form, at)).length > 0 || busy) return;
    run(() => createPause(db, medication.id, toPauseInput(form, at)), copy.activeLabel);
  }

  const errors = form && submitted ? validatePauseForm(form, now) : {};
  const update = (patch: Partial<PauseFormValues>) => setForm((previous) => (previous ? { ...previous, ...patch } : previous));

  return (
    <Section title={copy.sectionTitle} description={copy.sectionDescription}>
      {openPause ? (
        <Card variant="highlight">
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <AppIcon name="pause-circle" color="onPrimaryContainer" />
            <AppText color="onPrimaryContainer" style={{ flex: 1 }}>
              {describePause(openPause, now)}
            </AppText>
          </View>
          <Button
            title={isPauseActive(openPause, now) ? copy.resumeNow : copy.cancelUpcoming}
            icon="play-circle-outline"
            loading={busy}
            onPress={() => run(() => endPauseNow(db, openPause.id), copy.resumeNow)}
          />
        </Card>
      ) : (
        <Button
          title={copy.pause}
          icon="pause-circle-outline"
          variant="outline"
          fullWidth
          disabled={pauses === null}
          onPress={() => {
            setSubmitted(false);
            setForm(createPauseFormValues(new Date()));
          }}
        />
      )}

      {form ? (
        <BottomSheet visible title={copy.sheetTitle} onClose={() => setForm(null)}>
          <AppText variant="label">{copy.reasonLabel}</AppText>
          <ChipGroup
            options={REASON_OPTIONS}
            value={form.reasonPreset}
            onChange={(reasonPreset) => update({ reasonPreset })}
            accessibilityLabel={copy.reasonLabel}
          />
          {form.reasonPreset === 'other' ? (
            <TextField
              label={copy.customReasonLabel}
              value={form.customReason}
              onChangeText={(customReason) => update({ customReason })}
              maxLength={100}
            />
          ) : null}
          {errors.reason ? (
            <AppText variant="bodySmall" color="danger">
              {errors.reason}
            </AppText>
          ) : null}

          <AppText variant="label">{copy.startLabel}</AppText>
          <ChipGroup
            options={START_OPTIONS}
            value={form.startNow ? 'now' : 'date'}
            onChange={(choice) => update({ startNow: choice === 'now' })}
            accessibilityLabel={copy.startLabel}
          />
          {!form.startNow ? (
            <DateField
              label={copy.startDateLabel}
              value={form.startDate}
              onChange={(startDate) => update({ startDate })}
              error={errors.startDate}
            />
          ) : null}

          <SwitchRow
            icon="play-skip-forward-outline"
            label={copy.autoResumeLabel}
            description={copy.autoResumeDescription}
            value={form.autoResume}
            onValueChange={(autoResume) => update({ autoResume })}
          />
          {form.autoResume ? (
            <DateField
              label={copy.resumeDateLabel}
              value={form.resumeDate}
              onChange={(resumeDate) => update({ resumeDate })}
              error={errors.resumeDate}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <AppIcon name="information-circle" color="info" />
            <AppText variant="bodySmall" style={{ flex: 1 }}>
              {copy.safetyNote}
            </AppText>
          </View>
          <Button title={copy.confirm} icon="pause-circle-outline" fullWidth loading={busy} onPress={save} />
        </BottomSheet>
      ) : null}
    </Section>
  );
}
