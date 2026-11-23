// 부스 모드의 게임 소개 영상
// - 영상을 처음 한 번만 받아서 브라우저 저장소(Cache Storage)에 보관하고, 그 뒤로는 저장본을 반복 재생해요.
//   → 무한 반복해도 매번 다시 받지 않고, 전시장 인터넷이 끊겨도 계속 나와요.
// - 영상 파일을 바꾸면(크기나 수정 시각이 달라지면) 다음에 켤 때 새로 받아요.
import { VIDEO } from './config.js';

const CACHE_NAME = 'onestep-video-v1';
const $ = (s) => document.querySelector(s);

async function openCache() {
  try { return 'caches' in window ? await caches.open(CACHE_NAME) : null; } catch { return null; }
}

async function cachedBlobUrl(src) {
  const cache = await openCache();
  const hit = cache && (await cache.match(src).catch(() => null));
  if (!hit) return null;
  try { return URL.createObjectURL(await hit.blob()); } catch { return null; }
}

// 저장본이 최신인지 확인 (인터넷이 안 되면 그냥 저장본을 써요)
async function isStale(src) {
  const cache = await openCache();
  const hit = cache && (await cache.match(src).catch(() => null));
  if (!hit) return true;
  try {
    const head = await fetch(src, { method: 'HEAD', cache: 'no-store' });
    if (!head.ok) return false;
    const same = (k) => !head.headers.get(k) || head.headers.get(k) === hit.headers.get(k);
    return !(same('content-length') && same('last-modified') && same('etag'));
  } catch { return false; }
}

async function download(src) {
  const cache = await openCache();
  try {
    const res = await fetch(src, { cache: 'no-store' });
    if (!res.ok) return null;
    if (cache) { await cache.put(src, res.clone()); }
    return URL.createObjectURL(await res.blob());
  } catch { return null; }
}

export async function startVideo() {
  const pane = $('#videoPane'), v = $('#introVideo');
  pane.hidden = false;
  document.body.classList.toggle('video-left', VIDEO.side === 'left');
  const src = new URL(VIDEO.src, location.href).href;

  v.addEventListener('loadedmetadata', () => {
    if (v.videoWidth && v.videoHeight) document.body.style.setProperty('--video-ratio', String(v.videoWidth / v.videoHeight));
  });

  // 소리: 브라우저가 자동 재생 소리를 막으면 음소거로 틀고, 첫 터치 때 소리를 켜요
  const play = () => v.play().catch(() => { if (!v.muted) { v.muted = true; v.play().catch(() => {}); } });
  v.muted = !VIDEO.sound;
  if (VIDEO.sound) addEventListener('pointerdown', () => { v.muted = false; }, { once: true });

  const setSrc = (url, keepTime = false) => {
    const t = keepTime ? v.currentTime : 0;
    v.src = url;
    if (t) v.addEventListener('loadedmetadata', () => { try { v.currentTime = t; } catch { /* 무시 */ } }, { once: true });
    play();
  };

  // 저장본이 있으면 바로 저장본으로, 없으면 일단 인터넷으로 틀면서 뒤에서 내려받아요
  const cached = await cachedBlobUrl(src);
  setSrc(cached || src);
  (async () => {
    if (cached && !(await isStale(src))) return;
    const fresh = await download(src);
    if (fresh) { if (cached) URL.revokeObjectURL(cached); setSrc(fresh, true); }
  })();

  // 저장본이 깨졌으면 인터넷 주소로 다시
  v.addEventListener('error', () => { if (v.src.startsWith('blob:')) setSrc(src); });

  // 멈춤 감시: 멈췄거나 5초 넘게 화면이 그대로면 다시 재생
  let lastTime = -1, still = 0;
  setInterval(() => {
    if (document.hidden) return;
    if (v.paused) { play(); return; }
    if (v.currentTime === lastTime) { if (++still >= 3) { still = 0; v.load(); play(); } } else still = 0;
    lastTime = v.currentTime;
  }, 2000);
}
