import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import {
  Button, H1, MessageCircle, Paragraph, ScrollView,
  LogOut, Send, SizableText, Spinner, XStack, YStack,
} from '@blinkdotnew/mobile-ui';
import { getAuthRedirectUrl, supabase, type WanchatMessage, type WanchatProfile } from '@/lib/supabase';
import { Screen } from '@/components/Screen';
import { ProfileStatusPanel } from '@/components/ProfileStatusPanel';

const ROOM_ID = 'community-lounge';
const ROOM_CHANNEL = 'wanchat-community-lounge';
const POLICY_VERSION = 'privacy-v2-2026-11';
const palette = {
  forest: '#10251D', forestDeep: '#0B1914', panel: '#172F25', panelLight: '#203B30',
  mint: '#86E2B3', white: '#F6FAF7', muted: '#A5B8AD', border: '#2C493A',
  outgoing: '#24583F', danger: '#F2A6A0',
};

const copy = {
  app: ['Wanchat', 'ون شات'],
  tagline: ['A little closer, wherever you are.', 'أقرب إليك، أينما كنت.'],
  login: ['Sign in', 'تسجيل الدخول'],
  signup: ['Create account', 'إنشاء حساب'],
  create: ['Create your account', 'أنشئ حسابك'],
  welcome: ['Welcome back', 'مرحباً بعودتك'],
  email: ['Email address', 'البريد الإلكتروني'],
  password: ['Password', 'كلمة المرور'],
  chooseMethod: ['Choose how to continue', 'اختر طريقة المتابعة'],
  chooseMethodBody: ['Sign in or create your Wanchat account using your email address and password.', 'سجّل الدخول أو أنشئ حساب ون شات باستخدام بريدك الإلكتروني وكلمة المرور.'], 
  emailOption: ['Continue with email', 'المتابعة بالبريد الإلكتروني'],








  displayName: ['Your name', 'اسمك'],
  continue: ['Continue', 'متابعة'],
  switchToLogin: ['Already have an account? Sign in', 'لديك حساب؟ سجّل الدخول'],
  switchToSignup: ['New to Wanchat? Create an account', 'جديد في ون شات؟ أنشئ حساباً'],
  forgot: ['Forgot password?', 'نسيت كلمة المرور؟'],
  privacyTitle: ['Privacy before you join', 'الخصوصية قبل الانضمام'],
  privacyBody: ['Your account uses the email address and password you choose. Your profile name, photo and bio, status updates, and messages in the public lounge are visible to anyone, including signed-out visitors. Status updates expire after 24 hours. Do not share private or sensitive information. Wanchat does not request contacts or location in this version. We store account, profile, status, message and consent records to provide the service; account deletion is not available yet.', 'يستخدم حسابك البريد الإلكتروني وكلمة المرور التي تختارها. اسم ملفك الشخصي وصورتك ونبذتك وحالاتك ورسائلك في الساحة العامة مرئية للجميع، بما في ذلك الزوار غير المسجلين. تنتهي الحالات بعد ٢٤ ساعة. لا تشارك معلومات خاصة أو حساسة. لا يطلب ون شات جهات اتصالك أو موقعك في هذا الإصدار. نحتفظ ببيانات الحساب والملف الشخصي والحالات والرسائل والموافقة لتقديم الخدمة؛ حذف الحساب غير متاح حالياً.'],
  accept: ['I have read and accept the privacy notice', 'قرأت إشعار الخصوصية وأوافق عليه'],
  consentRequired: ['Accept the privacy notice before creating an account.', 'يرجى الموافقة على إشعار الخصوصية قبل إنشاء الحساب.'],
  chats: ['Community', 'المجتمع'],
  privacy: ['Privacy', 'الخصوصية'],
  lounge: ['Community lounge', 'ساحة المجتمع'],
  publicRoom: ['PUBLIC ROOM', 'ساحة عامة'],
  publicWarning: ['This room is public. Messages are not end-to-end encrypted.', 'هذه الساحة عامة. الرسائل غير مشفّرة من طرف إلى طرف.'],
  onlineRoom: ['A shared room for the Wanchat community', 'مساحة مشتركة لمجتمع ون شات'],
  startChat: ['Start the conversation', 'ابدأ المحادثة'],
  emptyBody: ['Send a thoughtful hello to the community. Keep personal details private.', 'أرسل تحية لطيفة للمجتمع، وتجنب مشاركة بياناتك الشخصية.'],
  messagePlaceholder: ['Write a message…', 'اكتب رسالة…'],
  send: ['Send', 'إرسال'],
  privacyStatus: ['Your privacy at a glance', 'ملخص إعدادات الخصوصية'],
  locationOff: ['Location sharing is off', 'مشاركة الموقع متوقفة'],
  noContacts: ['Contacts are not accessed', 'لا يتم الوصول إلى جهات الاتصال'],
  noMesh: ['Offline mesh is not active', 'الشبكة دون اتصال غير مفعّلة'],
  publicData: ['Community messages are public and stored by the service. Private messaging and end-to-end encryption are not part of this release.', 'رسائل المجتمع عامة وتحفظها الخدمة. لا تتوفر المحادثات الخاصة والتشفير من طرف إلى طرف في هذا الإصدار.'],
  backToChats: ['Back to community', 'العودة إلى المجتمع'],
  signedIn: ['Signed in', 'تم تسجيل الدخول'],
  signOut: ['Sign out', 'تسجيل الخروج'],
  connection: ['Live text room', 'محادثة نصية مباشرة'],
  errorFallback: ['Something went wrong. Please try again.', 'حدث خطأ. حاول مرة أخرى.'],
  resetSent: ['If that email has an account, a password reset link has been sent.', 'إذا كان البريد مرتبطاً بحساب، فسيتم إرسال رابط إعادة تعيين كلمة المرور.'],
  confirmEmail: ['Email confirmation is still enabled in Supabase. Turn off Confirm email in the Supabase Email provider settings, then try again.', 'ما زال تأكيد البريد مفعّلاً في Supabase. عطّل خيار Confirm email من إعدادات مزوّد البريد ثم أعد المحاولة.'], 
  accountCreated: ['Your account is ready.', 'تم إنشاء حسابك.'],
  cloudChecking: ['Checking cloud connection…', 'جارٍ التحقق من الاتصال السحابي…'],
  cloudConnected: ['Cloud database connected', 'قاعدة البيانات السحابية متصلة'],
  loading: ['Opening your Wanchat…', 'جارٍ فتح ون شات…'],
} as const;

