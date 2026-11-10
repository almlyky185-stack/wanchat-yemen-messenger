import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Paragraph, ScrollView, SizableText, Spinner, XStack, YStack } from '@blinkdotnew/mobile-ui';
import type { WanchatProfile } from '@/lib/supabase';
import { createDirectConversation, listMyConversations, listPrivateMessages, markConversationRead, sendPrivateMessage, subscribeToPrivateMessages, type Conversation, type PrivateMessage } from '@/lib/private-chat';
import { supabase } from '@/lib/supabase';

const colors = { panel: '#172F25', panelLight: '#203B30', mint: '#86E2B3', white: '#F6FAF7', muted: '#A5B8AD', border: '#2C493A', outgoing: '#24583F', danger: '#F2A6A0' };

export function PrivateChatsPanel({ userId, profiles, rtl = true }: { userId: string; profiles: WanchatProfile[]; rtl?: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const rows = await listMyConversations();
      setConversations(rows);
      const ids = rows.map((row) => row.id);
      if (ids.length) {
        const { data, error: memberError } = await (supabase as any).from('wanchat_conversation_members')
          .select('conversation_id,user_id').in('conversation_id', ids);
        if (memberError) throw memberError;
        const map: Record<string, string> = {};
        for (const row of data ?? []) if (row.user_id !== userId) map[row.conversation_id] = row.user_id;
        setMembers(map);
      } else setMembers({});
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل المحادثات'); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const openConversation = useCallback(async (id: string) => {
    setActiveConversation(id); setError('');
    try {
      const rows = await listPrivateMessages(id);
      setMessages(rows);
      await markConversationRead(id, userId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل الرسائل'); }
  }, [userId]);

  useEffect(() => {
    if (!activeConversation) return;
    const channel = subscribeToPrivateMessages(activeConversation, (message) => {
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      if (message.sender_id !== userId) void markConversationRead(activeConversation, userId);
    });
    return () => { void supabase.removeChannel(channel); };
  }, [activeConversation, userId]);

  const startChat = async (otherUserId: string) => {
    setBusy(true); setError('');
    try {
      const id = await createDirectConversation(otherUserId);
      await refresh();
      await openConversation(id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر بدء المحادثة'); }
    finally { setBusy(false); }
  };

  const send = async () => {
    if (!activeConversation || !draft.trim()) return;
    setBusy(true); setError('');
    try {
      const sent = await sendPrivateMessage({ conversationId: activeConversation, senderId: userId, body: draft.trim() });
      setMessages((current) => current.some((item) => item.id === sent.id) ? current : [...current, sent]);
      setDraft('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إرسال الرسالة'); }
    finally { setBusy(false); }
  };

  const activePeer = activeConversation ? members[activeConversation] : null;
  const activeName = activePeer ? profiles.find((p) => p.user_id === activePeer)?.display_name ?? 'مستخدم ون شات' : 'المحادثة';

  return (
    <YStack flex={1} padding="$4" gap="$3">
      {activeConversation ? (
        <>
          <XStack alignItems="center" gap="$2" flexDirection={rtl ? 'row-reverse' : 'row'}>
            <Button chromeless onPress={() => setActiveConversation(null)} color={colors.mint}>رجوع</Button>
            <SizableText color={colors.white} size="$5" fontWeight="800" flex={1} textAlign={rtl ? 'right' : 'left'}>{activeName}</SizableText>
          </XStack>
          <ScrollView flex={1}>
            <YStack gap="$2" paddingVertical="$2">
              {messages.map((item) => <YStack key={item.id} alignSelf={item.sender_id === userId ? (rtl ? 'flex-start' : 'flex-end') : (rtl ? 'flex-end' : 'flex-start')} maxWidth="88%" backgroundColor={item.sender_id === userId ? colors.outgoing : colors.panel} borderColor={colors.border} borderWidth={1} borderRadius={15} padding="$3">
                <SizableText color={colors.white}>{item.body ?? (item.message_type === 'text' ? '' : 'مرفق')}</SizableText>
                <SizableText color={colors.muted} size="$1">{new Date(item.created_at).toLocaleTimeString(rtl ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}</SizableText>
              </YStack>)}
              {!messages.length && <Paragraph color={colors.muted} textAlign="center">ابدأ أول محادثة خاصة.</Paragraph>}
            </YStack>
          </ScrollView>
          <XStack gap="$2" alignItems="center">
            <Input flex={1} value={draft} onChangeText={setDraft} placeholder="اكتب رسالة خاصة…" color={colors.white} backgroundColor={colors.panel} borderColor={colors.border} onSubmitEditing={() => void send()} />
            <Button onPress={() => void send()} disabled={!draft.trim() || busy} backgroundColor={colors.mint} color="#10251D">{busy ? <Spinner /> : 'إرسال'}</Button>
          </XStack>
        </>
      ) : (
        <>
          <SizableText color={colors.white} size="$6" fontWeight="800" textAlign={rtl ? 'right' : 'left'}>المحادثات الخاصة</SizableText>
          <SizableText color={colors.muted} textAlign={rtl ? 'right' : 'left'}>اختر شخصاً لبدء محادثة خاصة.</SizableText>
          {loading ? <Spinner color={colors.mint} /> : conversations.map((conversation) => {
            const peerId = members[conversation.id];
            const peer = profiles.find((p) => p.user_id === peerId);
            return <Button key={conversation.id} onPress={() => void openConversation(conversation.id)} justifyContent={rtl ? 'flex-end' : 'flex-start'} backgroundColor={colors.panel} color={colors.white} borderColor={colors.border} borderWidth={1} minHeight={52}>{peer?.display_name ?? conversation.title ?? 'محادثة خاصة'}</Button>;
          })}
          <SizableText color={colors.mint} fontWeight="700" textAlign={rtl ? 'right' : 'left'}>ابدأ محادثة جديدة</SizableText>
          <ScrollView flex={1}>
            <YStack gap="$2">
              {profiles.filter((profile) => profile.user_id !== userId).map((profile) => <Button key={profile.user_id} onPress={() => void startChat(profile.user_id)} disabled={busy} backgroundColor={colors.panelLight} color={colors.white} justifyContent={rtl ? 'flex-end' : 'flex-start'}>{profile.display_name}</Button>)}
            </YStack>
          </ScrollView>
        </>
      )}
      {!!error && <Paragraph color={colors.danger}>{error}</Paragraph>}
    </YStack>
  );
}
