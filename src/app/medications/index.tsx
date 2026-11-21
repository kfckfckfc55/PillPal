import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Section,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { MedicationListItem } from '@/features/medications/components/MedicationListItem';
import { useMedicationList } from '@/features/medications/useMedicationList';
import { useResolvedProfile } from '@/features/profiles/useResolvedProfile';
import type { Medication, MedicationSchedule } from '@/types/models';
import { useTheme } from '@/theme';

const copy = strings.medications;

export default function MedicationListScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileState = useResolvedProfile(params.profileId);
  const profile = profileState.status === 'ready' ? profileState.profile : null;
  const { state, retry } = useMedicationList(profile?.id ?? null);

  if (profileState.status === 'missing') {
    return (
      <Screen centered>
        <EmptyState icon="person-outline" title={strings.profiles.notFound} />
      </Screen>
    );
  }
  if (profileState.status === 'error' || state.status === 'error') {
    const message = profileState.status === 'error' ? profileState.message : state.status === 'error' ? state.message : '';
    return (
      <Screen centered>
        <ErrorState message={`${copy.loadError}\n${message}`} onRetry={retry} />
      </Screen>
    );
  }
  if (!profile || state.status === 'loading') {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }

  const openNew = () => router.push({ pathname: '/medications/new', params: { profileId: profile.id } });
  const openEdit = (medication: Medication) =>
    router.push({ pathname: '/medications/[id]', params: { id: medication.id } });

  const today = new Date();
  const schedulesOf = (medication: Medication): MedicationSchedule[] =>
    state.schedules.filter((schedule) => schedule.medicationId === medication.id);
  const active = state.medications.filter((medication) => medication.isActive);
  const inactive = state.medications.filter((medication) => !medication.isActive);

  const renderList = (items: Medication[]) => (
    <View style={{ gap: spacing.md }}>
      {items.map((medication) => (
        <MedicationListItem
          key={medication.id}
          medication={medication}
          schedules={schedulesOf(medication)}
          today={today}
          onPress={() => openEdit(medication)}
        />
      ))}
    </View>
  );

  return (
    <Screen safeBottom>
      <AppText color="textSecondary">{copy.forProfile(profile.displayName)}</AppText>
      <Button title={copy.addMedication} icon="add-circle-outline" fullWidth onPress={openNew} />

      {state.medications.length === 0 ? (
        <Card>
          <EmptyState icon="medkit-outline" title={copy.emptyTitle} description={copy.emptyDescription} />
        </Card>
      ) : (
        <>
          {active.length > 0 ? <Section title={copy.activeSection}>{renderList(active)}</Section> : null}
          {inactive.length > 0 ? (
            <Section title={copy.inactiveSection}>{renderList(inactive)}</Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
