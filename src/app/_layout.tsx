import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { strings } from '@/constants/strings.vi';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { scheme, colors, typography, navigationTheme } = useTheme();

  return (
    <NavigationThemeProvider value={navigationTheme}>
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
      </Stack>
    </NavigationThemeProvider>
  );
}
