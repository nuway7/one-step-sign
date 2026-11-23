-- =====================================================================
-- 부스 코드, 전시 기간, 관리자 등록
-- 이 파일은 "예시"예요. 값을 바꾼 내용은 SQL Editor 에서만 실행하고,
-- 실제 부스 코드를 이 파일에 적어서 깃허브에 올리지 마세요.
-- =====================================================================

-- 1) 부스 코드 정하기 (부스 기기에서 한 번만 입력할 비밀번호)
update public.guestbook_settings
set code_hash = extensions.crypt('여기에-부스-코드', extensions.gen_salt('bf'))
where id = 1;

-- 2) 전시 기간 (한국 시간 기준 예시, 필요 없으면 null)
update public.guestbook_settings
set open_from  = '2026-12-01 09:00:00+09',
    open_until = '2026-12-07 22:00:00+09'
where id = 1;

-- 3) 관리자 등록
--    Authentication > Users 에서 관리자 계정을 먼저 만들고, 그 이메일을 넣으세요.
insert into public.guestbook_admins (user_id)
select id from auth.users where email = '관리자-이메일@example.com'
on conflict do nothing;

-- 확인
select code_hash is not null as code_set, open_from, open_until from public.guestbook_settings;
select u.email from public.guestbook_admins a join auth.users u on u.id = a.user_id;
