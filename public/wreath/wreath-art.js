// 도트 화환: 부품 정의 + 그리기
// 화환 한 개 = 48 x 128 픽셀 스프라이트 (바닥 닿는 점 = 맨 아래 가운데).
// 꽃과 받침대는 스프라이트로 캐시하고, 리본 글씨는 그릴 때마다 캔버스 글자로 또렷하게 써요.

export const SW = 48, SH = 128;
const CX = 24, BASE = SH - 1;

// ---------- 색 도우미 ----------
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function shade(hex, amt) { const c = hexToRgb(hex); return rgbToHex(c.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); }

// ---------- 부품 ----------
export const SHAPES = [
  { id: 'round', name: '원형' },
  { id: 'double', name: '2단' },
  { id: 'heart', name: '하트' },
];
export const FLOWERS = [
  { id: 'pink', name: '분홍', c: '#ff8fb8' },
  { id: 'red', name: '빨강', c: '#ef4552' },
  { id: 'yellow', name: '노랑', c: '#ffd23f' },
  { id: 'white', name: '하양', c: '#fbfbff' },
  { id: 'purple', name: '보라', c: '#a77bf0' },
  { id: 'sky', name: '하늘', c: '#7cc4ff' },
  { id: 'orange', name: '주황', c: '#ff9a4a' },
];
export const ACCENTS = FLOWERS.map((f) => ({ ...f }));
export const RIBBONS = [
  { id: 'red', name: '빨강', c: '#e23b4a', t: '#fff4c9' },
  { id: 'white', name: '하양', c: '#fbfbfb', t: '#262833' },
  { id: 'pink', name: '분홍', c: '#ff9cc2', t: '#6b1a3d' },
  { id: 'gold', name: '금색', c: '#f2c14e', t: '#4a2f00' },
  { id: 'blue', name: '파랑', c: '#3f6fe0', t: '#ffffff' },
  { id: 'purple', name: '보라', c: '#8a5cd6', t: '#ffffff' },
];
export const DECOS = [
  { id: 'none', name: '없음' },
  { id: 'bow', name: '큰 리본' },
  { id: 'balloon', name: '풍선' },
  { id: 'star', name: '별' },
  { id: 'doc', name: '문서 상자' },
];
export const PART_LISTS = { shape: SHAPES, flower: FLOWERS, accent: ACCENTS, ribbon: RIBBONS, deco: DECOS };
export const DEFAULT_LOOK = { shape: 'round', flower: 'pink', accent: 'white', ribbon: 'red', deco: 'bow' };

const pick = (list, id) => list.find((x) => x.id === id) || list[0];
export function randomLook() {
  const r = (l) => l[Math.floor(Math.random() * l.length)].id;
  const flower = r(FLOWERS);
  let accent = r(ACCENTS); if (accent === flower) accent = 'white';
  return { shape: r(SHAPES), flower, accent, ribbon: r(RIBBONS), deco: r(DECOS) };
}

// ---------- 그리기 ----------
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
const LEAF = ['#2f9e5a', '#3fb86b', '#26844a'];
const WOOD = '#c9a27a', WOOD_D = '#9a7650', WOOD_L = '#e0c19c';

