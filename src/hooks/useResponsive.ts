import { useWindowDimensions } from 'react-native';

import { layout } from '@/theme';

export interface ResponsiveInfo {
  width: number;
  height: number;
  /** Màn hình rộng ≥ 768 (tablet, hoặc điện thoại xoay ngang) → bố cục 2 cột. */
  isWide: boolean;
  isLandscape: boolean;
}

/** Thông tin kích thước màn hình, tự cập nhật khi xoay máy. */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isWide: width >= layout.tabletBreakpoint,
    isLandscape: width > height,
  };
}
