import { Component, useState } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MobileUi = typeof import('@blinkdotnew/mobile-ui');
type LoadedApp = {
  Home: ComponentType;
  ui: MobileUi;
  config: ReturnType<MobileUi['createTamagui']>;
};

type BoundaryProps = { children: ReactNode; onRetry: () => void };
type BoundaryState = { error: string | null };

class NativeRenderBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    if (error instanceof Error) {
      return { error: `${error.name}: ${error.message}\n${error.stack ?? ''}` };
    }
    return { error: String(error) };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.error) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Wanchat Yemen</Text>
          <Text style={styles.errorTitle}>The original screen failed to render</Text>
          <ScrollView style={styles.errorBox}>
            <Text selectable style={styles.errorText}>{this.state.error}</Text>
          </ScrollView>
          <NativeButton label="Retry original screen" onPress={this.props.onRetry} />
        </View>
      );
    }
    return this.props.children;
  }
}

function NativeButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export default function NativeStartup() {
  const insets = useSafeAreaInsets();
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [app, setApp] = useState<LoadedApp | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const openOriginalApp = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { default: Home } = require('./index.tsx') as { default: ComponentType };
      const ui = await import('@blinkdotnew/mobile-ui');
      const config = ui.createTamagui({ ...ui.tamaguiDefaultConfig });
      setApp({ Home, ui, config });
    } catch (error) {
      setLoadError(error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error));
    } finally {
      setLoading(false);
    }
  };

  if (app) {
    const Home = app.Home;
    const { BlinkProvider, Theme, BlinkToastProvider } = app.ui;
    return (
      <BlinkProvider config={app.config} defaultTheme="dark">
        <Theme name="dark">
          <BlinkToastProvider>
            <NativeRenderBoundary key={retryKey} onRetry={() => setRetryKey((value) => value + 1)}>
              <Home />
            </NativeRenderBoundary>
          </BlinkToastProvider>
        </Theme>
      </BlinkProvider>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <Text style={styles.kicker}>NATIVE STARTUP CHECK</Text>
        <Text style={styles.title}>Wanchat Yemen Messenger</Text>
        <Text style={styles.description}>
          This screen uses only native React Native components. It does not wait for Supabase or an internet connection.
        </Text>
        <NativeButton label="Run native test" onPress={() => { setPassed(true); setLoadError(''); }} />
        {passed && <Text accessibilityRole="text" style={styles.success}>Native screen and button are working.</Text>}
        {!!loadError && (
          <ScrollView style={styles.errorBox}>
            <Text selectable style={styles.errorText}>{loadError}</Text>
          </ScrollView>
        )}
        {passed && (
          <NativeButton label={loading ? 'Opening Wanchat…' : 'Continue to Wanchat'} disabled={loading} onPress={() => void openOriginalApp()} />
        )}
        {loading && <ActivityIndicator color="#86E2B3" size="large" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#10251D',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2C493A',
    backgroundColor: '#172F25',
    gap: 16,
  },
  kicker: { color: '#86E2B3', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#F6FAF7', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  description: { color: '#A5B8AD', fontSize: 16, lineHeight: 23 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#86E2B3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { color: '#0B1914', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  success: { color: '#86E2B3', fontSize: 15, fontWeight: '600' },
  errorTitle: { color: '#F2A6A0', fontSize: 17, fontWeight: '700' },
  errorBox: { maxHeight: 260, padding: 12, backgroundColor: '#0B1914', borderRadius: 12 },
  errorText: { color: '#F6FAF7', fontSize: 12, lineHeight: 18 },
});
