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
  // 적은 순서대로 번갈아 가며 끝없이 반복해요. 하나만 적으면 그 영상만 반복해요.
  playlist: [
    'assets/play.mp4',     // 게임 플레이 영상
    'assets/cutscene.mp4', // 인트로 컷씬
  ],
  ratio: 9 / 16,           // 영상 칸의 가로:세로 비율
  fit: 'contain',          // 'contain' = 잘리지 않게 전부 보이기, 'cover' = 칸을 꽉 채우기 (가장자리가 잘려요)
  side: 'right',           // 'right' 또는 'left'
  sound: false,            // true 면 소리 켜기 (브라우저가 막으면 첫 터치 때 켜져요)
};

// 전시 기간: 사무실 바닥 가운데에 D-3, D-2 … 전시 날에는 D-DAY로 보여 줘요. 끝난 뒤에는 표시하지 않아요.
export const EXHIBIT = {
  from: '2026-12-01',  // 첫날 (YYYY-MM-DD)
  until: '2026-12-02', // 마지막 날
};

export const LIMITS = {
  maxName: 10,          // 이름 최대 글자 수 (DB 설정과 맞춰 주세요)
  maxMessage: 80,       // 방명록 최대 글자 수
  maxOnScreen: 36,      // 한 화면에 동시에 보이는 캐릭터 수
  idleResetSeconds: 90, // 아무도 안 만지면 처음 화면으로
  pollSeconds: 4,       // 새 글 확인 간격
};
