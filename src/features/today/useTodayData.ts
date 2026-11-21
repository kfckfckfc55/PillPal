import { useFocusEffect } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getNextAppointment } from '@/db/repositories/appointmentRepository';
import {
  listDoseEventsBetween,
  type DoseEventWithMedication,
} from '@/db/repositories/doseEventRepository';
import {
  listAllergies,
  listConditions,
  listEmergencyContacts,
} from '@/db/repositories/healthProfileRepository';
import { listActiveMedications, listSchedulesForProfile } from '@/db/repositories/medicationRepository';
import { listProfiles } from '@/db/repositories/profileRepository';
import type {
  Allergy,
  Appointment,
  Condition,
  EmergencyContact,
  Medication,
  MedicationSchedule,
  Profile,
} from '@/types/models';
import { addDays, startOfLocalDay } from '@/utils/date';

export interface TodayData {
  now: Date;
  profiles: Profile[];
  profile: Profile;
  doses: DoseEventWithMedication[];
  medications: Medication[];
  schedules: MedicationSchedule[];
  nextAppointment: Appointment | null;
  allergies: Allergy[];
  conditions: Condition[];
  contacts: EmergencyContact[];
}

export type TodayState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: TodayData };

/** Đọc toàn bộ dữ liệu cho màn hình Hôm nay của một hồ sơ (null = hồ sơ mặc định). */
export async function loadTodayData(
  db: SQLiteDatabase,
  profileId: string | null,
  now: Date,
): Promise<TodayData | null> {
  const profiles = await listProfiles(db);
  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0];
  if (!profile) return null;

  const dayStart = startOfLocalDay(now);
  const dayEnd = addDays(dayStart, 1);

  const [doses, medications, schedules, nextAppointment, allergies, conditions, contacts] =
    await Promise.all([
      listDoseEventsBetween(db, profile.id, dayStart.toISOString(), dayEnd.toISOString()),
      listActiveMedications(db, profile.id),
      listSchedulesForProfile(db, profile.id),
      getNextAppointment(db, profile.id, now.toISOString()),
      listAllergies(db, profile.id),
      listConditions(db, profile.id),
      listEmergencyContacts(db, profile.id),
    ]);

  return {
    now,
    profiles,
    profile,
    doses,
    medications,
    schedules,
    nextAppointment,
    allergies,
    conditions,
    contacts,
  };
}

/** Dữ liệu màn hình Hôm nay; tự tải lại mỗi khi quay lại tab. */
export function useTodayData(profileId: string | null) {
  const db = useDatabase();
  const [state, setState] = useState<TodayState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  /** Tải dữ liệu (giờ "bây giờ" lấy tại lúc tải); trả về hàm hủy để bỏ kết quả cũ. */
  const runLoad = useCallback(() => {
    let cancelled = false;
    loadTodayData(db, profileId, new Date()).then(
      (data) => {
        if (cancelled) return;
        setState(data ? { status: 'ready', data } : { status: 'empty' });
        setRefreshing(false);
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('[today] Không đọc được dữ liệu', error);
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        setRefreshing(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, profileId]);

  // Tải mỗi khi tab Hôm nay được mở lại hoặc đổi hồ sơ.
  useFocusEffect(runLoad);

  /** Kéo xuống để làm mới (giữ nội dung cũ trong lúc tải). */
  const refresh = useCallback(() => {
    setRefreshing(true);
    runLoad();
  }, [runLoad]);

  /** Thử lại sau lỗi (hiện trạng thái đang tải). */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    runLoad();
  }, [runLoad]);

  return { state, refreshing, refresh, retry };
}
