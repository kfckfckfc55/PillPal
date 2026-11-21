import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type IconName } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { layout, navigationTypography, useTheme } from '@/theme';

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  iconFocused: IconName;
}

const TABS: readonly TabConfig[] = [
  { name: 'index', title: strings.tabs.today, icon: 'today-outline', iconFocused: 'today' },
  {
    name: 'journeys',
    title: strings.tabs.journeys,
    icon: 'folder-open-outline',
    iconFocused: 'folder-open',
  },
  {
    name: 'appointments',
    title: strings.tabs.appointments,
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  { name: 'health', title: strings.tabs.health, icon: 'pulse-outline', iconFocused: 'pulse' },
  {
    name: 'settings',
    title: strings.tabs.settings,
    icon: 'settings-outline',
    iconFocused: 'settings',
  },
];

export default function TabsLayout() {
  const { colors, spacing, typography, sickDayMode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // Chế độ Đang mệt: ẩn thanh tab, chỉ còn màn hình tối giản (tắt bằng nút lớn trên màn hình).
        tabBarStyle: sickDayMode
          ? { display: 'none' }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: layout.tabBarHeight + insets.bottom,
              paddingTop: spacing.xs,
            },
        tabBarLabelStyle: navigationTypography.tabLabel,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontSize: typography.subtitle.fontSize,
          fontWeight: typography.subtitle.fontWeight,
        },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            // Màu icon khớp tabBarActiveTintColor / tabBarInactiveTintColor ở trên.
            tabBarIcon: ({ focused, size }) => (
              <AppIcon
                name={focused ? tab.iconFocused : tab.icon}
                color={focused ? 'primary' : 'textSecondary'}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
