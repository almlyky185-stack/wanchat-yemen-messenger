import { supabase } from '@/lib/supabase';

export type PrivateMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system';
  body: string | null;
  media_path: string | null;
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type Conversation = {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  created_by: string;
  created_at: string;
};

const db = supabase as any;

export async function createDirectConversation(otherUserId: string): Promise<string> {
  const { data, error } = await db.rpc('wanchat_create_direct_conversation', { p_other_user: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function createGroupConversation(title: string, memberIds: string[]): Promise<string> {
  const { data, error } = await db.rpc('wanchat_create_group', { p_title: title, p_member_ids: memberIds });
  if (error) throw error;
  return data as string;
}

export async function listMyConversations(): Promise<Conversation[]> {
  const { data: memberRows, error: memberError } = await db
    .from('wanchat_conversation_members')
    .select('conversation_id')
    .order('joined_at', { ascending: false });
  if (memberError) throw memberError;
  const ids = (memberRows ?? []).map((row: { conversation_id: string }) => row.conversation_id);
  if (!ids.length) return [];
  const { data, error } = await db.from('wanchat_conversations').select('*').in('id', ids).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function listPrivateMessages(conversationId: string, limit = 60): Promise<PrivateMessage[]> {
  const { data, error } = await db.from('wanchat_private_messages')
    .select('*').eq('conversation_id', conversationId)
    .is('deleted_at', null).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as PrivateMessage[]).reverse();
}

export async function sendPrivateMessage(input: {
  conversationId: string;
  senderId: string;
  body?: string;
  type?: PrivateMessage['message_type'];
  mediaPath?: string;
  replyTo?: string;
}): Promise<PrivateMessage> {
  const { data, error } = await db.from('wanchat_private_messages').insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    message_type: input.type ?? 'text',
    body: input.body ?? null,
    media_path: input.mediaPath ?? null,
    reply_to: input.replyTo ?? null,
  }).select('*').single();
  if (error) throw error;
  return data as PrivateMessage;
}

export function subscribeToPrivateMessages(conversationId: string, onMessage: (message: PrivateMessage) => void) {
  return supabase.channel(`private-chat-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'wanchat_private_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => onMessage(payload.new as PrivateMessage))
    .subscribe();
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await db.from('wanchat_conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).eq('user_id', userId);
  if (error) throw error;
}

export async function setPresence(userId: string, online: boolean): Promise<void> {
  const { error } = await db.from('wanchat_presence').upsert({
    user_id: userId, is_online: online, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function shareLiveLocation(userId: string, latitude: number, longitude: number, minutes = 30): Promise<void> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid location coordinates');
  }
  const { error } = await db.from('wanchat_live_locations').upsert({
    user_id: userId, latitude, longitude,
    sharing_until: new Date(Date.now() + minutes * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function stopSharingLiveLocation(userId: string): Promise<void> {
  const { error } = await db.from('wanchat_live_locations').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function startCall(conversationId: string, callerId: string, callType: 'audio' | 'video') {
  const { data, error } = await db.from('wanchat_call_sessions').insert({
    conversation_id: conversationId, caller_id: callerId, call_type: callType, status: 'ringing',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function sendCallSignal(input: {
  callId: string;
  senderId: string;
  recipientId: string;
  type: 'offer' | 'answer' | 'ice' | 'hangup' | 'reject';
  payload: Record<string, unknown>;
}) {
  const { error } = await db.from('wanchat_call_signals').insert({
    call_id: input.callId, sender_id: input.senderId, recipient_id: input.recipientId,
    signal_type: input.type, payload: input.payload,
  });
  if (error) throw error;
}

export function subscribeToCallSignals(userId: string, callId: string, onSignal: (signal: any) => void) {
  return supabase.channel(`call-signals-${callId}-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'wanchat_call_signals',
      filter: `call_id=eq.${callId}`,
    }, (payload) => {
      const signal = payload.new as any;
      if (signal.recipient_id === userId) onSignal(signal);
    }).subscribe();
}
