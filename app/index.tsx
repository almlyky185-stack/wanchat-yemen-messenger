import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import {
  Button, H1, Input, MessageCircle, Paragraph, ScrollView,
  LogOut, Send, Shield, SizableText, Spinner, XStack, YStack,
} from '@blinkdotnew/mobile-ui';
import { getAuthRedirectUrl, supabase, type WanchatMessage, type WanchatProfile } from '@/lib/supabase';
import { Screen } from '@/components/Screen';
import { ProfileStatusPanel } from '@/components/ProfileStatusPanel';
import { PrivateChatsPanel } from '@/components/PrivateChatsPanel';

WebBrowser.maybeCompleteAuthSession();

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
  chooseMethodBody: ['Create or access your Wanchat account securely with your Google account. Google is the only sign-in method.', 'أنشئ حسابك أو ادخل إلى ون شات بأمان باستخدام حساب Google. تسجيل Google هو الطريقة الوحيدة للدخول.'],
  emailOption: ['Continue with email', 'المتابعة بالبريد الإلكتروني'],
  phoneOption: ['Continue with phone', 'المتابعة برقم الهاتف'],
  googleOption: ['Continue with Google', 'المتابعة باستخدام Google'],
  phone: ['Phone number with country code', 'رقم الهاتف مع رمز الدولة'],
  phoneExample: ['Example: +967 7XX XXX XXX', 'مثال: ‎+967 7XX XXX XXX'],
  sendCode: ['Send verification code', 'إرسال رمز التحقق'],
  codeSent: ['A verification code was sent by SMS.', 'تم إرسال رمز التحقق برسالة نصية.'],
  verificationCode: ['Verification code', 'رمز التحقق'],
  verifyCode: ['Verify and continue', 'تحقق وتابع'],
  changeMethod: ['Choose another method', 'اختر طريقة أخرى'],
  displayName: ['Your name', 'اسمك'],
  continue: ['Continue', 'متابعة'],
  switchToLogin: ['Already have an account? Sign in', 'لديك حساب؟ سجّل الدخول'],
  switchToSignup: ['New to Wanchat? Create an account', 'جديد في ون شات؟ أنشئ حساباً'],
  forgot: ['Forgot password?', 'نسيت كلمة المرور؟'],
  privacyTitle: ['Privacy before you join', 'الخصوصية قبل الانضمام'],
  privacyBody: ['Your account is authenticated through Google. Your profile name, photo and bio, status updates, and messages in the public lounge are visible to anyone, including signed-out visitors. Status updates expire after 24 hours. Do not share private or sensitive information. Wanchat does not request contacts or location in this version. We store account, profile, status, message and consent records to provide the service; account deletion is not available yet.', 'يتم تسجيل الدخول إلى حسابك عبر Google فقط. اسم ملفك الشخصي وصورتك ونبذتك وحالاتك ورسائلك في الساحة العامة مرئية للجميع، بما في ذلك الزوار غير المسجلين. تنتهي الحالات بعد ٢٤ ساعة. لا تشارك معلومات خاصة أو حساسة. لا يطلب ون شات جهات اتصالك أو موقعك في هذا الإصدار. نحتفظ ببيانات الحساب والملف الشخصي والحالات والرسائل والموافقة لتقديم الخدمة؛ حذف الحساب غير متاح حالياً.'],
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
  confirmEmail: ['Check your email to confirm your account, then sign in here.', 'تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول هنا.'],
  accountCreated: ['Your account is ready.', 'تم إنشاء حسابك.'],
  cloudChecking: ['Checking cloud connection…', 'جارٍ التحقق من الاتصال السحابي…'],
  cloudConnected: ['Cloud database connected', 'قاعدة البيانات السحابية متصلة'],
  loading: ['Opening your Wanchat…', 'جارٍ فتح ون شات…'],
} as const;


const ONBOARDING_KEY = 'wanchat-onboarding-v1';
const permissionSteps: readonly { title: string; description: string; permission: string }[] = [];

