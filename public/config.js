// 사이트 설정 — 이 파일은 깃허브에 공개돼요.
// 공개돼도 괜찮은 값만 넣으세요.
//
//  SUPABASE_URL       Supabase > Project Settings > API > Project URL
//  SUPABASE_ANON_KEY  같은 화면의 anon (또는 publishable) 키. 공개용 키라서 올려도 괜찮아요.
//                     ⚠ service_role / secret 키는 절대 넣지 마세요.
//
// 두 값을 비워 두면 노트북 서버(node server.mjs) 모드로 동작해요.
// 주소 뒤에 ?backend=local 을 붙여도 노트북 서버 모드로 바뀌어요.

export const SUPABASE_URL = 'https://qycflcpgemnbjjjiebpo.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Vp5VkLXbZ4khSJxAdSftWw_sB0toaRj';

// 부스 모드(?mode=booth): 모니터 한 대에 방명록 + 게임 소개 영상을 함께 띄워요.
export const VIDEO = {
  src: 'assets/intro.mp4', // 세로 영상 파일
  side: 'right',           // 'right' 또는 'left'
  sound: false,            // true 면 소리 켜기 (브라우저가 막으면 첫 터치 때 켜져요)
};

export const LIMITS = {
  maxName: 10,          // 이름 최대 글자 수 (DB 설정과 맞춰 주세요)
  maxMessage: 80,       // 방명록 최대 글자 수
  maxOnScreen: 36,      // 한 화면에 동시에 보이는 캐릭터 수
  idleResetSeconds: 90, // 아무도 안 만지면 처음 화면으로
  pollSeconds: 4,       // 새 글 확인 간격
};
