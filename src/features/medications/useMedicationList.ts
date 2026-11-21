import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { listAllSchedulesForProfile, listMedications } from '@/db/repositories/medicationRepository';
import type { Medication, MedicationSchedule } from '@/types/models';

export type MedicationListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; medications: Medication[]; schedules: MedicationSchedule[] };

/** Thuốc (đang dùng + đã ngừng) của một hồ sơ; tự tải lại khi quay về màn hình. */
export function useMedicationList(profileId: string | null) {
  const db = useDatabase();
  const [state, setState] = useState<MedicationListState>({ status: 'loading' });

  const load = useCallback(() => {
    if (!profileId) return undefined;
    let cancelled = false;
    Promise.all([listMedications(db, profileId), listAllSchedulesForProfile(db, profileId)]).then(
      ([medications, schedules]) => {
        if (!cancelled) setState({ status: 'ready', medications, schedules });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('[medications] Không đọc được danh sách thuốc', error);
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, profileId]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}