type Language = 'ar' | 'en' | 'hi' | 'fr' | 'it' | 'zh' | 'ko' | 'fa';
const languages: {code:Language;label:string}[] = [{code:'ar',label:'العربية'},{code:'en',label:'English'},{code:'hi',label:'हिन्दी'},{code:'fr',label:'Français'},{code:'it',label:'Italiano'},{code:'zh',label:'中文'},{code:'ko',label:'한국어'},{code:'fa',label:'فارسی'}];
const extraCopy: Partial<Record<Language, Partial<Record<keyof typeof copy,string>>>> = {
hi:{app:'वॉन्चैट',login:'लॉग इन',signup:'खाता बनाएँ',create:'अपना खाता बनाएँ',welcome:'वापसी पर स्वागत है',email:'ईमेल पता',password:'पासवर्ड',chooseMethod:'जारी रखने का तरीका चुनें',googleOption:'Google से जारी रखें',continue:'जारी रखें',chats:'चैट',privacy:'गोपनीयता',lounge:'सामुदायिक चैट',send:'भेजें',signOut:'लॉग आउट'},
fr:{login:'Connexion',signup:'Créer un compte',create:'Créez votre compte',welcome:'Bon retour',email:'Adresse e-mail',password:'Mot de passe',chooseMethod:'Choisissez comment continuer',googleOption:'Continuer avec Google',continue:'Continuer',chats:'Discussions',privacy:'Confidentialité',lounge:'Salon communautaire',send:'Envoyer',signOut:'Déconnexion'},
it:{login:'Accedi',signup:'Crea account',create:'Crea il tuo account',welcome:'Bentornato',email:'Indirizzo email',password:'Password',chooseMethod:'Scegli come continuare',googleOption:'Continua con Google',continue:'Continua',chats:'Chat',privacy:'Privacy',lounge:'Chat della comunità',send:'Invia',signOut:'Esci'},
zh:{login:'登录',signup:'创建账户',create:'创建您的账户',welcome:'欢迎回来',email:'电子邮箱',password:'密码',chooseMethod:'选择继续方式',googleOption:'使用 Google 继续',continue:'继续',chats:'聊天',privacy:'隐私',lounge:'社区聊天室',send:'发送',signOut:'退出登录'},
ko:{login:'로그인',signup:'계정 만들기',create:'계정 만들기',welcome:'다시 오신 것을 환영합니다',email:'이메일 주소',password:'비밀번호',chooseMethod:'계속할 방법 선택',googleOption:'Google로 계속',continue:'계속',chats:'채팅',privacy:'개인정보 보호',lounge:'커뮤니티 대화방',send:'보내기',signOut:'로그아웃'},
fa:{login:'ورود',signup:'ایجاد حساب',create:'حساب خود را بسازید',welcome:'خوش آمدید',email:'نشانی ایمیل',password:'گذرواژه',chooseMethod:'روش ادامه را انتخاب کنید',googleOption:'ادامه با گوگل',continue:'ادامه',chats:'گفتگوها',privacy:'حریم خصوصی',lounge:'گفتگوی انجمن',send:'ارسال',signOut:'خروج'}
};

