import type { RadioOption } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { ThemePreference } from '@/theme';

const labels = strings.settings.themeOptions;

/** Các lựa chọn giao diện hiển thị trong Cài đặt. */
export const THEME_OPTIONS: readonly RadioOption<ThemePreference>[] = [
  { value: 'system', icon: 'phone-portrait-outline', ...labels.system },
  { value: 'light', icon: 'sunny-outline', ...labels.light },
  { value: 'dark', icon: 'moon-outline', ...labels.dark },
];
