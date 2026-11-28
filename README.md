# 한 칸만 옮겼는데 방명록

> 졸업작품 게임 **「한 칸만 옮겼는데」** 전시 부스에서 쓰는 터치 방명록이에요.
> 관람객이 도트 캐릭터를 만들고 한 마디를 남기면, 워드 문서처럼 생긴 사무실에 그 캐릭터가 **출근**해서 돌아다녀요.

- 게임: 사무실을 무대로 한 퍼즐. 한 번 움직이면 **모두 함께 한 칸** 이동하고, 문서를 제자리에 정리한 뒤 **EXIT 문으로 퇴근**해요.
- 방명록은 게임의 규칙과 분위기를 그대로 가져왔어요. 격자 바닥, 워드 문서 창, 사원증, 퇴근 문, "모두 함께 한 칸 이동!"

## 주요 기능

| | |
|---|---|
| **도트 캐릭터 만들기** | 헤어 10 · 헤어 색 7 · 액세서리 8 · 의상 8 · 피부 4. 게임 캐릭터 스타일 가이드를 16×22 도트로 옮겼어요. |
| **사원증 · 방명록** | 이름(비우면 익명), 워드 문서 모양 입력 칸, 터치로 고르는 예시 문장 |
| **살아 있는 사무실** | 캐릭터는 격자를 한 칸씩 걷고, 가끔 다 같이 한 칸 움직여요. 새 방명록은 OUT 문으로 출근하며 말풍선을 띄워요. |
| **전시 운영** | 터치 전용 UI, 자리 비우면 자동 초기화, 금지어 필터, 관리자 숨기기, 오프라인 대비 |
| **두 가지 실행 방식** | 인터넷 사이트(GitHub Pages + Supabase) 또는 노트북 한 대(로컬 서버) |

## 구조

```
GitHub Pages (public/)                  Supabase
  index.html / style.css                  guestbook_entries   방명록 (숨기지 않은 글만 공개 읽기)
  app.js      참여 흐름, 관리자    ──→     submit_entry()      부스 코드, 기간, 금지어, 1분당 한도 검사 후 저장
  scene.js    도트 사무실 (Canvas)          admin_*()           로그인한 관리자만 목록 보기, 숨기기
  sprites.js  캐릭터 부품, 렌더러           guestbook_settings  부스 코드 해시, 기간, 금지어 (API로 읽을 수 없음)
  api.js      Supabase / 로컬 서버 연결
```

### 보안 설계

- 저장소에는 **비밀이 없어요.** `public/config.js`의 Supabase anon(publishable) 키는 공개용 키이고, 할 수 있는 일은 DB 규칙(RLS)이 정해요.
- **글쓰기**는 `submit_entry` 함수로만 할 수 있고, **부스 코드**가 맞아야 해요. 코드는 저장소에 없고, DB에는 bcrypt 해시만 있어요. 부스 기기에서 관리자 메뉴로 한 번 등록하면 그 기기에만 저장돼요.
- **전시 기간** 밖이거나, 1분에 너무 많은 글이 들어오면 DB가 거절해요.
- **숨기기**는 Supabase Auth로 로그인한 관리자 계정만 할 수 있어요. 글은 지우지 않고 숨기기만 해서 되돌릴 수 있어요.
- 부스로 등록하지 않은 기기(포트폴리오로 방문한 사람)는 **보기 전용**이에요.

## 설정 방법 (Supabase + GitHub Pages)

1. **DB 만들기:** Supabase 대시보드 > SQL Editor에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여 넣고 Run
2. **관리자 계정:** Authentication > Users > Add user로 관리자 이메일과 비밀번호를 만들어요.
3. **부스 코드, 기간, 관리자 등록:** [`supabase/setup-secrets.sql`](supabase/setup-secrets.sql)의 값을 바꿔 SQL Editor에서만 실행해요. 실제 코드는 저장소에 적지 마세요.
4. **사이트 연결:** [`public/config.js`](public/config.js)에 Project URL과 anon(publishable) 키를 넣어요.
5. **배포:** 저장소 Settings > Pages > Source를 **GitHub Actions**로 바꾸고 `main`에 push하면 자동 배포돼요.
6. **부스 기기 등록:** 사이트 왼쪽 위 **W 아이콘을 3초 안에 5번** 누르고 부스 코드를 입력해요.

