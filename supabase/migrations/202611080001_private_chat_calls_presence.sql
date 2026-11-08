-- Wanchat private messaging and call signaling extensions.
-- Applied to Supabase project ipjsykwxqfaujsreacjj.
create schema if not exists private;
create table if not exists public.wanchat_conversations (
 id uuid primary key default gen_random_uuid(),
 kind text not null default 'direct' check (kind in ('direct','group')),
 title text,
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.wanchat_conversation_members (
 conversation_id uuid not null references public.wanchat_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check (role in ('owner','admin','member')),
 joined_at timestamptz not null default now(),
 last_read_at timestamptz,
 primary key (conversation_id,user_id)
);
create or replace function private.is_conversation_member(p_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.wanchat_conversation_members m where m.conversation_id=p_id and m.user_id=(select auth.uid())); $$;
revoke all on function private.is_conversation_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;
create table if not exists public.wanchat_private_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.wanchat_conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 message_type text not null default 'text' check(message_type in ('text','image','video','audio','file','location','system')),
 body text, media_path text,
 reply_to uuid references public.wanchat_private_messages(id) on delete set null,
 created_at timestamptz not null default now(), edited_at timestamptz, deleted_at timestamptz,
 check(body is null or char_length(body)<=10000)
);
create table if not exists public.wanchat_user_blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table if not exists public.wanchat_call_sessions (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.wanchat_conversations(id) on delete cascade,
 caller_id uuid not null references auth.users(id) on delete cascade,
 call_type text not null check(call_type in ('audio','video')),
 status text not null default 'ringing' check(status in ('ringing','accepted','rejected','missed','ended','failed')),
 started_at timestamptz not null default now(), answered_at timestamptz, ended_at timestamptz
);
create table if not exists public.wanchat_call_signals (
 id uuid primary key default gen_random_uuid(),
 call_id uuid not null references public.wanchat_call_sessions(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 signal_type text not null check(signal_type in ('offer','answer','ice','hangup','reject')),
 payload jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.wanchat_presence (
 user_id uuid primary key references auth.users(id) on delete cascade,
 is_online boolean not null default false, last_seen_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.wanchat_live_locations (
 user_id uuid primary key references auth.users(id) on delete cascade,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 sharing_until timestamptz not null, updated_at timestamptz not null default now()
);
create table if not exists public.wanchat_push_tokens (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 expo_push_token text not null unique,
 platform text not null check(platform in ('android','ios')),
 updated_at timestamptz not null default now()
);
create index if not exists wanchat_members_user_idx on public.wanchat_conversation_members(user_id,conversation_id);
create index if not exists wanchat_private_messages_time_idx on public.wanchat_private_messages(conversation_id,created_at desc);
create index if not exists wanchat_call_signals_recipient_idx on public.wanchat_call_signals(recipient_id,created_at desc);
create index if not exists wanchat_locations_expiry_idx on public.wanchat_live_locations(sharing_until);
alter table public.wanchat_conversations enable row level security;
alter table public.wanchat_conversation_members enable row level security;
alter table public.wanchat_private_messages enable row level security;
alter table public.wanchat_user_blocks enable row level security;
alter table public.wanchat_call_sessions enable row level security;
alter table public.wanchat_call_signals enable row level security;
alter table public.wanchat_presence enable row level security;
alter table public.wanchat_live_locations enable row level security;
alter table public.wanchat_push_tokens enable row level security;
drop policy if exists wanchat_conversation_member_read on public.wanchat_conversations;
create policy wanchat_conversation_member_read on public.wanchat_conversations for select to authenticated using(private.is_conversation_member(id));
drop policy if exists wanchat_members_read on public.wanchat_conversation_members;
create policy wanchat_members_read on public.wanchat_conversation_members for select to authenticated using(private.is_conversation_member(conversation_id));
drop policy if exists wanchat_private_message_read on public.wanchat_private_messages;
create policy wanchat_private_message_read on public.wanchat_private_messages for select to authenticated using(private.is_conversation_member(conversation_id));
drop policy if exists wanchat_private_message_insert on public.wanchat_private_messages;
create policy wanchat_private_message_insert on public.wanchat_private_messages for insert to authenticated with check(sender_id=(select auth.uid()) and private.is_conversation_member(conversation_id));
drop policy if exists wanchat_private_message_update on public.wanchat_private_messages;
create policy wanchat_private_message_update on public.wanchat_private_messages for update to authenticated using(sender_id=(select auth.uid()) and private.is_conversation_member(conversation_id)) with check(sender_id=(select auth.uid()) and private.is_conversation_member(conversation_id));
drop policy if exists wanchat_blocks_own on public.wanchat_user_blocks;
create policy wanchat_blocks_own on public.wanchat_user_blocks for all to authenticated using(blocker_id=(select auth.uid())) with check(blocker_id=(select auth.uid()));
drop policy if exists wanchat_calls_read on public.wanchat_call_sessions;
create policy wanchat_calls_read on public.wanchat_call_sessions for select to authenticated using(private.is_conversation_member(conversation_id));
drop policy if exists wanchat_calls_insert on public.wanchat_call_sessions;
create policy wanchat_calls_insert on public.wanchat_call_sessions for insert to authenticated with check(caller_id=(select auth.uid()) and private.is_conversation_member(conversation_id));
drop policy if exists wanchat_calls_update on public.wanchat_call_sessions;
create policy wanchat_calls_update on public.wanchat_call_sessions for update to authenticated using(private.is_conversation_member(conversation_id)) with check(private.is_conversation_member(conversation_id));
drop policy if exists wanchat_call_signals_read on public.wanchat_call_signals;
create policy wanchat_call_signals_read on public.wanchat_call_signals for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
drop policy if exists wanchat_call_signals_insert on public.wanchat_call_signals;
create policy wanchat_call_signals_insert on public.wanchat_call_signals for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.wanchat_call_sessions c where c.id=call_id and private.is_conversation_member(c.conversation_id) and (c.caller_id=sender_id or recipient_id in(select m.user_id from public.wanchat_conversation_members m where m.conversation_id=c.conversation_id))));
drop policy if exists wanchat_presence_read on public.wanchat_presence;
create policy wanchat_presence_read on public.wanchat_presence for select to authenticated using(true);
drop policy if exists wanchat_presence_own on public.wanchat_presence;
create policy wanchat_presence_own on public.wanchat_presence for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists wanchat_locations_visible on public.wanchat_live_locations;
create policy wanchat_locations_visible on public.wanchat_live_locations for select to authenticated using(sharing_until>now() and user_id<>(select auth.uid()));
drop policy if exists wanchat_locations_own on public.wanchat_live_locations;
create policy wanchat_locations_own on public.wanchat_live_locations for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists wanchat_push_tokens_own on public.wanchat_push_tokens;
create policy wanchat_push_tokens_own on public.wanchat_push_tokens for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select on public.wanchat_conversations,public.wanchat_conversation_members,public.wanchat_private_messages,public.wanchat_call_sessions,public.wanchat_call_signals,public.wanchat_presence,public.wanchat_live_locations to authenticated;
grant insert,update on public.wanchat_private_messages,public.wanchat_call_sessions,public.wanchat_call_signals,public.wanchat_presence,public.wanchat_live_locations to authenticated;
grant select,insert,update,delete on public.wanchat_user_blocks,public.wanchat_push_tokens to authenticated;
create or replace function public.wanchat_create_direct_conversation(p_other_user uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_me uuid:=auth.uid(); v_conversation uuid;
begin
 if v_me is null then raise exception 'Authentication required'; end if;
 if p_other_user is null or p_other_user=v_me then raise exception 'Choose another user'; end if;
 if not exists(select 1 from auth.users u where u.id=p_other_user) then raise exception 'User not found'; end if;
 if exists(select 1 from public.wanchat_user_blocks b where (b.blocker_id=v_me and b.blocked_id=p_other_user) or (b.blocker_id=p_other_user and b.blocked_id=v_me)) then raise exception 'This conversation is unavailable'; end if;
 select c.id into v_conversation from public.wanchat_conversations c
 where c.kind='direct'
 and exists(select 1 from public.wanchat_conversation_members m where m.conversation_id=c.id and m.user_id=v_me)
 and exists(select 1 from public.wanchat_conversation_members m where m.conversation_id=c.id and m.user_id=p_other_user)
 and (select count(*) from public.wanchat_conversation_members m where m.conversation_id=c.id)=2 limit 1;
 if v_conversation is not null then return v_conversation; end if;
 insert into public.wanchat_conversations(kind,created_by) values('direct',v_me) returning id into v_conversation;
 insert into public.wanchat_conversation_members(conversation_id,user_id,role) values(v_conversation,v_me,'owner'),(v_conversation,p_other_user,'member');
 return v_conversation;
end; $$;
create or replace function public.wanchat_create_group(p_title text,p_member_ids uuid[])
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_me uuid:=auth.uid(); v_conversation uuid; v_member uuid;
begin
 if v_me is null then raise exception 'Authentication required'; end if;
 if p_title is null or length(trim(p_title))<2 or length(p_title)>80 then raise exception 'Group name must be 2 to 80 characters'; end if;
 if coalesce(array_length(p_member_ids,1),0)>99 then raise exception 'A group can have at most 100 members'; end if;
 insert into public.wanchat_conversations(kind,title,created_by) values('group',trim(p_title),v_me) returning id into v_conversation;
 insert into public.wanchat_conversation_members(conversation_id,user_id,role) values(v_conversation,v_me,'owner');
 foreach v_member in array coalesce(p_member_ids,'{}'::uuid[]) loop
  if v_member<>v_me and exists(select 1 from auth.users u where u.id=v_member)
  and not exists(select 1 from public.wanchat_user_blocks b where (b.blocker_id=v_me and b.blocked_id=v_member) or (b.blocker_id=v_member and b.blocked_id=v_me)) then
   insert into public.wanchat_conversation_members(conversation_id,user_id,role) values(v_conversation,v_member,'member') on conflict do nothing;
  end if;
 end loop;
 return v_conversation;
end; $$;
revoke all on function public.wanchat_create_direct_conversation(uuid) from public,anon;
revoke all on function public.wanchat_create_group(text,uuid[]) from public,anon;
grant execute on function public.wanchat_create_direct_conversation(uuid) to authenticated;
grant execute on function public.wanchat_create_group(text,uuid[]) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  begin alter publication supabase_realtime add table public.wanchat_conversations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.wanchat_conversation_members; exception when duplicate_object then null; end;
 end if;
end $$;
