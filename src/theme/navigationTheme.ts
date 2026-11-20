import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import type { ColorSchemeName, ColorTokens } from './tokens';

/** Tạo theme cho thanh điều hướng (header, tab bar, nền màn hình) từ token navy. */
export function createNavigationTheme(scheme: ColorSchemeName, colors: ColorTokens): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: scheme === 'dark',
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.danger,
    },
  };
}
