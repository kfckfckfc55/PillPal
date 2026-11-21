import { useFocusEffect } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

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
import { listOpenPausesForProfile } from '@/db/repositories/pauseRepository';
import { listProfiles } from '@/db/repositories/profileRepository';
import { loadRoutineConfig } from '@/db/repositories/routineRepository';
import { readTimeZoneState } from '@/db/repositories/settingsRepository';
import { listSideEffectsForDoses } from '@/db/repositories/sideEffectRepository';
import { syncDoseEvents } from '@/features/medications/doseSyncService';
import { resolveDayType } from '@/features/medications/scheduling';
import { offsetEastMinutes, scheduleShiftMinutes } from '@/features/medications/timeZone';
import type {
  Allergy,
  Appointment,
  Condition,
  DayType,
  EmergencyContact,
  Medication,
  MedicationPause,
  MedicationSchedule,
  Profile,
  SideEffectLog,
} from '@/types/models';
import { addDays, startOfLocalDay } from '@/utils/date';

export interface TodayData {
  now: Date;
  profiles: Profile[];
  profile: Profile;
  /** Loại ngày hôm nay của hồ sơ (quyết định giờ của các thuốc uống theo sinh hoạt). */
  dayType: DayType;
  doses: DoseEventWithMedication[];
  medications: Medication[];
  schedules: MedicationSchedule[];
  nextAppointment: Appointment | null;
  allergies: Allergy[];
  conditions: Condition[];
  contacts: EmergencyContact[];
  /** Phản ứng sau uống đã ghi cho các cữ hôm nay. */
  sideEffects: SideEffectLog[];
  /** Tạm dừng đang / sắp diễn ra của các thuốc thuộc hồ sơ. */
  openPauses: MedicationPause[];
  /** Đang giữ giờ uống theo múi giờ cũ: độ lệch (phút) và múi giờ gốc; 0 / null = theo giờ hiện tại. */
  timeZoneShiftMinutes: number;
  referenceOffsetMinutes: number | null;
}

export type TodayState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: TodayData };

/**
 * Đọc toàn bộ dữ liệu cho màn hình Hôm nay của một hồ sơ (null = hồ sơ mặc định).
 * Trước khi đọc, đồng bộ cữ thuốc với lịch uống (sinh cữ cho ngày mới, dời cữ khi lịch đổi).
 */
export async function loadTodayData(
  db: SQLiteDatabase,
  profileId: string | null,
  now: Date,
): Promise<TodayData | null> {
  const profiles = await listProfiles(db);
  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0];
  if (!profile) return null;

  // Lỗi đồng bộ cữ không được chặn việc xem dữ liệu đã có (vẫn hiện các cữ đã lưu).
  await syncDoseEvents(db, now).catch((error: unknown) => {
    console.warn('[today] Không đồng bộ được cữ thuốc', error);
  });

  const dayStart = startOfLocalDay(now);
  const dayEnd = addDays(dayStart, 1);

  const [
    doses,
    medications,
    schedules,
    nextAppointment,
    allergies,
    conditions,
    contacts,
    routine,
    openPauses,
    timeZone,
  ] = await Promise.all([
      listDoseEventsBetween(db, profile.id, dayStart.toISOString(), dayEnd.toISOString()),
      listActiveMedications(db, profile.id),
      listSchedulesForProfile(db, profile.id),
      getNextAppointment(db, profile.id, now.toISOString()),
      listAllergies(db, profile.id),
      listConditions(db, profile.id),
      listEmergencyContacts(db, profile.id),
      loadRoutineConfig(db, profile.id),
      listOpenPausesForProfile(db, profile.id, now.toISOString()),
      readTimeZoneState(db),
    ]);
  const timeZoneShiftMinutes = scheduleShiftMinutes(timeZone, offsetEastMinutes(now));
  const sideEffects = await listSideEffectsForDoses(
    db,
    doses.map((dose) => dose.id),
  );

  return {
    now,
    profiles,
    profile,
    dayType: resolveDayType(now, routine),
    doses,
    medications,
    schedules,
    nextAppointment,
    allergies,
    conditions,
    contacts,
    sideEffects,
    openPauses,
    timeZoneShiftMinutes,
    referenceOffsetMinutes: timeZoneShiftMinutes !== 0 ? timeZone.referenceOffsetMinutes : null,
  };
}

/** Dữ liệu màn hình Hôm nay; tự tải lại mỗi khi quay lại tab. */
export function useTodayData(profileId: string | null) {
  const db = useDatabase();
  const [state, setState] = useState<TodayState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  /** Chỉ nhận kết quả của lần tải mới nhất (tránh dữ liệu hồ sơ cũ đè lên khi đổi hồ sơ nhanh). */
  const latestRequest = useRef(0);

  /** Tải dữ liệu (giờ "bây giờ" lấy tại lúc tải); trả về hàm hủy để bỏ kết quả cũ. */
  const runLoad = useCallback(() => {
    let cancelled = false;
    latestRequest.current += 1;
    const requestId = latestRequest.current;
    const isStale = () => cancelled || requestId !== latestRequest.current;
    loadTodayData(db, profileId, new Date()).then(
      (data) => {
        if (isStale()) return;
        setState(data ? { status: 'ready', data } : { status: 'empty' });
        setRefreshing(false);
      },
      (error: unknown) => {
        if (isStale()) return;
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

  /** Tải lại âm thầm sau một thao tác (không hiện vòng xoay). */
  const reload = useCallback(() => {
    runLoad();
  }, [runLoad]);

  /** Thử lại sau lỗi (hiện trạng thái đang tải). */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    runLoad();
  }, [runLoad]);

  return { state, refreshing, refresh, reload, retry };
}
