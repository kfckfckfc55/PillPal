import { describe, expect, it } from '@jest/globals';

import type { MedicationPause } from '@/types/models';

import {
  createPauseFormValues,
  describePause,
  findOpenPause,
  isPauseActive,
  toPauseInput,
  validatePauseForm,
  type PauseFormValues,
} from '../pauses';
import { DEFAULT_ROUTINE_CONFIG, generateOccurrences, isPausedAt } from '../scheduling';

import { local, makeMedication, makeSchedule } from './fixtures';

const NOW = local(2026, 11, 21, 10, 0);

function pause(overrides: Partial<MedicationPause>): MedicationPause {
  return {
    id: 'pause-1',
    medicationId: 'med-1',
    reason: 'Trước nội soi',
    startAt: local(2026, 11, 21, 9, 0).toISOString(),
    endAt: local(2026, 11, 23).toISOString(),
    autoResume: true,
    remoteId: null,
    syncedAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

describe('form tạm dừng', () => {
  const base: PauseFormValues = { ...createPauseFormValues(NOW), reasonPreset: 'procedure' };

  it('mặc định: bắt đầu ngay, tự dùng lại từ ngày mai', () => {
    expect(validatePauseForm(base, NOW)).toEqual({});
    expect(toPauseInput(base, NOW)).toEqual({
      reason: 'Trước nội soi / thủ thuật',
      startAt: NOW.toISOString(),
      endAt: local(2026, 11, 22).toISOString(),
      autoResume: true,
    });
  });

  it('bắt buộc có lý do; "Khác" phải ghi lý do', () => {
    expect(validatePauseForm({ ...base, reasonPreset: null }, NOW).reason).toBeDefined();
    expect(validatePauseForm({ ...base, reasonPreset: 'other', customReason: ' ' }, NOW).reason).toBeDefined();
    expect(toPauseInput({ ...base, reasonPreset: 'other', customReason: ' Đi xa ' }, NOW).reason).toBe('Đi xa');
  });

  it('ngày dùng lại phải sau ngày bắt đầu; ngày bắt đầu không ở quá khứ', () => {
    expect(validatePauseForm({ ...base, resumeDate: '2026-11-21' }, NOW).resumeDate).toBeDefined();
    expect(validatePauseForm({ ...base, startNow: false, startDate: '2026-11-20' }, NOW).startDate).toBeDefined();
    expect(
      validatePauseForm({ ...base, startNow: false, startDate: '2026-11-24', resumeDate: '2026-11-24' }, NOW)
        .resumeDate,
    ).toBeDefined();
  });

  it('không hẹn ngày dùng lại → end_at null', () => {
    expect(toPauseInput({ ...base, autoResume: false }, NOW).endAt).toBeNull();
  });
});

describe('khoảng tạm dừng', () => {
  it('đang / sắp tạm dừng và mô tả bằng lời', () => {
    const active = pause({});
    expect(isPauseActive(active, NOW)).toBe(true);
    expect(describePause(active, NOW)).toBe('Đang tạm dừng · Trước nội soi · dùng lại từ 23/11/2026');
    const upcoming = pause({ startAt: local(2026, 11, 24).toISOString(), endAt: null });
    expect(describePause(upcoming, NOW)).toBe('Sẽ tạm dừng từ 24/11/2026 · Trước nội soi · đến khi bạn bật lại');
    expect(findOpenPause([pause({ endAt: local(2026, 11, 20).toISOString() }), upcoming], NOW)?.startAt).toBe(
      upcoming.startAt,
    );
  });

  it('cữ trong khoảng [bắt đầu, dùng lại) được đánh dấu tạm dừng', () => {
    const windows = [pause({})];
    expect(isPausedAt('med-1', local(2026, 11, 21, 8, 59), windows)).toBe(false);
    expect(isPausedAt('med-1', local(2026, 11, 22, 20, 0), windows)).toBe(true);
    expect(isPausedAt('med-1', local(2026, 11, 23, 0, 0), windows)).toBe(false);
    expect(isPausedAt('med-2', local(2026, 11, 22, 20, 0), windows)).toBe(false);

    const occurrences = generateOccurrences({
      medications: [makeMedication()],
      schedules: [makeSchedule({ timeOfDay: '08:00' }), makeSchedule({ id: 's-pm', timeOfDay: '20:00' })],
      configs: new Map([['profile-1', DEFAULT_ROUTINE_CONFIG]]),
      from: NOW,
      days: 3,
      pauses: windows,
    });
    expect(occurrences.map((item) => `${item.slotKey}@${item.scheduledAt.getHours()}:${item.paused ? 'P' : '-'}`)).toEqual([
      '2026-11-21#0@8:-',
      '2026-11-21#0@20:P',
      '2026-11-22#0@8:P',
      '2026-11-22#0@20:P',
      '2026-11-23#0@8:-',
      '2026-11-23#0@20:-',
    ]);
  });
});
