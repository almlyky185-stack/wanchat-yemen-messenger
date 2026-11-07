import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Paragraph, ScrollView, SizableText, Spinner, XStack, YStack } from '@blinkdotnew/mobile-ui';
import { MEDIA_BUCKET, supabase, type WanchatProfile, type WanchatStatus } from '@/lib/supabase';
import { uploadImage } from '@/lib/media-upload';

const colors = {
  panel: '#172F25', panelLight: '#203B30', mint: '#86E2B3', white: '#F6FAF7',
  muted: '#A5B8AD', border: '#2C493A', danger: '#F2A6A0', forest: '#0B1914',
};
const STATUS_CHANNEL = 'wanchat-user-statuses';

type Language = 'en' | 'ar' | 'hi' | 'fr' | 'it' | 'zh' | 'ko' | 'fa';
type PanelMode = 'profile' | 'updates';
type Props = {
  mode: PanelMode;
  userId: string;
  email: string;
  language: Language;
  profile?: WanchatProfile;
  profiles: WanchatProfile[];
  onProfileSaved: () => Promise<void>;
};

const words = {
  profile: ['Your profile', 'ملفك الشخصي'],
  updates: ['Status updates', 'الحالات'],
  yourName: ['Display name', 'الاسم الظاهر'],
  bio: ['A little about you', 'نبذة عنك'],
  bioHint: ['Write a short introduction…', 'اكتب نبذة قصيرة عنك…'],
  photo: ['Choose profile photo', 'اختر صورة للملف الشخصي'],
  photoHelp: ['Your photo is public. Wanchat asks for photo access only when you choose one.', 'صورتك ظاهرة للعموم. لن يطلب ون شات الوصول إلى الصور إلا عند اختيارك صورة.'],
  save: ['Save profile', 'حفظ الملف الشخصي'],
  saved: ['Profile saved', 'تم حفظ الملف الشخصي'],
  writeStatus: ['Share a status update', 'شارك حالة'],
  statusHint: ['What would you like people to know?', 'ماذا تود أن يعرفه الآخرون؟'],
  post: ['Post for 24 hours', 'انشر لمدة ٢٤ ساعة'],
  publicStatus: ['Statuses and profile details are public.', 'الحالات وبيانات الملف الشخصي عامة.'],
  addStatusPhoto: ['Add a photo', 'أضف صورة'],
  removePhoto: ['Remove photo', 'إزالة الصورة'],
  empty: ['No active updates yet', 'لا توجد حالات حالية'],
  expired: ['Status updates disappear after 24 hours.', 'تختفي الحالات بعد ٢٤ ساعة.'],
  permissionDenied: ['Photo access was not granted. You can allow it in Android settings or continue without a photo.', 'لم يتم السماح بالوصول إلى الصور. يمكنك السماح من إعدادات أندرويد أو المتابعة دون صورة.'],
  genericError: ['Something went wrong. Please try again.', 'حدث خطأ. حاول مرة أخرى.'],
  imageError: ['Could not upload that photo. Please choose another image.', 'تعذر رفع الصورة. يرجى اختيار صورة أخرى.'],
  loading: ['Loading updates…', 'جارٍ تحميل الحالات…'],
} as const;

