import { describe, expect, it } from '@jest/globals';

import {
  canActOnDose,
  canUndoDose,
  deductStock,
  effectiveDueAt,
  isVeryLate,
  resolveTakenStatus,
  toggleSideEffectTag,
  validateTakenTime,
} from '../doseActions';

import { local } from './fixtures';

const EIGHT = local(2026, 11, 21, 8, 0).toISOString();

describe('đã uống / uống trễ', () => {
  it('trong vòng 60 phút (hoặc sớm hơn) là đúng giờ, sau đó là uống trễ', () => {
    expect(resolveTakenStatus(EIGHT, local(2026, 11, 21, 7, 45))).toBe('taken');
    expect(resolveTakenStatus(EIGHT, local(2026, 11, 21, 9, 0))).toBe('taken');
    expect(resolveTakenStatus(EIGHT, local(2026, 11, 21, 9, 1))).toBe('taken_late');
  });

  it('trễ từ 2 tiếng → hiện lời nhắc hỏi bác sĩ / dược sĩ (không tự khuyên uống bù)', () => {
    expect(isVeryLate(EIGHT, local(2026, 11, 21, 9, 59))).toBe(false);
    expect(isVeryLate(EIGHT, local(2026, 11, 21, 10, 0))).toBe(true);
  });

  it('giờ uống thực tế không được ở tương lai hoặc sớm quá 12 tiếng', () => {
    const now = local(2026, 11, 21, 10, 0);
    expect(validateTakenTime(EIGHT, local(2026, 11, 21, 9, 30), now)).toBeNull();
    expect(validateTakenTime(EIGHT, local(2026, 11, 21, 10, 5), now)).toBe('future');
    expect(validateTakenTime(local(2026, 11, 21, 22, 0).toISOString(), local(2026, 11, 21, 9, 0), now)).toBe(
      'too_early',
    );
  });
});

describe('khi nào được thao tác / hoàn tác', () => {
  const now = local(2026, 11, 21, 7, 0);
  it('chỉ cữ đang chờ / nhắc lại và từ 1 tiếng trước giờ uống', () => {
    expect(canActOnDose({ status: 'pending', scheduledAt: EIGHT }, now)).toBe(true);
    expect(canActOnDose({ status: 'pending', scheduledAt: local(2026, 11, 21, 8, 1).toISOString() }, now)).toBe(false);
    expect(canActOnDose({ status: 'snoozed', scheduledAt: EIGHT }, now)).toBe(true);
    expect(canActOnDose({ status: 'taken', scheduledAt: EIGHT }, now)).toBe(false);
    expect(canActOnDose({ status: 'paused', scheduledAt: EIGHT }, now)).toBe(false);
  });

  it('hoàn tác được cữ đã uống / bỏ qua, không hoàn tác cữ hệ thống đặt (quên, tạm dừng)', () => {
    expect(canUndoDose({ status: 'taken_late', scheduledAt: EIGHT })).toBe(true);
    expect(canUndoDose({ status: 'skipped', scheduledAt: EIGHT })).toBe(true);
    expect(canUndoDose({ status: 'missed', scheduledAt: EIGHT })).toBe(false);
    expect(canUndoDose({ status: 'paused', scheduledAt: EIGHT })).toBe(false);
  });

  it('cữ nhắc lại tính theo giờ nhắc lại', () => {
    const until = local(2026, 11, 21, 8, 15).toISOString();
    expect(effectiveDueAt({ status: 'snoozed', scheduledAt: EIGHT, snoozeUntil: until })).toBe(until);
    expect(effectiveDueAt({ status: 'pending', scheduledAt: EIGHT, snoozeUntil: null })).toBe(EIGHT);
  });
});

describe('đếm viên', () => {
  it('trừ một liều và nhớ đúng lượng đã trừ', () => {
    expect(deductStock(7, 1)).toEqual({ quantity: 6, deducted: 1 });
    expect(deductStock(2.5, 0.5)).toEqual({ quantity: 2, deducted: 0.5 });
  });

  it('không để tồn kho âm — chỉ trừ phần còn lại', () => {
    expect(deductStock(0.5, 1)).toEqual({ quantity: 0, deducted: 0.5 });
    expect(deductStock(0, 1)).toEqual({ quantity: 0, deducted: 0 });
  });
});

describe('phản ứng sau uống', () => {
  it('"Bình thường" loại trừ các phản ứng khác và ngược lại', () => {
    expect(toggleSideEffectTag([], 'drowsy')).toEqual(['drowsy']);
    expect(toggleSideEffectTag(['drowsy'], 'dizzy')).toEqual(['drowsy', 'dizzy']);
    expect(toggleSideEffectTag(['drowsy', 'dizzy'], 'normal')).toEqual(['normal']);
    expect(toggleSideEffectTag(['normal'], 'gi_upset')).toEqual(['gi_upset']);
    expect(toggleSideEffectTag(['drowsy'], 'drowsy')).toEqual([]);
  });
});
