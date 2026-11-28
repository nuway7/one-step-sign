-- =====================================================================
-- 한 칸만 옮겼는데 · 축하 화환 (방문하지 못한 분들을 위한 방명록) : Supabase 설정
-- schema.sql 을 먼저 실행한 뒤, 이 파일 전체를 SQL Editor 에 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전하게 만들었어요.
--
-- 보안 구조
--  - 화환은 "숨기지 않은 것 읽기"만 누구나 할 수 있어요.
--  - 보내기는 submit_wreath 함수로만 가능해요. 부스 코드는 필요 없지만,
--    금지어 · 글자 수 · 전체 1분당 개수 제한을 DB가 검사해요.
--  - 숨기기와 전체 목록 보기는 방명록과 같은 관리자 계정(guestbook_admins)만 가능해요.
-- =====================================================================

-- ---------- 화환 ----------
create table if not exists public.wreath_entries (
  id         uuid primary key default gen_random_uuid(),
  n          bigint generated always as identity,
  sender     text not null check (char_length(sender) between 1 and 20),  -- 오른쪽 리본: 보내는 사람
  ribbon     text not null check (char_length(ribbon) between 1 and 30),  -- 왼쪽 리본: 축하 문구
  msg        text not null default '' check (char_length(msg) <= 200),     -- 카드 메시지 (선택)
  look       jsonb not null default '{}'::jsonb,                           -- 모양, 꽃 색, 리본 색 …
  created_at timestamptz not null default now(),
  hidden     boolean not null default false
);
create index if not exists wreath_entries_created_idx on public.wreath_entries (created_at);

alter table public.wreath_entries enable row level security;
drop policy if exists "read visible wreaths" on public.wreath_entries;
create policy "read visible wreaths" on public.wreath_entries
  for select to anon, authenticated using (hidden = false);
-- insert / update / delete 정책은 일부러 만들지 않아요 (아래 함수로만 가능).

-- ---------- 설정 (방명록 설정 테이블에 칸 추가, API로 읽을 수 없음) ----------
alter table public.guestbook_settings add column if not exists wreath_per_minute int not null default 10;
alter table public.guestbook_settings add column if not exists wreath_open_until timestamptz;  -- 비우면 계속 받음

-- ---------- 보내기 ----------
create or replace function public.submit_wreath(p_sender text, p_ribbon text, p_msg text, p_look jsonb)
returns public.wreath_entries
language plpgsql volatile security definer set search_path = public as $$
declare
  s        public.guestbook_settings;
  v_sender text;
  v_ribbon text;
  v_msg    text;
  v_look   jsonb := '{}'::jsonb;
  k        text;
  v        text;
  w        text;
  r        public.wreath_entries;
begin
  select * into s from public.guestbook_settings where id = 1;

  if s.wreath_open_until is not null and now() > s.wreath_open_until then
    raise exception 'CLOSED' using hint = '화환 받기가 끝났어요. 마음 전해 주셔서 고마워요!';
  end if;
  if (select count(*) from public.wreath_entries where created_at > now() - interval '1 minute') >= coalesce(s.wreath_per_minute, 10) then
    raise exception 'BUSY' using hint = '화환이 한꺼번에 몰리고 있어요. 잠시 뒤에 다시 보내 주세요.';
  end if;

  v_sender := left(btrim(regexp_replace(coalesce(p_sender, ''), '[[:cntrl:]]|\s+', ' ', 'g')), 10);
  v_ribbon := left(btrim(regexp_replace(coalesce(p_ribbon, ''), '[[:cntrl:]]|\s+', ' ', 'g')), 12);
  v_msg    := left(btrim(regexp_replace(coalesce(p_msg,    ''), '[[:cntrl:]]|\s+', ' ', 'g')), 80);

  foreach w in array s.banned_words loop
    if position(public.guestbook_normalize(w) in public.guestbook_normalize(v_sender || ' ' || v_ribbon || ' ' || v_msg)) > 0 then
      raise exception 'BANNED' using hint = '조금 더 순한 말로 적어 주세요 🙂';
    end if;
  end loop;

  -- 꾸미기 값은 정해진 키와 짧은 영문 id만 받아요
  foreach k in array array['shape', 'flower', 'accent', 'ribbon', 'deco'] loop
    v := p_look ->> k;
    if v ~ '^[a-z0-9-]{1,20}$' then v_look := v_look || jsonb_build_object(k, v); end if;
  end loop;

  insert into public.wreath_entries (sender, ribbon, msg, look)
  values (coalesce(nullif(v_sender, ''), '익명'), coalesce(nullif(v_ribbon, ''), '축 졸업전시'), v_msg, v_look)
  returning * into r;
  return r;
end $$;

-- ---------- 관리자 ----------
create or replace function public.admin_list_wreaths()
returns setof public.wreath_entries
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.guestbook_is_admin() then raise exception 'NOT_ADMIN' using hint = '관리자 계정이 아니에요.'; end if;
  return query select * from public.wreath_entries order by created_at desc;
end $$;

create or replace function public.admin_set_wreath_hidden(p_id uuid, p_hidden boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.guestbook_is_admin() then raise exception 'NOT_ADMIN' using hint = '관리자 계정이 아니에요.'; end if;
  update public.wreath_entries set hidden = p_hidden where id = p_id;
end $$;

-- ---------- 실행 권한 ----------
revoke all on function public.submit_wreath(text, text, text, jsonb) from public;
revoke all on function public.admin_list_wreaths() from public, anon;
revoke all on function public.admin_set_wreath_hidden(uuid, boolean) from public, anon;
grant execute on function public.submit_wreath(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_list_wreaths() to authenticated;
grant execute on function public.admin_set_wreath_hidden(uuid, boolean) to authenticated;
grant select on public.wreath_entries to anon, authenticated;
