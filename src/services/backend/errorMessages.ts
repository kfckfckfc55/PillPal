import { strings } from '@/constants/strings.vi';

import { BackendError } from './familyApi';

/** Lỗi máy chủ → câu tiếng Việt thân thiện (hàm thuần — có unit test). */
export function describeBackendError(error: unknown): string {
  const copy = strings.family.errors;
  if (!(error instanceof BackendError)) return copy.server_error;
  switch (error.code) {
    case 'too_many_requests':
      return copy.too_many_requests(error.retryAfter);
    case 'invalid_code':
      return copy.invalid_code(error.attemptsLeft);
    default:
      return copy[error.code];
  }
}
