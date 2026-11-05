import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Input, Paragraph, SizableText, Spinner, YStack } from '@blinkdotnew/mobile-ui';
import { Screen } from '@/components/Screen';
import { supabase } from '@/lib/supabase';

const colors = { forest: '#0B1914', panel: '#172F25', mint: '#86E2B3', white: '#F6FAF7', muted: '#A5B8AD', border: '#2C493A', danger: '#F2A6A0' };
const text = {
  title: ['Secure account link', 'رابط آمن للحساب'],
  checking: ['Verifying your link…', 'جارٍ التحقق من الرابط…'],
  verified: ['Your email is confirmed. You can return to Wanchat.', 'تم تأكيد بريدك الإلكتروني. يمكنك العودة إلى ون شات.'],
  recovery: ['Choose a new password', 'اختر كلمة مرور جديدة'],
  password: ['New password', 'كلمة المرور الجديدة'],
  save: ['Update password', 'تحديث كلمة المرور'],
  done: ['Password updated. You can sign in now.', 'تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.'],
  back: ['Continue to Wanchat', 'المتابعة إلى ون شات'],
  invalid: ['This link is missing or expired. Request a new email and try again.', 'الرابط غير مكتمل أو منتهي الصلاحية. اطلب رسالة جديدة وحاول مرة أخرى.'],
  error: ['Something went wrong. Request a new link and try again.', 'حدث خطأ. اطلب رابطاً جديداً وحاول مرة أخرى.'],
} as const;

type Language = 'en' | 'ar';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string | string[]; type?: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const [language] = useState<Language>('en');
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(type === 'recovery');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const started = useRef(false);
  const rtl = language === 'ar';
  const t = (key: keyof typeof text) => text[key][rtl ? 1 : 0];

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!code) {
      setError(text.invalid[0]);
      setReady(true);
      return;
    }
    if (started.current) return;
    started.current = true;
    void supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) setError(exchangeError.message);
      else if (type === 'recovery') setRecovery(true);
      else setNotice(t('verified'));
      setReady(true);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : t('error'));
      setReady(true);
    });
  }, [code, type]);

  const updatePassword = async () => {
    setBusy(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice(t('done'));
      setRecovery(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('error'));
    } finally { setBusy(false); }
  };

  return (
    <Screen backgroundColor={colors.forest} alignItems="center" justifyContent="center" padding="$5">
      <YStack width="100%" maxWidth={440} backgroundColor={colors.panel} borderWidth={1} borderColor={colors.border} borderRadius={22} padding="$5" gap="$4">
        <SizableText color={colors.white} size="$7" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>{t('title')}</SizableText>
        {!ready && <YStack alignItems="center" gap="$3" padding="$4"><Spinner color={colors.mint} /><Paragraph color={colors.muted}>{t('checking')}</Paragraph></YStack>}
        {ready && recovery && (
          <YStack gap="$3">
            <Paragraph color={colors.muted}>{t('recovery')}</Paragraph>
            <Input value={password} onChangeText={setPassword} placeholder={t('password')} placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" color={colors.white} backgroundColor={colors.forest} borderColor={colors.border} minHeight={52} />
            <Button onPress={() => void updatePassword()} disabled={busy || password.length < 6} minHeight={50} backgroundColor={colors.mint} color={colors.forest} borderRadius={15} fontWeight="800">{busy ? <Spinner color={colors.forest} /> : t('save')}</Button>
          </YStack>
        )}
        {!!notice && <Paragraph color={colors.mint}>{notice}</Paragraph>}
        {!!error && <Paragraph color={colors.danger}>{error}</Paragraph>}
        {ready && !recovery && <Button onPress={() => router.replace('/')} minHeight={48} backgroundColor={colors.mint} color={colors.forest} borderRadius={15} fontWeight="800">{t('back')}</Button>}
      </YStack>
    </Screen>
  );
}
