import { View } from 'react-native';

import {
  AppIcon,
  AppText,
  Card,
  ChipGroup,
  DateField,
  Field,
  NumberField,
  Section,
  SwitchRow,
  TextField,
  type ChipOption,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { Allergy, MealRelation, MedicationForm as MedicationFormKind } from '@/types/models';
import { useTheme } from '@/theme';
import { addDays, parseLocalDateKey } from '@/utils/date';
import { formatWeekdayDate } from '@/utils/format';

import { findAllergyMatches } from '../allergyCheck';
import {
  DEFAULT_DOSE_UNITS,
  MEAL_RELATIONS,
  MEDICATION_FORMS,
  parseDecimalInput,
  type MedicationFormErrors,
  type MedicationFormValues,
} from '../medicationForm';
import type { RoutineConfig } from '../scheduling';

import { ScheduleEditor } from './ScheduleEditor';

const copy = strings.medications;

const FORM_OPTIONS: readonly ChipOption<MedicationFormKind>[] = MEDICATION_FORMS.map((form) => ({
  value: form,
  label: copy.forms[form],
}));

const MEAL_OPTIONS: readonly ChipOption<MealRelation>[] = MEAL_RELATIONS.map((relation) => ({
  value: relation,
  label: copy.mealRelations[relation],
}));

/** Thứ Hai → Chủ nhật. */
const WEEKDAY_OPTIONS: readonly ChipOption<number>[] = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  value: day,
  label: strings.format.weekdaysShort[day] ?? '',
}));

export interface MedicationFormProps {
  values: MedicationFormValues;
  errors: MedicationFormErrors;
  onChange: (patch: Partial<MedicationFormValues>) => void;
  allergies: readonly Allergy[];
  routine: RoutineConfig;
  today: Date;
}

function lastDayHint(values: MedicationFormValues): string | undefined {
  const duration = parseDecimalInput(values.durationDays);
  if (duration === null || !Number.isInteger(duration) || duration < 1) return undefined;
  try {
    return copy.lastDayHint(formatWeekdayDate(addDays(parseLocalDateKey(values.startDate), duration - 1)));
  } catch {
    return undefined;
  }
}

