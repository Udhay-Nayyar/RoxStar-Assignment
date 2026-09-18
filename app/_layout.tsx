import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';

import { Palette } from '@/constants/theme';

const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Palette.accent,
    background: Palette.background,
    surface: Palette.surface,
    surfaceVariant: Palette.elevated,
    onSurface: Palette.text,
    onSurfaceVariant: Palette.muted,
    outline: Palette.border,
    error: Palette.danger,
    success: Palette.success,
  }
};
import { useAuthStore } from '@/stores/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    if (!initialized) return;
    const firstSegment = String(segments[0] ?? '');
    const inAuth = firstSegment === 'login' || firstSegment === 'register';
    if (user && inAuth) {
      router.replace('/(tabs)');
      return;
    }

    if (!user && !inAuth) {
      router.replace('/login');
    }
  }, [initialized, router, segments, user]);

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Palette.background, card: Palette.background, text: Palette.text, primary: Palette.accent } }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="recording" options={{ headerShown: false }} />
          <Stack.Screen name="effects" options={{ headerShown: false }} />
          <Stack.Screen name="room" options={{ headerShown: false }} />
          <Stack.Screen name="spin" options={{ headerShown: false }} />
          <Stack.Screen name="winner" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </PaperProvider>
  );
}
