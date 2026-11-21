import { useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { MedicationEditor } from '@/features/medications/components/MedicationEditor';
import { useMedicationEditorData } from '@/features/medications/useMedicationEditorData';

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useMedicationEditorData({ medicationId: id });

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
        <EmptyState icon="medkit-outline" title={strings.medications.notFound} />
      </Screen>
    );
  }
  // key: mở lại thuốc khác trên cùng màn hình → form khởi tạo lại từ đầu.
  return <MedicationEditor key={state.data.medication?.id} data={state.data} />;
}