/** Form Thêm / Sửa thuốc (chỉ hiển thị; trạng thái và lưu nằm ở màn hình gọi). */
export function MedicationForm({ values, errors, onChange, allergies, routine, today }: MedicationFormProps) {
  const { spacing } = useTheme();
  const allergyMatches = findAllergyMatches([values.name, values.activeIngredient], allergies);

  function changeForm(form: MedicationFormKind) {
    // Đổi dạng thuốc → đổi đơn vị mặc định nếu người dùng chưa tự sửa đơn vị.
    const unitIsDefault = values.doseUnit.trim() === DEFAULT_DOSE_UNITS[values.form];
    onChange(unitIsDefault ? { form, doseUnit: DEFAULT_DOSE_UNITS[form] } : { form });
  }

  return (
    <>
      <Section title={copy.basicsTitle}>
        <TextField
          label={copy.nameLabel}
          value={values.name}
          onChangeText={(name) => onChange({ name })}
          placeholder={copy.namePlaceholder}
          maxLength={100}
          autoCapitalize="sentences"
          error={errors.name}
        />
        <TextField
          label={copy.strengthLabel}
          value={values.strength}
          onChangeText={(strength) => onChange({ strength })}
          placeholder={copy.strengthPlaceholder}
          maxLength={50}
        />
        <TextField
          label={copy.ingredientLabel}
          value={values.activeIngredient}
          onChangeText={(activeIngredient) => onChange({ activeIngredient })}
          placeholder={copy.ingredientPlaceholder}
          hint={copy.ingredientHint}
          maxLength={100}
        />
        {allergyMatches.length > 0 ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppIcon name="warning" color="danger" />
              <AppText variant="label" color="danger" style={{ flex: 1 }}>
                {copy.allergyWarningTitle}
              </AppText>
            </View>
            <AppText accessibilityLiveRegion="polite">
              {copy.allergyWarning(allergyMatches.map((allergy) => allergy.substance).join(', '))}
            </AppText>
          </Card>
        ) : null}
        <Field label={copy.formLabel}>
          <ChipGroup
            options={FORM_OPTIONS}
            value={values.form}
            onChange={changeForm}
            accessibilityLabel={copy.formLabel}
          />
        </Field>
      </Section>

      <Section title={copy.doseTitle} description={copy.doseHint}>
        <NumberField
          label={copy.doseAmountLabel}
          value={values.doseAmount}
          onChangeText={(doseAmount) => onChange({ doseAmount })}
          decimal
          step={0.5}
          min={0.5}
          max={1000}
          suffix={values.doseUnit}
          error={errors.doseAmount}
        />
        <TextField
          label={copy.doseUnitLabel}
          value={values.doseUnit}
          onChangeText={(doseUnit) => onChange({ doseUnit })}
          maxLength={20}
          error={errors.doseUnit}
        />
        <Field label={copy.mealLabel}>
          <ChipGroup
            options={MEAL_OPTIONS}
            value={values.mealRelation}
            onChange={(mealRelation) => onChange({ mealRelation })}
            accessibilityLabel={copy.mealLabel}
          />
        </Field>
      </Section>

      <Section title={copy.timingTitle}>
        <ScheduleEditor
          values={values}
          error={errors.schedules}
          onChange={onChange}
          routine={routine}
          today={today}
        />
      </Section>

      <Section title={copy.daysTitle}>
        <SwitchRow
          icon="calendar-outline"
          label={copy.everyDay}
          description={copy.everyDayDescription}
          value={values.everyDay}
          onValueChange={(everyDay) => onChange({ everyDay })}
        />
        {!values.everyDay ? (
          <Field label={copy.daysLabel} error={errors.daysOfWeek}>
            <ChipGroup<number>
              multiple
              options={WEEKDAY_OPTIONS}
              value={values.daysOfWeek}
              onChange={(daysOfWeek) => onChange({ daysOfWeek })}
              accessibilityLabel={copy.daysLabel}
            />
          </Field>
        ) : null}
      </Section>

      <Section title={copy.courseTitle}>
        <DateField
          label={copy.startDateLabel}
          value={values.startDate}
          onChange={(startDate) => onChange({ startDate })}
          error={errors.startDate}
        />
        <SwitchRow
          icon="infinite-outline"
          label={copy.longTermLabel}
          description={copy.longTermDescription}
          value={values.longTerm}
          onValueChange={(longTerm) => onChange({ longTerm })}
        />
        {!values.longTerm ? (
          <NumberField
            label={copy.durationLabel}
            value={values.durationDays}
            onChangeText={(durationDays) => onChange({ durationDays })}
            min={1}
            max={365}
            suffix={strings.common.days}
            hint={lastDayHint(values)}
            error={errors.durationDays}
          />
        ) : null}
      </Section>

      <Section title={copy.stockTitle}>
        <SwitchRow
          icon="cube-outline"
          label={copy.trackStockLabel}
          description={copy.trackStockDescription}
          value={values.trackStock}
          onValueChange={(trackStock) => onChange({ trackStock })}
        />
        {values.trackStock ? (
          <>
            <NumberField
              label={copy.quantityLabel}
              value={values.quantityOnHand}
              onChangeText={(quantityOnHand) => onChange({ quantityOnHand })}
              decimal
              min={0}
              max={10_000}
              suffix={values.doseUnit}
              error={errors.quantityOnHand}
            />
            <NumberField
              label={copy.lowStockLabel}
              value={values.lowStockThresholdDays}
              onChangeText={(lowStockThresholdDays) => onChange({ lowStockThresholdDays })}
              min={0}
              max={60}
              suffix={strings.common.days}
              error={errors.lowStockThresholdDays}
            />
          </>
        ) : null}
      </Section>

      <Section title={copy.safetyTitle} description={copy.safetyDescription}>
        <SwitchRow
          icon="moon-outline"
          label={copy.drowsyLabel}
          value={values.causesDrowsiness}
          onValueChange={(causesDrowsiness) => onChange({ causesDrowsiness })}
        />
        <SwitchRow
          icon="sync-outline"
          label={copy.dizzyLabel}
          value={values.causesDizziness}
          onValueChange={(causesDizziness) => onChange({ causesDizziness })}
        />
        <TextField
          label={copy.instructionsLabel}
          value={values.instructions}
          onChangeText={(instructions) => onChange({ instructions })}
          placeholder={copy.instructionsPlaceholder}
          multiline
          maxLength={500}
        />
      </Section>
    </>
  );
}
