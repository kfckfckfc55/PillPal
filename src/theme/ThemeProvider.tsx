import * as SystemUI from 'expo-system-ui';
import type { Theme as NavigationTheme } from 'expo-router';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { radius, spacing, touchTarget, type Radius, type Spacing } from './layout';
import { createNavigationTheme } from './navigationTheme';
import { colorTokens, type ColorSchemeName, type ColorTokens, type ThemePreference } from './tokens';
import { typographyScales, type TypographyScale } from './typography';

export interface ThemeContextValue {
  /** Theme đang hiển thị thực tế (đã tính cả lựa chọn "Theo hệ thống"). */
  scheme: ColorSchemeName;
  /** Lựa chọn của người dùng: Theo hệ thống / Sáng / Tối. */
  preference: ThemePreference;
  /** Chế độ Đang mệt: chữ to, vùng chạm lớn, giao diện tối giản. */
  sickDayMode: boolean;
  colors: ColorTokens;
  typography: TypographyScale;
  spacing: Spacing;
  radius: Radius;
  touch: { min: number; primary: number };
  navigationTheme: NavigationTheme;
  setPreference: (preference: ThemePreference) => void;
  setSickDayMode: (enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Giá trị khởi tạo (bước 1B sẽ đọc từ SQLite trước khi render). */
  initialPreference?: ThemePreference;
  initialSickDayMode?: boolean;
  /** Gọi sau khi người dùng đổi theme — bước 1B dùng để lưu bền vào SQLite. */
  onPreferenceChange?: (preference: ThemePreference) => void;
  onSickDayModeChange?: (enabled: boolean) => void;
}

export function ThemeProvider({
  children,
  initialPreference = 'system',
  initialSickDayMode = false,
  onPreferenceChange,
  onSickDayModeChange,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [sickDayMode, setSickDayModeState] = useState<boolean>(initialSickDayMode);
  const systemScheme = useColorScheme();

  const scheme: ColorSchemeName =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Đồng bộ theme cho thành phần native (hộp thoại, bàn phím, date picker…).
  // 'auto' = bỏ ghi đè, đi theo cài đặt của máy.
  useEffect(() => {
    try {
      Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
    } catch (error) {
      console.warn('[theme] Không thể đặt Appearance.setColorScheme', error);
    }
  }, [preference]);

  // Màu nền gốc theo theme → không nháy trắng khi chuyển màn hình/xoay máy.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colorTokens[scheme].background).catch((error: unknown) => {
      console.warn('[theme] Không thể đặt màu nền hệ thống', error);
    });
  }, [scheme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      onPreferenceChange?.(next);
    },
    [onPreferenceChange],
  );

  const setSickDayMode = useCallback(
    (enabled: boolean) => {
      setSickDayModeState(enabled);
      onSickDayModeChange?.(enabled);
    },
    [onSickDayModeChange],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const colors = colorTokens[scheme];
    return {
      scheme,
      preference,
      sickDayMode,
      colors,
      typography: sickDayMode ? typographyScales.sickDay : typographyScales.normal,
      spacing,
      radius,
      touch: sickDayMode ? touchTarget.sickDay : touchTarget.normal,
      navigationTheme: createNavigationTheme(scheme, colors),
      setPreference,
      setSickDayMode,
    };
  }, [scheme, preference, sickDayMode, setPreference, setSickDayMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
