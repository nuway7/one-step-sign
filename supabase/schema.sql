-- =====================================================================
-- 한 칸만 옮겼는데 방명록 : Supabase 설정
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전하게 만들었어요.
--
-- 보안 구조
--  - 방명록 테이블은 "숨기지 않은 글 읽기"만 누구나 할 수 있어요.
--  - 글쓰기는 submit_entry 함수로만 가능하고, 부스 코드가 맞아야 해요.
--  - 숨기기와 전체 목록 보기는 guestbook_admins 에 등록된 로그인 계정만 가능해요.
--  - 부스 코드, 전시 기간, 금지어가 든 설정 테이블은 API로 아예 읽을 수 없어요.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 방명록 ----------
create table if not exists public.guestbook_entries (
  id         uuid primary key default gen_random_uuid(),
  n          bigint generated always as identity,
  name       text not null check (char_length(name) between 1 and 20),
  msg        text not null check (char_length(msg) between 1 and 120),
  look       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  hidden     boolean not null default false
);
create index if not exists guestbook_entries_created_idx on public.guestbook_entries (created_at);

alter table public.guestbook_entries enable row level security;

drop policy if exists "read visible entries" on public.guestbook_entries;
create policy "read visible entries" on public.guestbook_entries
  for select to anon, authenticated using (hidden = false);
-- insert / update / delete 정책은 일부러 만들지 않아요 (아래 함수로만 가능).

-- ---------- 비공개 설정 (API로 읽을 수 없음) ----------
create table if not exists public.guestbook_settings (
  id           int primary key default 1 check (id = 1),
  code_hash    text,                                   -- 부스 코드 (bcrypt 해시)
  open_from    timestamptz,                            -- 비우면 제한 없음
  open_until   timestamptz,
  max_name     int not null default 10,
  max_msg      int not null default 80,
  per_minute   int not null default 20,                -- 전체 1분당 최대 글 수 (코드 유출 대비)
  banned_words text[] not null default array[
    '씨발','시발','ㅅㅂ','ㅆㅂ','씹','병신','ㅂㅅ','븅신','개새','개색','새끼','좆','존나','졸라',
    '지랄','ㅈㄹ','닥쳐','꺼져','미친놈','미친년','엠창','느금','니애미','애미','애비',
    'fuck','shit','bitch','sex','섹스']
);
insert into public.guestbook_settings (id) values (1) on conflict do nothing;
alter table public.guestbook_settings enable row level security;   -- 정책 없음 = 아무도 못 읽음
revoke all on public.guestbook_settings from anon, authenticated;

create table if not exists public.guestbook_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.guestbook_admins enable row level security;
revoke all on public.guestbook_admins from anon, authenticated;

-- ---------- 도우미 ----------
create or replace function public.guestbook_normalize(t text)
returns text language sql immutable as $$
  select regexp_replace(lower(coalesce(t, '')), '[[:space:][:punct:]0-9]', '', 'g')
$$;

create or replace function public.guestbook_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.guestbook_admins where user_id = auth.uid())
$$;

-- ---------- 부스 코드 확인 ----------
create or replace function public.check_booth_code(p_code text)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.guestbook_settings;
begin
  select * into s from public.guestbook_settings where id = 1;
  return s.code_hash is not null and crypt(coalesce(p_code, ''), s.code_hash) = s.code_hash;
end $$;

-- ---------- 글쓰기 ----------
create or replace function public.submit_entry(p_code text, p_name text, p_msg text, p_look jsonb)
returns public.guestbook_entries
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  s      public.guestbook_settings;
  v_name text;
  v_msg  text;
  v_look jsonb := '{}'::jsonb;
  k      text;
  v      text;
  w      text;
  r      public.guestbook_entries;
begin
  select * into s from public.guestbook_settings where id = 1;

  if s.code_hash is null or crypt(coalesce(p_code, ''), s.code_hash) <> s.code_hash then
    raise exception 'BOOTH_CODE' using hint = '부스 코드가 맞지 않아요.';
  end if;
  if s.open_from is not null and now() < s.open_from then
    raise exception 'CLOSED' using hint = '아직 방명록을 받는 기간이 아니에요.';
  end if;
  if s.open_until is not null and now() > s.open_until then
    raise exception 'CLOSED' using hint = '방명록 기간이 끝났어요. 고마워요!';
  end if;
  if (select count(*) from public.guestbook_entries where created_at > now() - interval '1 minute') >= s.per_minute then
    raise exception 'BUSY' using hint = '잠시 뒤에 다시 시도해 주세요.';
  end if;

  v_name := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]|\s+', ' ', 'g')), s.max_name);
  v_msg  := left(btrim(regexp_replace(coalesce(p_msg,  ''), '[[:cntrl:]]|\s+', ' ', 'g')), s.max_msg);
  if v_msg = '' then
    raise exception 'EMPTY' using hint = '방명록 내용을 적어 주세요.';
  end if;

  foreach w in array s.banned_words loop
    if position(public.guestbook_normalize(w) in public.guestbook_normalize(v_name || ' ' || v_msg)) > 0 then
      raise exception 'BANNED' using hint = '조금 더 순한 말로 적어 주세요 🙂';
    end if;
  end loop;

  -- 캐릭터 부품은 정해진 키와 짧은 영문 id만 받아요
  foreach k in array array['hair', 'hairColor', 'acc', 'outfit', 'skin'] loop
    v := p_look ->> k;
    if v ~ '^[a-z0-9-]{1,20}$' then v_look := v_look || jsonb_build_object(k, v); end if;
  end loop;

  insert into public.guestbook_entries (name, msg, look)
  values (coalesce(nullif(v_name, ''), '익명'), v_msg, v_look)
  returning * into r;

  if v_name = '' then
    update public.guestbook_entries set name = '익명의 신입사원 ' || r.n where id = r.id returning * into r;
  end if;
  return r;
end $$;

-- ---------- 관리자 ----------
create or replace function public.admin_list_entries()
returns setof public.guestbook_entries
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.guestbook_is_admin() then raise exception 'NOT_ADMIN' using hint = '관리자 계정이 아니에요.'; end if;
  return query select * from public.guestbook_entries order by created_at desc;
end $$;

create or replace function public.admin_set_hidden(p_id uuid, p_hidden boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.guestbook_is_admin() then raise exception 'NOT_ADMIN' using hint = '관리자 계정이 아니에요.'; end if;
  update public.guestbook_entries set hidden = p_hidden where id = p_id;
end $$;

-- ---------- 실행 권한 ----------
revoke all on function public.submit_entry(text, text, text, jsonb) from public;
revoke all on function public.check_booth_code(text) from public;
revoke all on function public.admin_list_entries() from public, anon;
revoke all on function public.admin_set_hidden(uuid, boolean) from public, anon;
revoke all on function public.guestbook_is_admin() from public, anon;
grant execute on function public.submit_entry(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.check_booth_code(text) to anon, authenticated;
grant execute on function public.admin_list_entries() to authenticated;
grant execute on function public.admin_set_hidden(uuid, boolean) to authenticated;
grant execute on function public.guestbook_is_admin() to authenticated;
grant select on public.guestbook_entries to anon, authenticated;
