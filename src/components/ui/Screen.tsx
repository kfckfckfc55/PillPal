import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, useTheme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Mặc định cuộn được. Tắt khi màn hình tự quản lý danh sách (FlatList…). */
  scrollable?: boolean;
  /** Thêm khoảng đệm đáy theo safe area — dùng cho màn hình không có tab bar. */
  safeBottom?: boolean;
  /** Căn giữa nội dung theo chiều dọc (cho trạng thái trống/lỗi/đang tải). */
  centered?: boolean;
  /** Chiều rộng tối đa vùng nội dung (mặc định vừa để đọc; tablet 2 cột dùng `layout.wideContentMaxWidth`). */
  maxWidth?: number;
  /** Kéo xuống để làm mới. */
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Khung màn hình chuẩn: nền theo theme, padding đều, giới hạn chiều rộng trên tablet. */
export function Screen({
  children,
  scrollable = true,
  safeBottom = false,
  centered = false,
  maxWidth = layout.contentMaxWidth,
  refreshing = false,
  onRefresh,
  contentStyle,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const innerStyle: ViewStyle = {
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl + (safeBottom ? insets.bottom : 0),
    gap: spacing.lg,
    flexGrow: 1,
    justifyContent: centered ? 'center' : 'flex-start',
  };

  if (!scrollable) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[innerStyle, { flex: 1 }, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[innerStyle, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
