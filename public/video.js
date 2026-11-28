// 부스 모드의 게임 소개 영상
// - config.js의 VIDEO.playlist에 적은 영상을 순서대로 번갈아 가며 끝없이 틀어요.
// - 영상마다 처음 한 번만 받아서 브라우저 저장소(Cache Storage)에 보관하고, 그 뒤로는 저장본을 재생해요.
//   → 무한 반복해도 매번 다시 받지 않고, 전시장 인터넷이 끊겨도 계속 나와요.
// - 영상 파일을 바꾸면(크기나 수정 시각이 달라지면) 다음에 켤 때 새로 받아요.
// - <video>를 두 개 겹쳐 두고, 하나가 재생되는 동안 다음 영상을 미리 준비해서 끊김 없이 넘어가요.
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

// 더 이상 목록에 없는 옛 영상 저장본은 지워서 저장 공간을 비워요
async function pruneCache(keep) {
  const cache = await openCache();
  if (!cache) return;
  try {
    for (const req of await cache.keys()) if (!keep.includes(req.url)) await cache.delete(req);
  } catch { /* 무시 */ }
}

export async function startVideo() {
  const pane = $('#videoPane');
  const players = [...pane.querySelectorAll('video')];
  pane.hidden = false;
  document.body.classList.toggle('video-left', VIDEO.side === 'left');
  document.body.style.setProperty('--video-ratio', String(VIDEO.ratio || 9 / 16));
  pane.style.setProperty('--video-fit', VIDEO.fit || 'contain');

  const list = (VIDEO.playlist?.length ? VIDEO.playlist : [VIDEO.src]).map((s) => new URL(s, location.href).href);
  const urls = list.slice(); // 지금 쓸 주소: 저장본(blob:)이 있으면 저장본, 없으면 인터넷 주소
  pruneCache(list);

  // 소리: 브라우저가 자동 재생 소리를 막으면 음소거로 틀고, 첫 터치 때 소리를 켜요
  const play = (v) => v.play().catch(() => { if (!v.muted) { v.muted = true; v.play().catch(() => {}); } });

  let index = 0;                     // 지금 재생 중인 영상 번호
  let active = players[0], spare = players[1];
  if (VIDEO.sound) addEventListener('pointerdown', () => { active.muted = false; }, { once: true });

  const load = (v, i) => {
    v.dataset.index = String(i);
    v.src = urls[i];
    v.load();
  };
  const show = (v) => {
    players.forEach((p) => p.classList.toggle('on', p === v));
    v.muted = !VIDEO.sound; // 소리가 막혀 있으면 play()가 알아서 음소거로 다시 틀어요
    play(v);
  };

  // 영상이 하나뿐이면 그냥 반복, 여러 개면 끝날 때마다 다음 영상으로
  const single = list.length === 1;
  players.forEach((p) => { p.loop = single; p.muted = true; });

  const next = () => {
    if (single) return;
    index = (index + 1) % list.length;
    const prev = active;
    [active, spare] = [spare, active];
    if (active.dataset.index !== String(index) || !active.src) load(active, index);
    active.currentTime = 0;
    show(active);
    prev.pause();
    prev.muted = true;
    // 방금 끝난 쪽에 그다음 영상을 미리 준비
    setTimeout(() => load(prev, (index + 1) % list.length), 300);
  };
  players.forEach((p) => p.addEventListener('ended', () => { if (p === active) next(); }));

  // 저장본이 깨졌으면 인터넷 주소로 다시
  players.forEach((p) => p.addEventListener('error', () => {
    const i = Number(p.dataset.index);
    if (p.src.startsWith('blob:')) { urls[i] = list[i]; load(p, i); if (p === active) play(p); }
    else if (p === active && !single) setTimeout(next, 1000); // 영상을 못 틀면 건너뛰기
  }));

  // 저장본이 있으면 저장본으로, 없으면 일단 인터넷 주소로 시작해요
  for (let i = 0; i < list.length; i++) urls[i] = (await cachedBlobUrl(list[i])) || list[i];
  load(active, 0);
  show(active);
  if (!single) load(spare, 1 % list.length);

  // 뒤에서 하나씩 내려받아 저장해 두고, 다음 차례부터 저장본으로 틀어요 (지금 재생은 끊지 않아요)
  (async () => {
    for (let i = 0; i < list.length; i++) {
      const hasCache = urls[i].startsWith('blob:');
      if (hasCache && !(await isStale(list[i]))) continue;
      const fresh = await download(list[i]);
      if (!fresh) continue;
      const old = urls[i];
      urls[i] = fresh;
      // 아직 재생 전인 쪽은 바로 저장본으로 바꿔 둬요
      if (spare.dataset.index === String(i)) load(spare, i);
      if (old.startsWith('blob:') && !players.some((p) => p.src === old)) URL.revokeObjectURL(old);
    }
  })();

  // 멈춤 감시: 멈췄거나 6초 넘게 화면이 그대로면 다시 재생
  let lastTime = -1, still = 0;
  setInterval(() => {
    if (document.hidden) return;
    const v = active;
    if (v.ended) { next(); return; }
    if (v.paused) { play(v); return; }
    if (v.currentTime === lastTime) {
      if (++still >= 3) { still = 0; const t = v.currentTime; v.load(); v.addEventListener('loadedmetadata', () => { try { v.currentTime = t; } catch { /* 무시 */ } }, { once: true }); play(v); }
    } else still = 0;
    lastTime = v.currentTime;
  }, 2000);
}