### 화면 주소

| 구성 | 주소 |
|---|---|
| 모니터 한 대: 방명록 + 게임 소개 영상 | `https://<아이디>.github.io/one-step-sign/?mode=booth` |
| 터치 화면 하나 | `https://<아이디>.github.io/one-step-sign/` |
| 큰 모니터 (보기 전용) | `…/?mode=display` |
| 태블릿 (입력 전용) | `…/?mode=kiosk` (관리자 메뉴: 화면 왼쪽 위 모서리를 5번) |

### 부스 모드 (`?mode=booth`)

모니터 한 대에 방명록 사무실과 세로(9:16) 게임 소개 영상을 나란히 띄워요. 영상은 게임 플레이 영상과 인트로 컷씬을 번갈아 가며 음소거로 무한 반복해요.

- 영상 목록(`playlist`)과 순서, 칸 비율, 맞춤 방식, 위치(왼쪽/오른쪽), 소리 여부는 `public/config.js`의 `VIDEO`에서 바꿔요.
- 영상 칸에 `<video>`를 두 개 겹쳐 두고, 하나가 재생되는 동안 다음 영상을 미리 준비해서 끊김 없이 넘어가요.
- 영상은 처음 한 번만 내려받아 브라우저 저장소(Cache Storage)에 보관하고, 그 뒤로는 저장본을 반복 재생해요. 반복할 때마다 다시 받지 않아서 트래픽이 거의 들지 않고, 인터넷이 끊겨도 계속 나와요.
- 영상 파일을 바꾸면 다음에 켤 때 자동으로 새로 받아요.
- 소리를 켜려면 `sound: true`로 바꾸세요. 브라우저가 소리 자동 재생을 막으면 화면을 처음 터치할 때 소리가 켜져요. 크롬을 `--autoplay-policy=no-user-gesture-required` 옵션으로 실행하면 처음부터 소리가 나요.

## 노트북 한 대로 실행 (인터넷 없이)

`public/config.js`의 Supabase 값을 비우거나 주소에 `?backend=local`을 붙이면 로컬 서버 모드로 동작해요. Node.js 18 이상이 필요하고, 따로 설치할 패키지는 없어요.

```
node server.mjs        # 또는 start.bat
```

- 관리자 PIN은 `config.json`에 있어요. `config.example.json`을 복사해서 만들고 PIN을 바꾸세요. `config.json`과 `data/`는 깃허브에 올라가지 않아요.
- 방명록은 `data/entries.json`에 저장돼요.

## 전시가 끝난 뒤 (포트폴리오 보관)

Supabase 무료 프로젝트는 오래 쓰지 않으면 일시 정지돼요. 전시가 끝나면 공개 방명록을 저장소에 보관해 두세요.

```
node tools/export-archive.mjs   # public/archive.json 생성 → 커밋
```

DB에 연결할 수 없으면 사이트가 `archive.json`을 대신 보여 줘요.

## 캐릭터 도트

`public/sheet.html`에서 모든 부품을 한꺼번에 볼 수 있어요.

캐릭터는 16 × 22 칸에 부품을 겹친 뒤, 아래 효과를 자동으로 더해 18 × 24로 그려요.

- 정수리는 밝게, 옆면은 어둡게 칠해 네모난 입체감을 줘요.
- 앞머리 아래 얼굴에 그림자를 넣어요.
- 옷은 오른쪽을 어둡게, 왼쪽을 밝게 칠해요.
- 맞닿은 색을 어둡게 만든 1픽셀 외곽선을 둘러요.

헤어 문자열에서 `H`는 기본색, `D`는 어두운색, `L`은 밝은색이에요. `clip: true`를 넣으면 시그니처 금색 헤어핀이 붙어요.

## 기술

- 순수 HTML / CSS / JavaScript (ES 모듈), 빌드 도구와 외부 라이브러리 없음
- Canvas 2D 도트 렌더링 (480×270 논리 해상도, 정수 배율)
- Supabase: Postgres RLS, `security definer` 함수, pgcrypto, Auth (REST로 직접 호출)
- GitHub Actions로 GitHub Pages 배포
- 로컬 모드: Node.js 내장 모듈만 쓴 HTTP 서버
