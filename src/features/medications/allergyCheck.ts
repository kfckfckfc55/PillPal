import type { Allergy } from '@/types/models';

/**
 * Đối chiếu tên thuốc / hoạt chất với dị ứng người dùng đã ghi (hàm thuần — có unit test).
 * Chỉ so khớp chữ để NHẮC NHỞ; không kết luận dị ứng chéo hay tương tác thuốc.
 */

/** Chữ thường, bỏ dấu tiếng Việt, chỉ giữ chữ & số. */
export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Từ đủ dài để so khớp (bỏ từ ngắn như "mg", "dị", "ứng" để tránh báo nhầm). */
const MIN_TOKEN_LENGTH = 4;

function tokens(value: string): string[] {
  return normalizeForMatch(value)
    .split(' ')
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

/** Các dị ứng có từ khóa xuất hiện trong tên thuốc hoặc hoạt chất. */
export function findAllergyMatches(
  medicationTexts: readonly (string | null | undefined)[],
  allergies: readonly Allergy[],
): Allergy[] {
  const haystackTokens = new Set(medicationTexts.flatMap((text) => (text ? tokens(text) : [])));
  if (haystackTokens.size === 0) return [];
  const haystack = [...haystackTokens].join(' ');

  return allergies.filter((allergy) => {
    if (allergy.deletedAt !== null) return false;
    return tokens(allergy.substance).some(
      (token) => haystackTokens.has(token) || haystack.includes(token),
    );
  });
}
