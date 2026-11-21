import type { Medication, MedicationSchedule } from '@/types/models';
import { differenceInCalendarDays, parseLocalDateKey } from '@/utils/date';

import { averageDosesPerDay } from './scheduling';

/**
 * Tính toán tồn kho & tiến độ liệu trình (hàm thuần, không đọc DB — có unit test).
 * Số ngày còn đủ thuốc là ước lượng theo lịch uống; bước 2B trừ số viên mỗi lần bấm "Đã uống".
 */

/** Số lần uống trung bình mỗi ngày của một lịch (lịch chỉ uống vài ngày/tuần được chia đều). */
export function dosesPerDay(schedule: MedicationSchedule): number {
  return averageDosesPerDay(schedule);
}

/** Lượng thuốc dùng mỗi ngày (theo đơn vị của thuốc, VD: viên). */
export function dailyUsage(medication: Medication, schedules: readonly MedicationSchedule[]): number {
  return schedules
    .filter((schedule) => schedule.medicationId === medication.id && schedule.deletedAt === null)
    .reduce((sum, schedule) => sum + dosesPerDay(schedule) * (schedule.doseAmount ?? medication.doseAmount), 0);
}

export interface CourseProgress {
  /** Ngày thứ mấy của liệu trình (1-based). */
  day: number;
  totalDays: number;
  /** Số ngày còn lại SAU hôm nay. */
  remainingDaysAfterToday: number;
  finished: boolean;
}

/** Tiến độ liệu trình (VD "Ngày 4/7"); null nếu thuốc dài hạn hoặc chưa bắt đầu. */
export function getCourseProgress(medication: Medication, today: Date): CourseProgress | null {
  if (medication.durationDays === null) return null;
  const day = differenceInCalendarDays(today, parseLocalDateKey(medication.startDate)) + 1;
  if (day < 1) return null;
  const totalDays = medication.durationDays;
  return {
    day: Math.min(day, totalDays),
    totalDays,
    remainingDaysAfterToday: Math.max(totalDays - day, 0),
    finished: day > totalDays,
  };
}

export interface StockStatus {
  quantity: number;
  dailyUsage: number;
  /** Số ngày còn đủ thuốc (làm tròn xuống). */
  daysLeft: number;
  isLow: boolean;
}

/**
 * Tình trạng tồn kho; null nếu không theo dõi số lượng hoặc không có lịch uống.
 * - Thuốc dài hạn: sắp hết khi số ngày còn lại ≤ ngưỡng của thuốc.
 * - Thuốc theo liệu trình: chỉ cảnh báo khi KHÔNG đủ thuốc cho các ngày còn lại của liệu trình.
 */
export function getStockStatus(
  medication: Medication,
  schedules: readonly MedicationSchedule[],
  today: Date,
): StockStatus | null {
  if (medication.quantityOnHand === null) return null;
  const usage = dailyUsage(medication, schedules);
  if (usage <= 0) return null;

  const quantity = medication.quantityOnHand;
  const daysLeft = Math.floor(quantity / usage);
  const course = getCourseProgress(medication, today);

  const isLow = course
    ? !course.finished && daysLeft < course.remainingDaysAfterToday
    : daysLeft <= medication.lowStockThresholdDays;

  return { quantity, dailyUsage: usage, daysLeft, isLow };
}
