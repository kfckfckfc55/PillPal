import { useEffect, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { listAllergies } from '@/db/repositories/healthProfileRepository';
import { getMedication, listSchedulesForMedication } from '@/db/repositories/medicationRepository';
import { getDefaultProfile, getProfile } from '@/db/repositories/profileRepository';
import { loadRoutineConfig } from '@/db/repositories/routineRepository';
import type { Allergy, Medication, MedicationSchedule, Profile } from '@/types/models';

import type { RoutineConfig } from './scheduling';

export interface MedicationEditorData {
  profile: Profile;
  /** null = thêm thuốc mới. */
  medication: Medication | null;
  schedules: MedicationSchedule[];
  allergies: Allergy[];
  routine: RoutineConfig;
}

export type MedicationEditorState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MedicationEditorData };

async function loadEditorData(
  db: ReturnType<typeof useDatabase>,
  target: { profileId?: string; medicationId?: string },
): Promise<MedicationEditorData | null> {
  const medication = target.medicationId ? await getMedication(db, target.medicationId) : null;
  if (target.medicationId && !medication) return null;

  const profileId = medication?.profileId ?? target.profileId;
  const profile = profileId ? await getProfile(db, profileId) : await getDefaultProfile(db);
  if (!profile) return null;

  const [schedules, allergies, routine] = await Promise.all([
    medication ? listSchedulesForMedication(db, medication.id) : Promise.resolve([]),
    listAllergies(db, profile.id),
    loadRoutineConfig(db, profile.id),
  ]);
  return { profile, medication, schedules, allergies, routine };
}

/** Dữ liệu cho màn hình Thêm thuốc (`profileId`) hoặc Sửa thuốc (`medicationId`). */
export function useMedicationEditorData(target: { profileId?: string; medicationId?: string }) {
  const db = useDatabase();
  const [state, setState] = useState<MedicationEditorState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { profileId, medicationId } = target;

  useEffect(() => {
    let cancelled = false;
    loadEditorData(db, { profileId, medicationId }).then(
      (data) => {
        if (!cancelled) setState(data ? { status: 'ready', data } : { status: 'missing' });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('[medications] Không đọc được dữ liệu thuốc', error);
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, profileId, medicationId, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  };

  return { state, retry };
}
