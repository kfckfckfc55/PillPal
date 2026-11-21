import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, type ReactNode } from 'react';

import { ErrorState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import {
  saveSickDayMode,
  saveThemePreference,
  type PersistedAppSettings,
} from '@/db/repositories/settingsRepository';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { ThemeProvider, useTheme, type ThemePreference } from '@/theme';

// Giữ splash cho tới khi mở xong cơ sở dữ liệu và đọc cài đặt theme → không nháy sai màu.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const bootstrap = useAppBootstrap();

  if (bootstrap.status === 'loading') {
    return null;
  }

  if (bootstrap.status === 'error') {
    return (
      <ThemeProvider>
        <HideSplashOnMount />
        <BootstrapError message={bootstrap.message} onRetry={bootstrap.retry} />
      </ThemeProvider>
    );
  }

  return (
    <DatabaseProvider db={bootstrap.db}>
      <PersistedThemeProvider db={bootstrap.db} settings={bootstrap.settings}>
        <RootNavigator />
      </PersistedThemeProvider>
    </DatabaseProvider>
  );
}

/** ThemeProvider khởi tạo từ cài đặt đã lưu và tự lưu lại mỗi khi người dùng đổi. */
function PersistedThemeProvider({
  db,
  settings,
  children,
}: {
  db: SQLiteDatabase;
  settings: PersistedAppSettings;
  children: ReactNode;
}) {
  const handlePreferenceChange = useCallback(
    (preference: ThemePreference) => {
      saveThemePreference(db, preference).catch((error: unknown) => {
        console.warn('[settings] Không lưu được lựa chọn giao diện', error);
      });
    },
    [db],
  );

  const handleSickDayChange = useCallback(
    (enabled: boolean) => {
      saveSickDayMode(db, enabled).catch((error: unknown) => {
        console.warn('[settings] Không lưu được chế độ Đang mệt', error);
      });
    },
    [db],
  );

  return (
    <ThemeProvider
      initialPreference={settings.themePreference}
      initialSickDayMode={settings.sickDayMode}
      onPreferenceChange={handlePreferenceChange}
      onSickDayModeChange={handleSickDayChange}
    >
      {children}
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { scheme, colors, typography, navigationTheme } = useTheme();

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <HideSplashOnMount />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: typography.subtitle.fontSize,
            fontWeight: typography.subtitle.fontWeight,
          },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="design-preview" options={{ title: strings.designPreview.screenTitle }} />
        <Stack.Screen name="dev-data" options={{ title: strings.devData.screenTitle }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

function BootstrapError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Screen centered safeBottom>
        <ErrorState
          title={strings.bootstrap.errorTitle}
          message={strings.bootstrap.errorMessage(message)}
          onRetry={onRetry}
        />
      </Screen>
    </>
  );
}

function HideSplashOnMount() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return null;
}
