import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';

/** Lấy theme hiện tại (màu, chữ, khoảng cách, Sick-Day Mode). */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme() phải được dùng bên trong <ThemeProvider>.');
  }
  return context;
}