export function ProfileStatusPanel({ mode, userId, email, language, profile, profiles, onProfileSaved }: Props) {
  const rtl = language === 'ar';
  const t = (key: keyof typeof words) => words[key][rtl ? 1 : 0];
  const [name, setName] = useState(profile?.display_name ?? email.split('@')[0]);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [statusText, setStatusText] = useState('');
  const [statusPhoto, setStatusPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const queryClient = useQueryClient();
  useEffect(() => {
    setName(profile?.display_name ?? email.split('@')[0]);
    setBio(profile?.bio ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
  }, [profile?.display_name, profile?.bio, profile?.avatar_url, email]);

  const updatesQuery = useQuery({
    queryKey: ['wanchat-statuses'],
    queryFn: async () => {
      const { data, error: loadError } = await supabase.from('wanchat_statuses').select('*')
        .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(100);
      if (loadError) throw loadError;
      return data as WanchatStatus[];
    },
    enabled: mode === 'updates',
  });
  const nameByUser = useMemo(() => new Map(profiles.map((item) => [item.user_id, item.display_name])), [profiles]);
  const photoByUser = useMemo(() => new Map(profiles.map((item) => [item.user_id, item.avatar_url])), [profiles]);

  useEffect(() => {
    if (mode !== 'updates') return;
    const channel = supabase.channel(STATUS_CHANNEL).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'wanchat_statuses',
    }, () => {
      void queryClient.invalidateQueries({ queryKey: ['wanchat-statuses'] });
    }).subscribe((status, subscriptionError) => {
      if (status === 'CHANNEL_ERROR' && subscriptionError) setError(subscriptionError.message);
    });
    return () => { void supabase.removeChannel(channel); };
  }, [mode, queryClient]);

  const choosePhoto = async () => {
    setError(''); setNotice('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError(t('permissionDenied')); return; }
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (selection.canceled || !selection.assets[0]) return;
      const asset = selection.assets[0];
      setBusy(true);
      const { publicUrl } = await uploadImage(userId, asset, 'avatars');
      setAvatarUrl(publicUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('imageError'));
    } finally { setBusy(false); }
  };

  const saveProfile = async () => {
    if (!name.trim()) { setError(t('genericError')); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: saveError } = await supabase.from('wanchat_profiles').upsert({
        user_id: userId, display_name: name.trim(), bio: bio.trim() || null,
        avatar_url: avatarUrl || null, language,
      }, { onConflict: 'user_id' });
      if (saveError) throw saveError;
      await onProfileSaved();
      setNotice(t('saved'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('genericError')); }
    finally { setBusy(false); }
  };

  const chooseStatusPhoto = async () => {
    setError(''); setNotice('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError(t('permissionDenied')); return; }
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!selection.canceled && selection.assets[0]) setStatusPhoto(selection.assets[0]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('imageError'));
    }
  };

  const postStatus = async () => {
    const body = statusText.trim();
    if ((!body && !statusPhoto) || body.length > 500) return;
    setBusy(true); setError(''); setNotice('');
    let uploadedPath: string | undefined;
    try {
      let mediaUrl: string | null = null;
      if (statusPhoto) {
        const uploaded = await uploadImage(userId, statusPhoto, 'statuses');
        mediaUrl = uploaded.publicUrl;
        uploadedPath = uploaded.path;
      }
      const { error: insertError } = await supabase.from('wanchat_statuses').insert({ user_id: userId, body, media_url: mediaUrl });
      if (insertError) throw insertError;
      setStatusText('');
      setStatusPhoto(null);
      await queryClient.invalidateQueries({ queryKey: ['wanchat-statuses'] });
    } catch (reason) {
      if (uploadedPath) await supabase.storage.from(MEDIA_BUCKET).remove([uploadedPath]);
      setError(reason instanceof Error ? reason.message : t('genericError'));
    }
    finally { setBusy(false); }
  };

  return mode === 'profile' ? (
    <ScrollView flex={1}>
      <YStack padding="$4" gap="$4">
        <SizableText color={colors.white} size="$7" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>{t('profile')}</SizableText>
        <YStack alignItems="center" gap="$3" backgroundColor={colors.panel} borderWidth={1} borderColor={colors.border} borderRadius={20} padding="$5">
          {avatarUrl ? <Image source={{ uri: avatarUrl }} contentFit="cover" style={{ width: 104, height: 104, borderRadius: 52 }} /> : (
            <YStack width={104} height={104} borderRadius={52} backgroundColor={colors.panelLight} alignItems="center" justifyContent="center">
              <SizableText color={colors.mint} size="$8" fontWeight="800">{name.trim().slice(0, 1).toUpperCase() || 'W'}</SizableText>
            </YStack>
          )}
          <Button onPress={() => void choosePhoto()} disabled={busy} minHeight={48} borderRadius={14} backgroundColor={colors.panelLight} color={colors.mint}>{t('photo')}</Button>
          <Paragraph color={colors.muted} textAlign="center">{t('photoHelp')}</Paragraph>
        </YStack>
        <YStack gap="$2">
          <SizableText color={colors.white} fontWeight="700" textAlign={rtl ? 'right' : 'left'}>{t('yourName')}</SizableText>
          <Input value={name} onChangeText={setName} maxLength={60} color={colors.white} backgroundColor={colors.panel} borderColor={colors.border} borderRadius={14} minHeight={50} />
        </YStack>
        <YStack gap="$2">
          <SizableText color={colors.white} fontWeight="700" textAlign={rtl ? 'right' : 'left'}>{t('bio')}</SizableText>
          <Input value={bio} onChangeText={setBio} placeholder={t('bioHint')} placeholderTextColor={colors.muted} maxLength={160} multiline numberOfLines={4} color={colors.white} backgroundColor={colors.panel} borderColor={colors.border} borderRadius={14} minHeight={100} textAlignVertical="top" />
        </YStack>
        {!!error && <Paragraph color={colors.danger}>{error}</Paragraph>}
        {!!notice && <Paragraph color={colors.mint}>{notice}</Paragraph>}
        <Button onPress={() => void saveProfile()} disabled={busy} minHeight={52} borderRadius={16} backgroundColor={colors.mint} color={colors.forest} fontWeight="800">{busy ? <Spinner color={colors.forest} /> : t('save')}</Button>
        <Paragraph color={colors.muted} textAlign="center">{t('publicStatus')}</Paragraph>
      </YStack>
    </ScrollView>
  ) : (
    <ScrollView flex={1}>
      <YStack padding="$4" gap="$4">
        <SizableText color={colors.white} size="$7" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>{t('updates')}</SizableText>
        <YStack backgroundColor={colors.panel} borderWidth={1} borderColor={colors.border} borderRadius={20} padding="$4" gap="$3">
          <Input value={statusText} onChangeText={setStatusText} placeholder={t('statusHint')} placeholderTextColor={colors.muted} maxLength={500} multiline numberOfLines={3} color={colors.white} backgroundColor={colors.forest} borderColor={colors.border} borderRadius={14} minHeight={86} textAlignVertical="top" />
          {statusPhoto && <YStack gap="$2">
            <Image source={{ uri: statusPhoto.uri }} contentFit="cover" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} />
            <Button chromeless onPress={() => setStatusPhoto(null)} minHeight={44} color={colors.danger}>{t('removePhoto')}</Button>
          </YStack>}
          <XStack justifyContent="space-between" alignItems="center" flexDirection={rtl ? 'row-reverse' : 'row'}>
            <XStack gap="$2" alignItems="center" flexDirection={rtl ? 'row-reverse' : 'row'}>
              <Button onPress={() => void chooseStatusPhoto()} disabled={busy} minHeight={48} borderRadius={14} backgroundColor={colors.panelLight} color={colors.mint}>{t('addStatusPhoto')}</Button>
              <SizableText color={colors.muted} size="$2">{t('expired')}</SizableText>
            </XStack>
            <Button onPress={() => void postStatus()} disabled={(!statusText.trim() && !statusPhoto) || busy} minHeight={48} borderRadius={14} backgroundColor={colors.mint} color={colors.forest} fontWeight="700">{busy ? <Spinner color={colors.forest} /> : t('post')}</Button>
          </XStack>
        </YStack>
        <Paragraph color={colors.muted} textAlign={rtl ? 'right' : 'left'}>{t('publicStatus')}</Paragraph>
        {!!error && <Paragraph color={colors.danger}>{error}</Paragraph>}
        {updatesQuery.isLoading && <XStack justifyContent="center" padding="$5"><Spinner color={colors.mint} /><SizableText color={colors.muted}>{t('loading')}</SizableText></XStack>}
        {updatesQuery.isError && <Paragraph color={colors.danger}>{updatesQuery.error.message}</Paragraph>}
        {!updatesQuery.isLoading && !updatesQuery.isError && !updatesQuery.data?.length && <YStack backgroundColor={colors.panel} borderRadius={18} padding="$5" alignItems="center" gap="$2"><SizableText color={colors.white} fontWeight="700">{t('empty')}</SizableText><Paragraph color={colors.muted}>{t('expired')}</Paragraph></YStack>}
        {updatesQuery.data?.map((item) => {
          const photo = photoByUser.get(item.user_id);
          return <YStack key={item.id} backgroundColor={colors.panel} borderWidth={1} borderColor={colors.border} borderRadius={18} padding="$4" gap="$3">
            <XStack alignItems="center" gap="$3" flexDirection={rtl ? 'row-reverse' : 'row'}>
              {photo ? <Image source={{ uri: photo }} contentFit="cover" style={{ width: 42, height: 42, borderRadius: 21 }} /> : <YStack width={42} height={42} borderRadius={21} backgroundColor={colors.panelLight} alignItems="center" justifyContent="center"><SizableText color={colors.mint} fontWeight="800">{(nameByUser.get(item.user_id) ?? 'W').slice(0, 1).toUpperCase()}</SizableText></YStack>}
              <YStack flex={1} alignItems={rtl ? 'flex-end' : 'flex-start'}>
                <SizableText color={colors.white} fontWeight="700">{item.user_id === userId ? name : nameByUser.get(item.user_id) ?? (rtl ? 'عضو في ون شات' : 'Wanchat member')}</SizableText>
                <SizableText color={colors.muted} size="$2">{new Date(item.created_at).toLocaleString(rtl ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}</SizableText>
              </YStack>
            </XStack>
            {item.media_url && <Image source={{ uri: item.media_url }} contentFit="cover" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} />}
            {!!item.body && <SizableText color={colors.white} size="$4" textAlign={rtl ? 'right' : 'left'}>{item.body}</SizableText>}
          </YStack>;
        })}
      </YStack>
    </ScrollView>
  );
}