export default function Home() {
  const [language, setLanguage] = useState<Language>('ar');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [permissionIntroAccepted, setPermissionIntroAccepted] = useState(false);
  const [permissionIndex, setPermissionIndex] = useState(-1);
  const [policyChecked, setPolicyChecked] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'private' | 'updates' | 'profile' | 'privacy'>('chats');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const rtl = language === 'ar' || language === 'fa';
  const t = (key: keyof typeof copy) => extraCopy[language]?.[key] ?? copy[key][rtl ? 1 : 0];
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

  useEffect(() => {
    let active = true;
    void AsyncStorage.multiGet([ONBOARDING_KEY, 'wanchat-language'])
      .then(([onboardingEntry, languageEntry]) => {
        if (!active) return;
        const previouslyAccepted = onboardingEntry[1] === 'accepted';
        setOnboardingDone(previouslyAccepted);
        setAccepted(previouslyAccepted);
        setPolicyChecked(previouslyAccepted);
        const savedLanguage = languageEntry[1] as Language | null;
        if (savedLanguage && languages.some((item) => item.code === savedLanguage)) {
          setLanguage(savedLanguage);
        }
        setOnboardingReady(true);
      })
      .catch(() => {
        if (active) setOnboardingReady(true);
      });
    return () => { active = false; };
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


  const requestNextPermission = async () => {
    setPermissionIndex(-2);
  };

  const finishOnboarding = async () => {
    if (!policyChecked) { setError('يرجى الموافقة على سياسة الخصوصية للمتابعة.'); return; }
    await AsyncStorage.setItem(ONBOARDING_KEY, 'accepted');
    setOnboardingDone(true);
    setAccepted(true);
    setError('');
  };

  const pulse = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    void AsyncStorage.setItem('wanchat-language', nextLanguage);
    pulse();
  };

  const signInWithGoogle = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('Google sign-in could not be started.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;
      const callback = Linking.parse(result.url);
      const code = typeof callback.queryParams?.code === 'string' ? callback.queryParams.code : '';
      if (!code) throw new Error('Google sign-in did not return an authorization code.');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      pulse();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('errorFallback'));
    } finally { setBusy(false); }
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


  if (!onboardingReady) return (
    <Screen backgroundColor={palette.forest} alignItems="center" justifyContent="center">
      <YStack alignItems="center" gap="$3"><Spinner color={palette.mint} /><Paragraph color={palette.white}>جارٍ تجهيز إعدادات التطبيق…</Paragraph></YStack>
    </Screen>
  );

  if (!onboardingDone) {
    const currentPermission = permissionIndex >= 0 ? permissionSteps[permissionIndex] : null;
    return (
      <Screen backgroundColor={palette.forest}>
        <ScrollView flex={1}>
          <YStack width="100%" maxWidth={480} alignSelf="center" padding="$5" paddingTop="$8" gap="$4">
            <YStack alignItems="center" gap="$2">
              <MessageCircle size={42} color={palette.mint} />
              <H1 color={palette.white} textAlign="center">Wanchat Yemen</H1>
              <Paragraph color={palette.muted} textAlign="center">إعداد التطبيق لأول مرة</Paragraph>
            </YStack>
            {permissionIndex === -1 ? (
              <YStack backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={22} padding="$4" gap="$3">
                <SizableText color={palette.white} fontWeight="800" size="$5">خصوصيتك وأذونات الجهاز</SizableText>
                <Paragraph color={palette.muted} lineHeight={23}>لن يطلب ون شات عند التشغيل أذونات لا يحتاجها الإصدار الحالي. عندما تستخدم ميزة تحتاج الكاميرا أو الصور أو الموقع أو غيرها، سيطلب الإذن المناسب وقتها فقط. يمكنك رفض أي إذن، وسيظل بإمكانك استخدام بقية التطبيق.</Paragraph>
                <Button onPress={() => { setPermissionIndex(-2); setError(''); }} minHeight={52} backgroundColor={palette.mint} color={palette.forestDeep} borderRadius={15}>متابعة إلى سياسة الخصوصية</Button>
              </YStack>
            ) : currentPermission ? (
              <YStack backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={22} padding="$4" gap="$3">
                <SizableText color={palette.mint} fontWeight="700">الإذن {permissionIndex + 1} من {permissionSteps.length}</SizableText>
                <SizableText color={palette.white} fontWeight="800" size="$6">{currentPermission.title}</SizableText>
                <Paragraph color={palette.muted} lineHeight={23}>{currentPermission.description}</Paragraph>
                <Paragraph color={palette.muted} size="$2">ستظهر الآن نافذة أندرويد الرسمية. إذا رفضت الإذن، يمكنك متابعة الإعداد مع تعطيل الميزة المرتبطة به.</Paragraph>
                {!!error && <Paragraph color={palette.danger}>{error}</Paragraph>}
                <Button onPress={() => void requestNextPermission()} minHeight={52} backgroundColor={palette.mint} color={palette.forestDeep} borderRadius={15}>طلب الإذن والمتابعة</Button>
              </YStack>
            ) : (
              <YStack backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={22} padding="$4" gap="$3">
                <SizableText color={palette.white} fontWeight="800" size="$5">سياسة الخصوصية</SizableText>
                <Paragraph color={palette.muted} lineHeight={23}>نستخدم الأذونات لتشغيل الميزات التي تختار استخدامها. لا تُرفع جهات اتصالك إلى قاعدة كاشف الأرقام لمجرد منح إذن الوصول؛ مشاركة جهات الاتصال تحتاج موافقة مستقلة وصريحة. يمكنك رفض المشاركة واستخدام بقية التطبيق.</Paragraph>
                <Button chromeless minHeight={44} onPress={() => setPolicyChecked(!policyChecked)}>
                  <SizableText color={palette.white}> {policyChecked ? '☑' : '☐'} أوافق على سياسة الخصوصية وشروط الاستخدام</SizableText>
                </Button>
                <Button disabled={!policyChecked} onPress={() => void finishOnboarding()} minHeight={52} backgroundColor={palette.mint} color={palette.forestDeep} borderRadius={15}>موافقة ومتابعة</Button>
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </Screen>
    );
  }

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
            <YStack width={56} height={56} borderRadius={18} backgroundColor={palette.mint} alignItems="center" justifyContent="center">
              <MessageCircle size={27} color={palette.forestDeep} />
            </YStack>
            <YStack flex={1} alignItems={rtl ? 'flex-end' : 'flex-start'}>
              <SizableText color={palette.white} size="$8" fontWeight="800">{t('app')}</SizableText>
              <SizableText color={palette.muted} size="$3">{t('tagline')}</SizableText>
            </YStack>
          </XStack>
          <YStack backgroundColor={palette.panel} borderWidth={1} borderColor={palette.border} borderRadius={24} padding="$5" gap="$4">
            <SizableText color={palette.mint} size="$5" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>{rtl ? 'مرحباً بك في ون شات' : 'Welcome to Wanchat'}</SizableText>
            <Paragraph color={palette.muted} textAlign={rtl ? 'right' : 'left'}>{t('chooseMethodBody')}</Paragraph>
            {!!error && <Paragraph color={palette.danger} role="alert">{error}</Paragraph>}
            {!!notice && <Paragraph color={palette.mint}>{notice}</Paragraph>}
            <Button onPress={() => void signInWithGoogle()} disabled={busy} minHeight={58} borderRadius={16} backgroundColor={palette.mint} color={palette.forestDeep} fontWeight="800">
              <XStack alignItems="center" justifyContent="center" gap="$2">
                <SizableText color={palette.forestDeep} size="$5" fontWeight="900">G</SizableText>
                <SizableText color={palette.forestDeep} fontWeight="800">{t('googleOption')}</SizableText>
              </XStack>
            </Button>
            <Paragraph color={palette.muted} size="$2" textAlign="center">{rtl ? 'لن نطلب رقم هاتفك أو رمز SMS لتسجيل الدخول.' : 'No phone number or SMS code is needed to sign in.'}</Paragraph>
          </YStack>
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
          <Button chromeless onPress={() => void signOut()} color={palette.muted} minWidth={48} height={48} accessibilityLabel={t('signOut')}><LogOut size={18} color={palette.muted} /></Button>
        </XStack>
        <XStack marginHorizontal="$3" marginBottom="$3" padding="$1" backgroundColor={palette.panel} borderRadius={15}>
          {(['chats', 'private', 'updates', 'profile', 'privacy'] as const).map((tab) => (
            <Button key={tab} flex={1} minHeight={44} borderRadius={12} paddingHorizontal="$1" onPress={() => { setActiveTab(tab); pulse(); }} backgroundColor={activeTab === tab ? palette.panelLight : 'transparent'} color={activeTab === tab ? palette.mint : palette.muted}>
              {tab === 'chats' ? t('chats') : tab === 'private' ? (rtl ? 'خاص' : 'Private') : tab === 'privacy' ? (rtl ? 'الإعدادات' : 'Settings') : tab === 'updates' ? (rtl ? 'الحالات' : 'Updates') : (rtl ? 'الملف' : 'Profile')}
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
         ) : activeTab === 'private' ? (
          <PrivateChatsPanel userId={user.id} profiles={profileQuery.data ?? []} rtl={rtl} />
        ) : activeTab === 'privacy' ? (
          <ScrollView flex={1}>
            <YStack padding="$4" gap="$3">
              <SizableText color={palette.white} size="$7" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>{rtl ? 'الإعدادات' : 'Settings'}</SizableText>
              <YStack backgroundColor={palette.panel} borderColor={palette.border} borderWidth={1} borderRadius={16} padding="$4" gap="$3">
                <SizableText color={palette.mint} fontWeight="800" size="$5" textAlign={rtl ? 'right' : 'left'}>{rtl ? 'لغة التطبيق' : 'App language'}</SizableText>
                <Paragraph color={palette.muted} textAlign={rtl ? 'right' : 'left'}>{rtl ? 'العربية هي اللغة الأساسية. يمكنك اختيار لغة أخرى اختيارياً.' : 'Arabic is the default language. You can optionally choose another language.'}</Paragraph>
                <XStack flexWrap="wrap" gap="$2" flexDirection={rtl ? 'row-reverse' : 'row'}>
                  {languages.map((item) => <Button key={item.code} size="$2" minHeight={40} paddingHorizontal="$3" borderRadius={10} backgroundColor={language === item.code ? palette.mint : palette.panelLight} color={language === item.code ? palette.forestDeep : palette.white} onPress={() => changeLanguage(item.code)}>{item.label}</Button>)}
                </XStack>
              </YStack>
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
