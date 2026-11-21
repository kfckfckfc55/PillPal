import { useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { MedicationEditor } from '@/features/medications/components/MedicationEditor';
import { useMedicationEditorData } from '@/features/medications/useMedicationEditorData';

export default function NewMedicationScreen() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const { state, retry } = useMedicationEditorData({ profileId });

  if (state.status === 'loading') {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen centered>
        <ErrorState message={`${strings.medications.loadError}\n${state.message}`} onRetry={retry} />
      </Screen>
    );
  }
  if (state.status === 'missing') {
    return (
      <Screen centered>
        <EmptyState icon="person-outline" title={strings.profiles.notFound} />
      </Screen>
    );
  }
  return <MedicationEditor data={state.data} />;
}