// 모양마다: 꽃판 영역(inside), 가운데 영역(center), 리본이 매달리는 높이, 꽃판 꼭대기
function geometry(shape) {
  if (shape === 'double') {
    const big = { x: CX, y: BASE - 66, r: 17 }, small = { x: CX, y: BASE - 95, r: 13 };
    const inC = (c, x, y, pad = 0) => (x - c.x) ** 2 + (y - c.y) ** 2 <= (c.r + pad) ** 2;
    return {
      inside: (x, y) => inC(big, x, y) || inC(small, x, y),
      center: (x, y) => inC(big, x, y, -big.r * 0.62) || inC(small, x, y, -small.r * 0.6),
      hang: big.y + 9, top: small.y - small.r, mid: big, box: [CX - 20, small.y - 15, 40, big.y + 20 - (small.y - 15)],
    };
  }
  if (shape === 'heart') {
    const c = { x: CX, y: BASE - 74 }, S = 22;
    const inside = (x, y) => {
      const nx = (x - c.x) / S, ny = -(y - c.y) / S + 0.15;
      return (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3 <= 0;
    };
    return {
      inside, center: (x, y) => (x - c.x) ** 2 + (y - c.y + 2) ** 2 <= 49,
      hang: c.y + 13, top: c.y - 20, mid: { x: c.x, y: c.y, r: 20 }, box: [CX - 24, c.y - 23, 48, 48],
    };
  }
  const c = { x: CX, y: BASE - 74, r: 20 };
  return {
    inside: (x, y) => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r ** 2,
    center: (x, y) => (x - c.x) ** 2 + (y - c.y) ** 2 <= (c.r * 0.4) ** 2,
    hang: c.y + 11, top: c.y - c.r, mid: c, box: [CX - 22, c.y - 22, 44, 44],
  };
}
export function ribbonRect(look) {
  // 왼쪽/오른쪽 리본 (스프라이트 좌표): 꽃판 아래에서 바닥 가까이까지
  const g = geometry(look.shape);
  const top = g.hang, bottom = BASE - 6;
  return { left: { x: CX - 13, y: top, w: 8, h: bottom - top }, right: { x: CX + 5, y: top, w: 8, h: bottom - top } };
}

// 꽃 한 송이: 3x3 꽃잎 덩어리 (왼쪽 위 밝게, 오른쪽 아래 어둡게, 가운데 꽃술)
function flowerBlob(ctx, x, y, c) {
  const d = shade(c, -0.25), l = shade(c, 0.35);
  px(ctx, x - 1, y - 1, 3, 3, c);
  px(ctx, x - 1, y - 1, 1, 1, l); px(ctx, x + 1, y + 1, 1, 1, d); px(ctx, x + 1, y - 1, 1, 1, shade(c, 0.12));
  px(ctx, x, y, 1, 1, c === '#fbfbff' || c === '#ffd23f' ? '#f0a020' : shade(c, -0.4));
}

function drawStand(ctx) {
  // 세 다리 받침대 (뒤 다리 → 앞 다리)
  const top = BASE - 58;
  for (let y = top; y <= BASE; y++) px(ctx, CX, y, 1, 1, WOOD_D);
  for (let y = top; y <= BASE; y++) {
    const t = (y - top) / (BASE - top);
    px(ctx, Math.round(CX - 2 - t * 12), y, 2, 1, WOOD);
    px(ctx, Math.round(CX + 1 + t * 12), y, 2, 1, WOOD_D);
  }
  px(ctx, CX - 10, BASE - 22, 21, 2, WOOD); px(ctx, CX - 10, BASE - 22, 21, 1, WOOD_L);
  px(ctx, CX - 15, BASE, 4, 1, '#6b4c30'); px(ctx, CX + 12, BASE, 4, 1, '#6b4c30');
}

function drawRibbonStrip(ctx, r, rib) {
  const c = rib.c, d = shade(c, -0.22), l = shade(c, 0.25);
  px(ctx, r.x, r.y, r.w, r.h, c);
  px(ctx, r.x, r.y, 1, r.h, l); px(ctx, r.x + r.w - 1, r.y, 1, r.h, d);
  // 아래 끝 V 홈
  ctx.clearRect(r.x + r.w / 2 - 1, r.y + r.h - 2, 2, 2);
  ctx.clearRect(r.x + r.w / 2 - 2, r.y + r.h - 1, 4, 1);
  // 리본 묶음 (꽃판 아래)
  px(ctx, r.x - 1, r.y - 2, r.w + 2, 3, d);
}

function drawDeco(ctx, deco, g) {
  const top = g.top;
  if (deco === 'bow') {
    const y = top - 1, c = '#ef4552', d = '#b8283a';
    px(ctx, CX - 9, y - 4, 7, 6, c); px(ctx, CX + 3, y - 4, 7, 6, c);
    px(ctx, CX - 9, y + 1, 7, 1, d); px(ctx, CX + 3, y + 1, 7, 1, d);
    px(ctx, CX - 2, y - 3, 5, 5, d); px(ctx, CX - 1, y - 2, 3, 3, c);
    px(ctx, CX - 4, y + 2, 2, 5, c); px(ctx, CX + 3, y + 2, 2, 5, c);
  } else if (deco === 'balloon') {
    const bs = [[CX - 9, top - 26, '#ff6b8a'], [CX + 1, top - 33, '#ffd23f'], [CX + 9, top - 23, '#7cc4ff']];
    for (const [x, y, c] of bs) {
      for (let yy = y; yy < y + 12; yy++) { const t = (yy - y) / 11, w = Math.round(10 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05))); px(ctx, x - (w >> 1), yy, w, 1, c); }
      px(ctx, x - 3, y + 2, 2, 3, shade(c, 0.5));
      px(ctx, x - 1, y + 12, 2, 1, shade(c, -0.3));
      for (let yy = y + 13; yy < top + 2; yy++) px(ctx, x + Math.round((CX - x) * (yy - y - 13) / (top + 2 - y - 13)), yy, 1, 1, '#8a93ad');
    }
  } else if (deco === 'star') {
    const S = ['....1....', '...111...', '111111111', '.1111111.', '..11111..', '.111.111.', '.11...11.'];
    S.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') px(ctx, CX - 4 + x, top - 9 + y, 1, 1, y < 2 ? '#fff1a8' : '#ffd23f'); }));
  } else if (deco === 'doc') {
    // 게임 속 "문서 상자" 를 꽃판 가운데에
    const x = g.mid.x - 7, y = g.mid.y - 7;
    px(ctx, x + 1, y + 1, 14, 13, '#1f47a8'); px(ctx, x, y, 14, 12, '#2b5fd9');
    px(ctx, x + 2, y + 2, 10, 8, '#ffffff');
    px(ctx, x + 3, y + 3, 8, 1, '#7f8db0'); px(ctx, x + 3, y + 5, 6, 1, '#7f8db0'); px(ctx, x + 3, y + 7, 7, 1, '#7f8db0');
  }
}

