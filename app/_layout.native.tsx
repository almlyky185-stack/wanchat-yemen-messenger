import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BlinkProvider,
  BlinkToastProvider,
  createTamagui,
  tamaguiDefaultConfig,
  Theme,
} from '@blinkdotnew/mobile-ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const config = createTamagui({ ...tamaguiDefaultConfig });

export default function NativeRootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <BlinkProvider config={config} defaultTheme="dark">
        <Theme name="dark">
          <QueryClientProvider client={queryClient}>
            <BlinkToastProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="light" />
            </BlinkToastProvider>
          </QueryClientProvider>
        </Theme>
      </BlinkProvider>
    </SafeAreaProvider>
  );
}
