-- 캘박 Supabase 초기 설정
-- 이미 이 SQL을 성공적으로 실행했다면 다시 실행할 필요가 없습니다.
-- 카카오 로그인 사용을 전제로 합니다.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null check (char_length(title) between 1 and 60),
  memo text not null default '' check (char_length(memo) <= 500),
  start_date date not null,
  end_date date not null,
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint valid_room_dates check (
    end_date >= start_date
    and end_date <= start_date + 119
  )
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 30),
  avatar text,
  selected_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists participants_room_id_idx
  on public.participants(room_id);

alter table public.rooms enable row level security;
alter table public.participants enable row level security;

revoke all on public.rooms from anon;
revoke all on public.participants from anon;

grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.participants to authenticated;

drop policy if exists "signed users can read rooms" on public.rooms;
create policy "signed users can read rooms"
on public.rooms for select to authenticated using (true);

drop policy if exists "users can create rooms" on public.rooms;
create policy "users can create rooms"
on public.rooms for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "owners can update rooms" on public.rooms;
create policy "owners can update rooms"
on public.rooms for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "owners can delete rooms" on public.rooms;
create policy "owners can delete rooms"
on public.rooms for delete to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "signed users can read participants" on public.participants;
create policy "signed users can read participants"
on public.participants for select to authenticated using (true);

drop policy if exists "users can add themselves" on public.participants;
create policy "users can add themselves"
on public.participants for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update themselves" on public.participants;
create policy "users can update themselves"
on public.participants for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete themselves" on public.participants;
create policy "users can delete themselves"
on public.participants for delete to authenticated
using ((select auth.uid()) = user_id);