function seeded(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function paintWreath(ctx, look) {
  const g = geometry(look.shape);
  const fc = pick(FLOWERS, look.flower).c, ac = pick(ACCENTS, look.accent).c, rib = pick(RIBBONS, look.ribbon);
  drawStand(ctx);
  // 잎 바탕 + 가장자리 잎사귀
  const [bx, by, bw, bh] = g.box;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
    if (g.inside(x, y)) px(ctx, x, y, 1, 1, LEAF[(x * 3 + y * 5) % 3]);
    else if ((g.inside(x - 2, y) || g.inside(x + 2, y) || g.inside(x, y - 2) || g.inside(x, y + 2)) && seeded(x * 31 + y) < 0.35) px(ctx, x, y, 1, 1, LEAF[2]);
  }
  // 꽃 (촘촘한 육각 배열)
  let i = 0;
  for (let y = by + 1; y < by + bh; y += 3) {
    for (let x = bx + (Math.round(y / 3) % 2 ? 2 : 0); x < bx + bw; x += 3) {
      i++;
      const jx = x + Math.round(seeded(i) - 0.5), jy = y + Math.round(seeded(i + 99) - 0.5);
      if (!g.inside(jx - 1, jy) || !g.inside(jx + 1, jy) || !g.inside(jx, jy - 1) || !g.inside(jx, jy + 1)) continue;
      if (seeded(i + 7) < 0.14) continue; // 군데군데 잎이 보이게
      flowerBlob(ctx, jx, jy, g.center(jx, jy) ? ac : (seeded(i + 3) < 0.12 ? shade(fc, 0.35) : fc));
    }
  }
  // 리본
  const rr = ribbonRect(look);
  drawRibbonStrip(ctx, rr.left, rib); drawRibbonStrip(ctx, rr.right, rib);
  drawDeco(ctx, look.deco, g);
}

const cache = new Map();
export function getWreathSprite(look) {
  const key = ['shape', 'flower', 'accent', 'ribbon', 'deco'].map((k) => look[k]).join('|');
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = SW; c.height = SH;
  paintWreath(c.getContext('2d'), { ...DEFAULT_LOOK, ...look });
  if (cache.size > 400) cache.clear();
  cache.set(key, c);
  return c;
}

// 리본 글씨: 세로로 한 글자씩 (ctx 는 논리 좌표로 확대된 상태, 그래서 글자는 실제 해상도로 또렷하게 나와요)
const FONT = '"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
function verticalText(ctx, text, r, ox, oy, color) {
  const chars = [...String(text || '')];
  if (!chars.length) return;
  // 띄어쓰기는 반 칸만
  const units = chars.reduce((s, ch) => s + (ch === ' ' ? 0.5 : 1), 0);
  const room = r.h - 6;
  const step = Math.min(6.4, room / units);
  const size = Math.max(2.4, Math.min(6, step * 0.95));
  ctx.save();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${FONT}`;
  let y = oy + r.y + 3;
  for (const ch of chars) {
    const h = ch === ' ' ? step * 0.5 : step;
    if (ch !== ' ') ctx.fillText(ch, ox + r.x + r.w / 2, y + h / 2);
    y += h;
  }
  ctx.restore();
}
export function drawRibbonText(ctx, look, ox, oy, left, right) {
  const rib = pick(RIBBONS, look.ribbon), rr = ribbonRect({ ...DEFAULT_LOOK, ...look });
  verticalText(ctx, left, rr.left, ox, oy, rib.t);
  verticalText(ctx, right, rr.right, ox, oy, rib.t);
}

// 미리보기: 지정한 캔버스에 크게 (리본 글씨 포함)
export function paintWreath2x(canvas, look, { scale = 4, left = '', right = '', crop = true } = {}) {
  const y0 = crop ? 8 : 0, h = SH - y0;
  canvas.width = SW * scale; canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, -y0 * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SW, SH);
  ctx.drawImage(getWreathSprite(look), 0, 0);
  drawRibbonText(ctx, look, 0, 0, left, right);
}