type Language = 'en' | 'ar';

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'updates' | 'profile' | 'privacy'>('chats');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const rtl = language === 'ar';
  const t = (key: keyof typeof copy) => copy[key][rtl ? 1 : 0];
  const connectionQuery = useQuery({
    queryKey: ['supabase-connection-check'],
    queryFn: async () => {
      const { error: connectionError } = await supabase.from('wanchat_messages').select('id').limit(1);
      if (connectionError) throw connectionError;
      return true;
    },
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const messageQuery = useQuery({
    queryKey: ['wanchat-messages', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('wanchat_messages').select('*').eq('room_id', ROOM_ID).order('created_at', { ascending: true }).limit(100);
      if (error) throw error;
      return data as WanchatMessage[];
    },
    enabled: !!user,
  });
  const profileQuery = useQuery({
    queryKey: ['wanchat-profiles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('wanchat_profiles').select('*').limit(200);
      if (error) throw error;
      return data as WanchatProfile[];
    },
    enabled: !!user,
  });
  useEffect(() => {
    if (!user || profileQuery.isLoading || profileQuery.isError || profileQuery.data?.some((profile) => profile.user_id === user.id)) return;
    const metadataName = user.user_metadata?.display_name;
    const name = (typeof metadataName === 'string' ? metadataName.trim() : '') || user.email?.split('@')[0] || 'Wanchat member';
    void supabase.from('wanchat_profiles').upsert({ user_id: user.id, display_name: name, language, bio: null, avatar_url: null }, { onConflict: 'user_id' })
      .then(({ error: saveError }) => {
        if (saveError) setError(saveError.message);
        else void queryClient.invalidateQueries({ queryKey: ['wanchat-profiles', user.id] });
      });
  }, [user?.id, profileQuery.data, profileQuery.isLoading, profileQuery.isError, language, queryClient]);
  useEffect(() => {
    if (!user) return;
    const metadata = user.user_metadata ?? {};
    const policyVersion = metadata.privacy_policy_version;
    const acceptedAt = metadata.privacy_accepted_at;
    const consentLanguage = metadata.privacy_language;
    if (typeof policyVersion !== 'string' || typeof acceptedAt !== 'string' || typeof consentLanguage !== 'string') return;
    void supabase.from('wanchat_consents').upsert({
      user_id: user.id, policy_version: policyVersion, accepted_at: acceptedAt, language: consentLanguage,
    }, { onConflict: 'user_id,policy_version' }).then(({ error: saveError }) => {
      if (saveError) setError(saveError.message);
    });
  }, [user?.id]);
  const names = useMemo(() => new Map((profileQuery.data ?? []).map((profile) => [profile.user_id, profile.display_name])), [profileQuery.data]);
  const ownProfile = profileQuery.data?.find((profile) => profile.user_id === user?.id);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(ROOM_CHANNEL).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'wanchat_messages', filter: `room_id=eq.${ROOM_ID}`,
    }, () => {
      void queryClient.invalidateQueries({ queryKey: ['wanchat-messages', user.id] });
    }).subscribe((status, subscriptionError) => {
      if (status === 'CHANNEL_ERROR' && subscriptionError) setError(subscriptionError.message);
    });
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const pulse = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();  };

  const signInWithGoogle = async () => {
    setError('');
    setNotice('');
    if (!accepted) {
      setError(rtl ? 'يرجى قراءة إشعار الخصوصية والموافقة عليه أولاً.' : 'Please accept the privacy notice before continuing.');
      return;
    }

    setBusy(true);
    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
          queryParams: { prompt: 'select_account' },
        },
      });
      if (oauthError) throw oauthError;

      if (Platform.OS === 'web') {
        if (data.url) window.location.assign(data.url);
        return;
      }

      if (!data.url) throw new Error('Google sign-in URL was not created.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        if (result.type === 'cancel' || result.type === 'dismiss') return;
        throw new Error('Google sign-in was not completed.');
      }

      const callbackUrl = new URL(result.url);
      const callbackError = callbackUrl.searchParams.get('error_description') || callbackUrl.searchParams.get('error');
      if (callbackError) throw new Error(callbackError);
      const code = callbackUrl.searchParams.get('code');
      if (!code) throw new Error('The sign-in response did not contain an authorization code.');

      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;

      const acceptedAt = new Date().toISOString();
      const { data: updatedUser, error: metadataError } = await supabase.auth.updateUser({
        data: {
          privacy_policy_version: POLICY_VERSION,
          privacy_accepted_at: acceptedAt,
          privacy_language: language,
        },
      });
      if (metadataError) throw metadataError;

      const signedInUserId = updatedUser.user?.id ?? sessionData.user?.id;
      if (signedInUserId) {
        const { error: consentError } = await supabase.from('wanchat_consents').upsert({
          user_id: signedInUserId,
          policy_version: POLICY_VERSION,
          accepted_at: acceptedAt,
          language,
        }, { onConflict: 'user_id,policy_version' });
        if (consentError) setError(consentError.message);
      }
      pulse();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('errorFallback'));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  };

  const sendMessage = async () => {
    const body = message.trim();
    if (!user || !body || busy) return;
    setBusy(true); setError('');
    try {
      const { error: insertError } = await supabase.from('wanchat_messages').insert({ user_id: user.id, room_id: ROOM_ID, body });
      if (insertError) throw insertError;
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['wanchat-messages', user.id] });
      pulse();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('errorFallback')); }
    finally { setBusy(false); }
  };

  if (authLoading) return (
    <Screen backgroundColor={palette.forest} alignItems="center" justifyContent="center">
      <YStack alignItems="center" gap="$4"><Spinner color={palette.mint} /><Paragraph color={palette.white}>{t('loading')}</Paragraph></YStack>
    </Screen>
  );

  if (!user) return (
    <Screen backgroundColor={palette.forest}>
      <ScrollView flex={1}>
        <YStack width="100%" maxWidth={480} alignSelf="center" padding="$5" paddingTop="$8" gap="$5">
          <XStack alignItems="center" gap="$3" flexDirection={rtl ? 'row-reverse' : 'row'}>
            <YStack width={52} height={52} borderRadius={18} backgroundColor={palette.mint} alignItems="center" justifyContent="center">
              <MessageCircle size={25} color={palette.forestDeep} />
            </YStack>
            <YStack flex={1} alignItems={rtl ? 'flex-end' : 'flex-start'}>
              <SizableText color={palette.white} size="$8" fontWeight="800">{t('app')}</SizableText>
              <SizableText color={palette.muted} size="$3">{t('tagline')}</SizableText>
            </YStack>
            <Button chromeless onPress={() => { setLanguage(rtl ? 'en' : 'ar'); pulse(); }} color={palette.mint} minWidth={48} height={48} accessibilityLabel="Change language">{rtl ? 'EN' : 'عربي'}</Button>
          </XStack>

          <YStack backgroundColor={palette.panel} borderWidth={1} borderColor={palette.border} borderRadius={24} padding="$5" gap="$4">
            <YStack alignItems={rtl ? 'flex-end' : 'flex-start'} gap="$2">
              <SizableText color={palette.mint} size="$3" fontWeight="700">{rtl ? 'تسجيل آمن وسريع' : 'Secure and simple sign-in'}</SizableText>
              <H1 color={palette.white} fontSize={30} lineHeight={36} textAlign={rtl ? 'right' : 'left'}>{t('app')}</H1>
              <Paragraph color={palette.muted} textAlign={rtl ? 'right' : 'left'}>{rtl ? 'اختر حساب Google لإنشاء حسابك أو الدخول إلى حسابك الحالي.' : 'Choose a Google account to create your account or sign in.'}</Paragraph>
            </YStack>

            <YStack backgroundColor={palette.forestDeep} borderColor={palette.border} borderWidth={1} borderRadius={16} padding="$4" gap="$3">
              <XStack alignItems="center" gap="$2" flexDirection={rtl ? 'row-reverse' : 'row'}>
                <SizableText color={palette.mint} fontWeight="700" size="$4">{rtl ? 'الخصوصية قبل المتابعة' : 'Privacy before you continue'}</SizableText>
              </XStack>
              <Paragraph color={palette.muted} lineHeight={21} textAlign={rtl ? 'right' : 'left'}>
                {rtl
                  ? 'اسمك وصورتك ونبذتك ورسائلك في ساحة المجتمع العامة قد تكون مرئية للآخرين. لا تشارك معلومات خاصة أو حساسة. لا يطلب ون شات جهات اتصالك أو موقعك في هذا الإصدار.'
                  : 'Your name, photo, bio and messages in the public community room may be visible to others. Do not share private or sensitive information. Wanchat does not access your contacts or location in this release.'}
              </Paragraph>
              <Button chromeless minHeight={48} onPress={() => { setAccepted(!accepted); pulse(); }}>
                <SizableText color={palette.white} textAlign={rtl ? 'right' : 'left'}>
                  {accepted ? '☑' : '☐'} {rtl ? 'قرأت إشعار الخصوصية وأوافق عليه' : 'I have read and accept the privacy notice'}
                </SizableText>
              </Button>
            </YStack>

            {!!error && <Paragraph color={palette.danger} role="alert">{error}</Paragraph>}
            {!!notice && <Paragraph color={palette.mint}>{notice}</Paragraph>}
            <Button onPress={() => void signInWithGoogle()} disabled={busy} minHeight={56} borderRadius={16} backgroundColor={palette.mint} color={palette.forestDeep} fontWeight="800" pressStyle={{ opacity: 0.82, scale: 0.98 }}>
              {busy ? <Spinner color={palette.forestDeep} /> : (rtl ? 'المتابعة باستخدام Google' : 'Continue with Google')}
            </Button>
          </YStack>

          <SizableText color={palette.muted} size="$2" textAlign="center">{POLICY_VERSION}</SizableText>
          <SizableText color={connectionQuery.isError ? palette.danger : palette.mint} size="$2" textAlign="center">
            {connectionQuery.isLoading ? t('cloudChecking') : connectionQuery.isError ? connectionQuery.error.message : t('cloudConnected')}
          </SizableText>
        </YStack>
      </ScrollView>
    </Screen>
  );

  return (
    <Screen backgroundColor={palette.forestDeep}>
      <YStack width="100%" maxWidth={520} alignSelf="center" flex={1}>
        <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" gap="$3" flexDirection={rtl ? 'row-reverse' : 'row'}>
          <YStack width={44} height={44} borderRadius={15} backgroundColor={palette.mint} alignItems="center" justifyContent="center"><MessageCircle size={22} color={palette.forestDeep} /></YStack>
          <YStack flex={1} alignItems={rtl ? 'flex-end' : 'flex-start'} gap="$1">
            <SizableText color={palette.white} size="$6" fontWeight="800">{t('app')}</SizableText>
            <SizableText color={palette.muted} size="$2">{ownProfile?.display_name || (typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : user.email ?? '')}</SizableText>
          </YStack>
          <Button chromeless onPress={() => { setLanguage(rtl ? 'en' : 'ar'); pulse(); }} color={palette.mint} minWidth={48} height={48}>{rtl ? 'EN' : 'عربي'}</Button>
          <Button chromeless onPress={() => void signOut()} color={palette.muted} minWidth={48} height={48} accessibilityLabel={t('signOut')}><LogOut size={18} color={palette.muted} /></Button>
        </XStack>
        <XStack marginHorizontal="$3" marginBottom="$3" padding="$1" backgroundColor={palette.panel} borderRadius={15}>
          {(['chats', 'updates', 'profile', 'privacy'] as const).map((tab) => (
            <Button key={tab} flex={1} minHeight={44} borderRadius={12} paddingHorizontal="$1" onPress={() => { setActiveTab(tab); pulse(); }} backgroundColor={activeTab === tab ? palette.panelLight : 'transparent'} color={activeTab === tab ? palette.mint : palette.muted}>
              {tab === 'chats' ? t('chats') : tab === 'privacy' ? t('privacy') : tab === 'updates' ? (rtl ? 'الحالات' : 'Updates') : (rtl ? 'الملف' : 'Profile')}
            </Button>
          ))}
        </XStack>
        {activeTab === 'chats' ? (
          <YStack flex={1} paddingHorizontal="$4" paddingBottom="$3" gap="$3">
            <YStack backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={19} padding="$4" gap="$2">
              <XStack alignItems="center" gap="$2" flexDirection={rtl ? 'row-reverse' : 'row'}>
                <MessageCircle size={19} color={palette.mint} />
                <SizableText color={palette.white} fontWeight="700" size="$5" flex={1} textAlign={rtl ? 'right' : 'left'}>{t('lounge')}</SizableText>
                <SizableText color={palette.mint} size="$2" fontWeight="800">{t('publicRoom')}</SizableText>
              </XStack>
              <SizableText color={palette.muted} textAlign={rtl ? 'right' : 'left'}>{t('onlineRoom')}</SizableText>
              <SizableText color={palette.mint} size="$2" textAlign={rtl ? 'right' : 'left'}>{t('publicWarning')}</SizableText>
            </YStack>
            {messageQuery.isError && <Paragraph color={palette.danger}>{messageQuery.error.message}</Paragraph>}
            <ScrollView flex={1} showsVerticalScrollIndicator={false}>
              <YStack gap="$3" paddingVertical="$2">
                {!messageQuery.data?.length && !messageQuery.isLoading && (
                  <YStack flex={1} minHeight={240} alignItems="center" justifyContent="center" gap="$3" padding="$5">
                    <YStack width={76} height={76} borderRadius={28} backgroundColor={palette.panelLight} alignItems="center" justifyContent="center"><MessageCircle size={35} color={palette.mint} /></YStack>
                    <SizableText color={palette.white} size="$6" fontWeight="700" textAlign="center">{t('startChat')}</SizableText>
                    <Paragraph color={palette.muted} textAlign="center">{t('emptyBody')}</Paragraph>
                  </YStack>
                )}
                {messageQuery.data?.map((item) => {
                  const own = item.user_id === user.id;
                  return <YStack key={item.id} alignSelf={own ? (rtl ? 'flex-start' : 'flex-end') : (rtl ? 'flex-end' : 'flex-start')} maxWidth="88%" backgroundColor={own ? palette.outgoing : palette.panel} borderColor={palette.border} borderWidth={own ? 0 : 1} borderRadius={17} paddingHorizontal="$4" paddingVertical="$3" gap="$1">
                    <SizableText color={palette.mint} size="$2" fontWeight="700">{own ? (rtl ? 'أنت' : 'You') : (names.get(item.user_id) ?? (rtl ? 'عضو في ون شات' : 'Wanchat member'))}</SizableText>
                    <SizableText color={palette.white} size="$4" textAlign={rtl ? 'right' : 'left'}>{item.body}</SizableText>
                    <SizableText color={palette.muted} size="$1" alignSelf={rtl ? 'flex-start' : 'flex-end'}>{new Date(item.created_at).toLocaleTimeString(rtl ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}</SizableText>
                  </YStack>;
                })}
              </YStack>
            </ScrollView>
            {!!error && <Paragraph color={palette.danger}>{error}</Paragraph>}
            <XStack gap="$2" alignItems="center" flexDirection={rtl ? 'row-reverse' : 'row'} backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={18} padding="$2">
              <Input flex={1} value={message} onChangeText={setMessage} maxLength={2000} placeholder={t('messagePlaceholder')} placeholderTextColor={palette.muted} color={palette.white} backgroundColor="transparent" borderWidth={0} minHeight={44} onSubmitEditing={() => void sendMessage()} returnKeyType="send" accessibilityLabel={t('messagePlaceholder')} />
              <Button onPress={() => void sendMessage()} disabled={!message.trim() || busy} width={48} height={48} borderRadius={15} backgroundColor={palette.mint} color={palette.forestDeep} accessibilityLabel={t('send')} pressStyle={{ opacity: 0.82, scale: 0.96 }}><Send size={19} color={palette.forestDeep} /></Button>
            </XStack>
          </YStack>
        ) : activeTab === 'privacy' ? (
          <ScrollView flex={1}>
            <YStack padding="$4" gap="$3">
              <SizableText color={palette.white} size="$7" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>{t('privacyStatus')}</SizableText>
              {[
                [t('locationOff'), t('noContacts'), t('noMesh')],
              ][0].map((line) => <XStack key={line} alignItems="center" gap="$3" backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={16} padding="$4" flexDirection={rtl ? 'row-reverse' : 'row'}>
                <Shield size={18} color={palette.mint} /><SizableText color={palette.white} flex={1} textAlign={rtl ? 'right' : 'left'}>{line}</SizableText>
              </XStack>)}
              <YStack backgroundColor={palette.panelLight} borderRadius={16} padding="$4" gap="$2"><SizableText color={palette.mint} fontWeight="700">{t('publicWarning')}</SizableText><Paragraph color={palette.white} textAlign={rtl ? 'right' : 'left'}>{t('publicData')}</Paragraph></YStack>
              <Button onPress={() => setActiveTab('chats')} minHeight={48} backgroundColor={palette.mint} color={palette.forestDeep} borderRadius={15}>{t('backToChats')}</Button>
              <SizableText color={palette.muted} size="$2" textAlign="center">{t('signedIn')} · {POLICY_VERSION}</SizableText>
            </YStack>
          </ScrollView>
        ) : (
          <ProfileStatusPanel
            mode={activeTab}
            userId={user.id}
            email={user.email ?? ''}
            language={language}
            profile={ownProfile}
            profiles={profileQuery.data ?? []}
            onProfileSaved={() => queryClient.invalidateQueries({ queryKey: ['wanchat-profiles', user.id] })}
          />
        )}
      </YStack>
    </Screen>
  );
}