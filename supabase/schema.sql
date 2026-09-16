-- 젤리젤리 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행한다.
--
-- 핵심은 RLS(Row Level Security)다. 걸러내기를 앱이 아니라 데이터베이스가 한다.
-- 앱에서 실수로 "전부 주세요"라고 해도 내 것만 돌아온다.

-- 시각은 전부 epoch 밀리초(bigint)로 둔다. 기기 안의 값과 형태가 같아야
-- 동기화할 때 시간대나 정밀도 때문에 어긋나지 않는다.

create table if not exists public.jellies (
  id          uuid primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  brand       text,
  shape       text not null,
  color       text not null,
  kcal        integer,
  note        text,
  favorite    boolean not null default false,
  seed_key    text,
  photo_path  text,
  created_at  bigint not null,
  updated_at  bigint not null,
  -- 지운 것도 기록을 남긴다. 그냥 지우면 다른 기기가 "얘가 없네" 하고 되살린다.
  deleted_at  bigint
);

create table if not exists public.entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users on delete cascade,
  jelly_id    uuid not null,
  status      text not null,
  started_at  bigint not null,
  finished_at bigint,
  rating      integer,
  review      text,
  texture     jsonb,
  photo_path  text,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create table if not exists public.settings (
  user_id    uuid primary key references auth.users on delete cascade,
  nickname   text,
  theme      text,
  muted      boolean,
  updated_at bigint not null
);

-- 마지막으로 받아온 뒤 바뀐 것만 가져오기 위한 인덱스
create index if not exists jellies_sync_idx on public.jellies (user_id, updated_at);
create index if not exists entries_sync_idx on public.entries (user_id, updated_at);

alter table public.jellies  enable row level security;
alter table public.entries  enable row level security;
alter table public.settings enable row level security;

-- 내 것만. 읽기도 쓰기도.
drop policy if exists "own jellies" on public.jellies;
create policy "own jellies" on public.jellies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 사진 보관함. 비공개로 두고 계정 폴더로 가른다.
insert into storage.buckets (id, name, public)
values ('jelly-photos', 'jelly-photos', false)
on conflict (id) do nothing;

-- 경로는 언제나 <계정id>/<파일명> 이다. 첫 칸이 내 id 여야만 통과한다.
drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects
  for all
  using (bucket_id = 'jelly-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'jelly-photos' and (storage.foldername(name))[1] = auth.uid()::text);
