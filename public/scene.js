// 방명록 공간: 워드 문서 창 모양의 도트 사무실
// 논리 해상도 가로 576, 세로는 화면 비율에 맞춰(최소 324) 늘려서 그려요. 세로가 길면 바닥 줄 수가 늘어나요.
import { getSprite, SPRITE_W, SPRITE_H, shade } from './sprites.js';
import { EXHIBIT } from './config.js';

export const W = 576;
export let H = 324;
const H_MIN = 324, H_MAX = 560;
const CELL = 16;
const GX = 8, GY = 88;          // 바닥 격자 시작점
const COLS = 35;
let ROWS = 13;
const DOOR = { cx: 26, cy: 0 }; // 퇴근 문 앞 칸
const STEP_MS = 230;

const C = {
  blue: '#2b5fd9', blueD: '#1f47a8', blueL: '#5b86ee',
  ribbon: '#f3f5fa', line: '#d9dfeb', ruler: '#e8ecf4', rulerTick: '#9aa5bd',
  page: '#ffffff', grid: '#e6ebf5', grid2: '#d4dcec',
  wall: '#d7e2f7', wallD: '#bccbeb', wallL: '#e6edfb',
  navy: '#1f2a4d', yellow: '#ffc93c', yellowD: '#e0a419', coral: '#ff6b5b', green: '#3fbf7f',
  paper: '#f7f8fb', paperD: '#c9d0de', ink: '#7f8db0',
};

// ---------- 고정 배경 그리기 ----------
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function drawWindow(ctx, x, y, w, h, sky) {
  px(ctx, x - 2, y - 2, w + 4, h + 4, C.wallD);
  px(ctx, x - 1, y - 1, w + 2, h + 2, '#ffffff');
  // 하늘 띠
  const bands = sky.bands;
  const bh = Math.ceil(h / bands.length);
  bands.forEach((c, i) => px(ctx, x, y + i * bh, w, Math.min(bh, h - i * bh), c));
  // 도시 실루엣
  const city = [[0, 14, 7], [8, 20, 6], [15, 11, 8], [24, 24, 7], [32, 16, 9], [42, 21, 6], [49, 13, 7], [57, 18, 8], [66, 10, 9], [76, 22, 7], [84, 15, 8], [93, 19, 6], [100, 12, 12]];
  for (const [bx, bhgt, bw] of city) {
    if (bx >= w) continue;
    const ww = Math.min(bw, w - bx);
    px(ctx, x + bx, y + h - bhgt, ww, bhgt, sky.city);
    for (let wy = y + h - bhgt + 3; wy < y + h - 2; wy += 4)
      for (let wx = x + bx + 2; wx < x + bx + ww - 1; wx += 3)
        if (((wx * 7 + wy * 13) % 5) < 2) px(ctx, wx, wy, 1, 2, sky.lit);
  }
  // 블라인드
  for (let by = y; by < y + h * 0.42; by += 4) px(ctx, x, by, w, 2, sky.blind);
  // 창틀 십자
  px(ctx, x + Math.floor(w / 2), y, 2, h, '#ffffff');
  px(ctx, x, y + h - 1, w, 2, C.wallD);
}

function drawCabinet(ctx, x, y) { // 서류 캐비닛 (가로 16, 세로 40)
  px(ctx, x, y, 16, 40, '#8b9bbf');
  px(ctx, x + 1, y + 1, 14, 38, '#a9b7d6');
  for (let i = 0; i < 3; i++) {
    const dy = y + 3 + i * 12;
    px(ctx, x + 2, dy, 12, 10, '#93a3c6');
    px(ctx, x + 2, dy + 9, 12, 1, '#7a8aae');
    px(ctx, x + 6, dy + 3, 4, 2, '#e9eef8');
    px(ctx, x + 6, dy + 5, 4, 1, '#6b7ba0');
  }
}

function drawBinders(ctx, x, y) {
  px(ctx, x - 2, y + 22, 76, 3, '#9aa9c9');
  px(ctx, x - 2, y + 25, 76, 1, '#7d8db0');
  const cols = [C.blue, C.blueD, C.yellow, C.blue, '#6d8ff0', C.coral, C.blue, C.yellowD, C.blueD];
  cols.forEach((c, i) => {
    const bx = x + i * 8, bh = 18 + (i % 3);
    px(ctx, bx, y + 22 - bh, 7, bh, c);
    px(ctx, bx + 1, y + 22 - bh + 3, 5, 3, '#ffffff');
    px(ctx, bx + 2, y + 22 - 6, 3, 3, shade(c, -0.35));
  });
}

function drawDoor(ctx, x, y) { // 퇴근 문 (OUT)
  px(ctx, x - 3, y - 3, 38, 51, C.blueD);
  px(ctx, x - 2, y - 2, 36, 50, C.blue);
  px(ctx, x, y, 32, 48, '#5c7fd8');
  px(ctx, x + 2, y + 2, 13, 44, '#7d9cec');
  px(ctx, x + 17, y + 2, 13, 44, '#7d9cec');
  px(ctx, x + 12, y + 24, 2, 5, C.yellow);
  px(ctx, x + 18, y + 24, 2, 5, C.yellow);
  // 위 간판
  px(ctx, x + 4, y - 13, 24, 9, C.green);
  px(ctx, x + 5, y - 12, 22, 7, '#57d394');
}

function drawPaperStack(ctx, x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    const off = (i % 2) ? 1 : 0;
    px(ctx, x + 1 + off, y + 14 - i * 2, 13, 2, i % 3 === 0 ? C.paperD : C.paper);
  }
  px(ctx, x + 10, y + 14 - n * 2 + 1, 4, 4, C.yellow);
}

function drawPlant(ctx, x, y) {
  px(ctx, x + 4, y + 9, 8, 6, '#d98c5f');
  px(ctx, x + 4, y + 9, 8, 1, '#b86d43');
  const g = '#3fae6a', gd = '#2c8a50';
  px(ctx, x + 6, y - 4, 4, 13, g);
  px(ctx, x + 2, y, 4, 6, gd); px(ctx, x + 10, y - 1, 4, 6, gd);
  px(ctx, x + 4, y - 7, 3, 5, gd); px(ctx, x + 9, y - 6, 3, 4, g);
  px(ctx, x + 7, y - 9, 2, 3, '#ffd84a');
}

function drawDocBlock(ctx, x, y, color) { // 게임 속 "문서 상자"
  px(ctx, x + 1, y + 13, 14, 3, 'rgba(31,42,77,0.18)');
  px(ctx, x + 1, y + 1, 14, 13, shade(color, -0.3));
  px(ctx, x + 1, y, 14, 11, color);
  px(ctx, x + 3, y + 2, 10, 7, '#ffffff');
  px(ctx, x + 4, y + 3, 8, 1, C.ink); px(ctx, x + 4, y + 5, 6, 1, C.ink); px(ctx, x + 4, y + 7, 7, 1, C.ink);
}

function dashedSquare(ctx, x, y, c) {
  for (let i = 0; i < 14; i += 3) {
    px(ctx, x + 1 + i, y + 1, 2, 1, c); px(ctx, x + 1 + i, y + 14, 2, 1, c);
    px(ctx, x + 1, y + 1 + i, 1, 2, c); px(ctx, x + 14, y + 1 + i, 1, 2, c);
  }
}

function skyFor(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 7 && h < 16.5) return { bands: ['#7fb2ff', '#93c0ff', '#a9cdff', '#c3dcff', '#dbeaff'], city: '#8aa3cf', lit: '#c8d8f2', blind: 'rgba(255,255,255,0.55)', key: 'day' };
  if (h >= 16.5 && h < 19.5) return { bands: ['#4b3f8f', '#7b4f9e', '#c0628f', '#f08a6c', '#ffb36b'], city: '#3a3566', lit: '#ffd36b', blind: 'rgba(40,40,80,0.45)', key: 'sunset' };
  return { bands: ['#121a3d', '#18234f', '#1f2c5e', '#2a3870', '#36457f'], city: '#0e1430', lit: '#ffd36b', blind: 'rgba(10,15,40,0.5)', key: 'night' };
}

// 바닥에 놓인 막힌 칸
// 크리스마스 트리: 바닥 가운데. 트리 밑동 줄(row)과 그 앞 D-DAY 현수막 자리는 막힌 칸이에요.
const TREE_CX = Math.floor(COLS / 2);
const treeRow = () => Math.floor(ROWS / 2) + 1;
function buildProps() {
  const tr = treeRow();
  const list = [
    { cx: TREE_CX, cy: tr, kind: 'tree' },
    { cx: TREE_CX, cy: tr + 2, kind: 'banner' },
  ];
  for (let c = TREE_CX - 2; c <= TREE_CX + 2; c++) for (const r of [tr - 1, tr]) list.push({ cx: c, cy: r, kind: 'block' });
  for (let c = TREE_CX - 3; c <= TREE_CX + 3; c++) for (const r of [tr + 1, tr + 2]) list.push({ cx: c, cy: r, kind: 'block' });
  return list.concat(BASE_PROPS());
}
const BASE_PROPS = () => [
  { cx: 0, cy: 0, kind: 'cab' }, { cx: 1, cy: 0, kind: 'cab' },
  { cx: COLS - 1, cy: ROWS - 1, kind: 'plant' }, { cx: 0, cy: ROWS - 1, kind: 'plant' },
  { cx: COLS - 2, cy: ROWS - 1, kind: 'paper' }, { cx: 1, cy: ROWS - 1, kind: 'paper' },
  { cx: 6, cy: 3, kind: 'doc', color: '#ef5b5b' }, { cx: 28, cy: 7, kind: 'doc', color: C.blue },
  { cx: 11, cy: 10, kind: 'doc', color: C.yellow }, { cx: 9, cy: 7, kind: 'doc', color: C.blue },
  { cx: 22, cy: 2, kind: 'doc', color: C.yellow }, { cx: 24, cy: 11, kind: 'doc', color: '#ef5b5b' },
];
let PROPS = buildProps();
const GOALS = [{ cx: 8, cy: 3, c: '#ef5b5b' }, { cx: 30, cy: 7, c: C.blue }, { cx: 13, cy: 10, c: C.yellowD }, { cx: 4, cy: 7, c: C.blue }, { cx: 26, cy: 11, c: '#ef5b5b' }];

// ---------- D-DAY (전시일까지 남은 날) ----------
// 전시 전: D-3, D-2 …  / 전시 기간: D-DAY / 끝난 뒤: 표시 안 함
function dayStart(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
export function ddayLabel(now = new Date()) {
  if (!EXHIBIT?.from) return '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const from = dayStart(EXHIBIT.from), until = dayStart(EXHIBIT.until || EXHIBIT.from);
  if (today < from) return 'D-' + Math.round((from - today) / 86400000);
  if (today <= until) return 'D-DAY';
  return '';
}

// 5 x 7 도트 글자
const GLYPHS = {
  D: ['1110.', '1..1.', '1...1', '1...1', '1...1', '1..1.', '1110.'],
  A: ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
  Y: ['1...1', '1...1', '.1.1.', '..1..', '..1..', '..1..', '..1..'],
  '-': ['.....', '.....', '.....', '1111.', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..1..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  0: ['.111.', '1...1', '1..11', '1.1.1', '11..1', '1...1', '.111.'],
  1: ['..1..', '.11..', '..1..', '..1..', '..1..', '..1..', '.111.'],
  2: ['.111.', '1...1', '....1', '...1.', '..1..', '.1...', '11111'],
  3: ['1111.', '....1', '....1', '.111.', '....1', '....1', '1111.'],
  4: ['...1.', '..11.', '.1.1.', '1..1.', '11111', '...1.', '...1.'],
  5: ['11111', '1....', '1111.', '....1', '....1', '1...1', '.111.'],
  6: ['..11.', '.1...', '1....', '1111.', '1...1', '1...1', '.111.'],
  7: ['11111', '....1', '...1.', '..1..', '.1...', '.1...', '.1...'],
  8: ['.111.', '1...1', '1...1', '.111.', '1...1', '1...1', '.111.'],
  9: ['.111.', '1...1', '1...1', '.1111', '....1', '...1.', '.11..'],
};
function textWidth(text, k) { return text.length * 6 * k - k; }
function drawPixelText(ctx, text, x, y, k, color) {
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch] || GLYPHS[' '];
    g.forEach((row, gy) => [...row].forEach((v, gx) => { if (v === '1') px(ctx, x + (i * 6 + gx) * k, y + gy * k, k, k, color); }));
  });
}
// ---------- 크리스마스 트리 + D-DAY 현수막 ----------
const XMAS = { g1: '#1f8a4c', g2: '#2fae62', g3: '#46c977', gD: '#16683a', snow: '#ffffff', snowD: '#dfe9fb',
  trunk: '#8a5a35', trunkD: '#6b4226', gold: '#ffd23f', goldD: '#e0a419', red: '#ef4552', redD: '#b8283a' };
const BULBS = ['#ff5a5a', '#ffd23f', '#5bb6ff', '#ff8ad8', '#7cf0a0', '#ffffff'];

function treeTier(ctx, cx, yTop, yBot, wTop, wBot) {
  for (let y = yTop; y <= yBot; y++) {
    const t = (y - yTop) / Math.max(1, yBot - yTop);
    const w = Math.round(wTop + (wBot - wTop) * t), x = Math.round(cx - w / 2);
    px(ctx, x, y, w, 1, XMAS.g2);
    px(ctx, x, y, Math.ceil(w * 0.35), 1, XMAS.g3);           // 왼쪽 밝게
    px(ctx, x + w - Math.ceil(w * 0.22), y, Math.ceil(w * 0.22), 1, XMAS.g1); // 오른쪽 어둡게
    if (y === yBot) { // 층 아래 들쭉날쭉한 끝
      for (let i = 0; i < w; i += 4) px(ctx, x + i, y + 1, 2, 1, XMAS.gD);
    }
  }
  // 층 위 눈
  const w0 = wTop + 4;
  px(ctx, Math.round(cx - w0 / 2), yTop, w0, 1, XMAS.snow);
  for (let i = 0; i < w0; i += 3) px(ctx, Math.round(cx - w0 / 2) + i, yTop + 1, 2, 1, XMAS.snowD);
}

function drawStar(ctx, cx, cy, glow) {
  const S = ['...1...', '...1...', '1111111', '.11111.', '..111..', '.11.11.', '.1...1.'];
  S.forEach((r, y) => [...r].forEach((v, x) => { if (v === '1') px(ctx, cx - 3 + x, cy + y, 1, 1, XMAS.gold); }));
  px(ctx, cx, cy + 3, 1, 1, '#fff6c4');
  if (glow) { // 반짝임
    ctx.globalAlpha = 0.85;
    px(ctx, cx, cy - 4, 1, 2, '#fff6c4'); px(ctx, cx, cy + 9, 1, 2, '#fff6c4');
    px(ctx, cx - 6, cy + 3, 2, 1, '#fff6c4'); px(ctx, cx + 5, cy + 3, 2, 1, '#fff6c4');
    ctx.globalAlpha = 1;
  }
}

function drawPresent(ctx, x, y, w, h, c, rib) {
  px(ctx, x, y, w, h, c); px(ctx, x + w - 2, y, 2, h, shade(c, -0.25));
  px(ctx, x + Math.floor(w / 2) - 1, y, 2, h, rib); px(ctx, x, y + Math.floor(h / 2) - 1, w, 2, rib);
  px(ctx, x + Math.floor(w / 2) - 3, y - 2, 2, 2, rib); px(ctx, x + Math.floor(w / 2) + 1, y - 2, 2, 2, rib);
}

// 트리 (밑동 y = 바닥 줄 아래쪽). 전구는 시간에 따라 깜빡여요.
function drawTree(ctx, now) {
  const cx = GX + TREE_CX * CELL + 8, base = GY + (treeRow() + 1) * CELL - 2;
  // 그림자
  ctx.globalAlpha = 0.18; px(ctx, cx - 44, base - 3, 88, 5, '#1f2a4d'); ctx.globalAlpha = 1;
  // 줄기
  px(ctx, cx - 5, base - 12, 10, 12, XMAS.trunk); px(ctx, cx + 2, base - 12, 3, 12, XMAS.trunkD);
  // 잎 (아래층부터)
  treeTier(ctx, cx, base - 40, base - 12, 40, 84);
  treeTier(ctx, cx, base - 64, base - 38, 28, 66);
  treeTier(ctx, cx, base - 86, base - 62, 16, 48);
  treeTier(ctx, cx, base - 104, base - 84, 4, 30);
  // 금색 가랜드 (사선 점선)
  const garland = [[-38, -20, 34, -30], [-30, -46, 28, -54], [-20, -70, 18, -76]];
  for (const [x1, y1, x2, y2] of garland) {
    for (let i = 0; i <= 1; i += 0.04) {
      const gx = Math.round(cx + x1 + (x2 - x1) * i), gy = Math.round(base + y1 + (y2 - y1) * i + Math.sin(i * Math.PI) * 4);
      px(ctx, gx, gy, 2, 1, XMAS.gold);
    }
  }
  // 오너먼트 + 전구
  const dots = [[-30, -16], [-14, -24], [4, -18], [22, -22], [34, -16], [-22, -40], [-6, -48], [12, -44], [26, -42],
    [-16, -66], [0, -72], [14, -68], [-8, -90], [6, -94], [-30, -30], [30, -28], [-4, -32], [16, -58], [-12, -56]];
  dots.forEach(([dx, dy], i) => {
    const on = (Math.floor(now / 380) + i) % 3 !== 0;
    const c = BULBS[i % BULBS.length];
    const x = cx + dx, y = base + dy;
    if (i % 3 === 0) { px(ctx, x - 1, y - 1, 4, 4, shade(c, -0.35)); px(ctx, x - 1, y - 1, 3, 3, c); px(ctx, x - 1, y - 1, 1, 1, '#ffffff'); } // 동그란 볼
    else {
      px(ctx, x, y, 2, 2, on ? c : shade(c, -0.5));
      if (on) { ctx.globalAlpha = 0.35; px(ctx, x - 1, y - 1, 4, 4, c); ctx.globalAlpha = 1; }
    }
  });
  // 별
  drawStar(ctx, cx, base - 112, Math.floor(now / 500) % 2 === 0);
  // 선물 상자
  drawPresent(ctx, cx - 40, base - 10, 14, 10, XMAS.red, XMAS.gold);
  drawPresent(ctx, cx - 26, base - 7, 10, 7, '#3b78f0', '#ffffff');
  drawPresent(ctx, cx + 16, base - 9, 12, 9, XMAS.gold, XMAS.red);
  drawPresent(ctx, cx + 29, base - 6, 9, 6, '#7a54d6', '#ffd8f0');
}

// D-DAY 현수막: 빨간 리본 위에 금색 글씨. D-DAY 당일엔 글씨가 반짝여요.
function drawBanner(ctx, label, now) {
  if (!label) return;
  const cx = GX + TREE_CX * CELL + 8, top = GY + (treeRow() + 1) * CELL + 6;
  const k = 4, tw = textWidth(label, k), bw = tw + 28, bh = 7 * k + 10, x = Math.round(cx - bw / 2);
  // 리본 꼬리
  for (const [sx, outer] of [[x - 10, x - 10], [x + bw + 2, x + bw + 8]]) {
    px(ctx, sx, top + 6, 8, bh - 4, XMAS.redD);
    px(ctx, outer, top + 6 + Math.floor((bh - 4) / 2) - 2, 2, 4, C.page); // 꼬리 끝 V 홈
  }
  px(ctx, x, top, bw, bh, XMAS.red);
  px(ctx, x, top, bw, 2, '#ff7b84'); px(ctx, x, top + bh - 2, bw, 2, XMAS.redD);
  // 금색 테두리 점
  for (let i = 4; i < bw - 3; i += 6) { px(ctx, x + i, top + 3, 2, 1, XMAS.gold); px(ctx, x + i, top + bh - 4, 2, 1, XMAS.gold); }
  const big = label === 'D-DAY';
  const col = big && Math.floor(now / 300) % 2 ? '#ffffff' : XMAS.gold;
  drawPixelText(ctx, label, Math.round(cx - tw / 2) + 1, top + 6, k, XMAS.redD);
  drawPixelText(ctx, label, Math.round(cx - tw / 2), top + 5, k, col);
  // 날짜
  const sub = [...new Set([EXHIBIT.from, EXHIBIT.until].filter(Boolean).map((d) => d.slice(5).replace('-', '.')))].join(' - ');
  const sw = textWidth(sub, 1);
  drawPixelText(ctx, sub, Math.round(cx - sw / 2), top + bh + 4, 1, C.navy);
  // 반짝이 별 몇 개
  for (let i = 0; i < 6; i++) {
    if ((Math.floor(now / 250) + i * 2) % 5) continue;
    const sx = x - 14 + ((i * 53) % (bw + 28)), sy = top - 4 + ((i * 29) % (bh + 10));
    px(ctx, sx, sy, 1, 3, XMAS.gold); px(ctx, sx - 1, sy + 1, 3, 1, XMAS.gold);
  }
}

// 벽 위 전구 줄 (깜빡임)
function drawWallLights(ctx, now) {
  const y0 = 43, x0 = GX + 2, x1 = GX + COLS * CELL - 2;
  for (let x = x0, i = 0; x < x1; x += 12, i++) {
    const sag = Math.round(Math.sin(((x - x0) % 48) / 48 * Math.PI) * 3);
    px(ctx, x, y0 + sag, 12, 1, '#55607f');
    const on = (Math.floor(now / 450) + i) % 2 === 0;
    const c = BULBS[i % 5];
    px(ctx, x + 5, y0 + sag + 1, 3, 3, on ? c : shade(c, -0.45));
    if (on) { ctx.globalAlpha = 0.3; px(ctx, x + 4, y0 + sag, 5, 5, c); ctx.globalAlpha = 1; }
  }
}

// 창밖에 내리는 눈
const WINDOWS = [[GX + 44, 48, 120, 30], [GX + 478, 48, 64, 30]];
function drawWindowSnow(ctx, now) {
  for (const [wx, wy, ww, wh] of WINDOWS) {
    for (let i = 0; i < Math.round(ww / 5); i++) {
      const sp = 0.008 + ((i * 37) % 10) / 1500;
      const x = wx + ((i * 73 + Math.floor(Math.sin(now / 900 + i) * 3)) % ww + ww) % ww;
      const y = wy + ((i * 41 + now * sp) % wh);
      px(ctx, Math.round(x), Math.round(y), 1, 1, '#ffffff');
    }
  }
}

function paintStatic(ctx, sky) {
  ctx.clearRect(0, 0, W, H);
  // 제목 표시줄
  px(ctx, 0, 0, W, 14, C.blue);
  px(ctx, 0, 13, W, 1, C.blueD);
  // W 아이콘
  px(ctx, 4, 2, 10, 10, '#ffffff'); px(ctx, 5, 3, 8, 8, C.blueD);
  const wIcon = ['1...1', '1...1', '1.1.1', '11.11', '1...1'];
  wIcon.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '1') px(ctx, 7 + x, 4 + y + 1, 1, 1, '#ffffff'); }));
  // 창 버튼
  px(ctx, W - 40, 6, 6, 1, '#ffffff');
  px(ctx, W - 26, 4, 6, 6, '#ffffff'); px(ctx, W - 25, 5, 4, 4, C.blue);
  for (let i = 0; i < 6; i++) { px(ctx, W - 12 + i, 4 + i, 1, 1, '#ffffff'); px(ctx, W - 7 - i, 4 + i, 1, 1, '#ffffff'); }

  // 리본
  px(ctx, 0, 14, W, 20, C.ribbon);
  px(ctx, 0, 33, W, 1, C.line);
  // 리본 아이콘 (B I U, 정렬)
  const ix = 228, iy = 24;
  px(ctx, ix, iy, 30, 7, '#ffffff'); px(ctx, ix, iy, 30, 1, C.line);
  px(ctx, ix + 34, iy, 10, 7, '#ffffff');
  const B = ['11.', '1.1', '11.', '1.1', '11.'], I = ['111', '.1.', '.1.', '.1.', '111'], U = ['1.1', '1.1', '1.1', '1.1', '111'];
  [B, I, U].forEach((g, k) => g.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '1') px(ctx, 52 * 0 + 290 + k * 7 + x, iy + 1 + y, 1, 1, '#3b4466'); })));
  for (let k = 0; k < 3; k++) {
    const ax = 318 + k * 12;
    px(ctx, ax - 1, iy - 1, 11, 9, k === 0 ? '#dce6fb' : C.ribbon);
    for (let l = 0; l < 4; l++) px(ctx, ax + (k === 1 ? 1 : k === 2 ? 3 - (l % 2) * 2 : 0), iy + l * 2, l % 2 ? 6 : 9, 1, '#3b4466');
  }

  // 가로 눈금자
  px(ctx, 0, 34, W, 6, C.ruler);
  for (let x = GX; x < W - 8; x += 4) px(ctx, x, (x - GX) % CELL === 0 ? 35 : 37, 1, (x - GX) % CELL === 0 ? 4 : 2, C.rulerTick);
  px(ctx, 0, 39, W, 1, C.line);
  // 세로 눈금자
  px(ctx, 0, 40, 6, H - 50, C.ruler);
  for (let y = 44; y < H - 14; y += 4) px(ctx, (y - GY) % CELL === 0 ? 1 : 3, y, (y - GY) % CELL === 0 ? 4 : 2, 1, C.rulerTick);
  px(ctx, 6, 40, 1, H - 50, C.line);

  // 페이지
  px(ctx, 7, 40, W - 7, H - 50, '#eef2f9');
  px(ctx, GX, 40, COLS * CELL, GY + ROWS * CELL + 8 - 40, C.page);

  // 뒷벽
  px(ctx, GX, 40, COLS * CELL, 48, C.wall);
  px(ctx, GX, 40, COLS * CELL, 2, C.wallL);
  px(ctx, GX, 84, COLS * CELL, 4, C.wallD);
  drawWindow(ctx, ...WINDOWS[0], sky);
  drawBinders(ctx, GX + 188, 52);
  drawWindow(ctx, ...WINDOWS[1], sky);
  // 시계
  px(ctx, GX + 284, 50, 14, 14, '#ffffff'); px(ctx, GX + 285, 51, 12, 12, '#f3f6fc');
  px(ctx, GX + 290, 53, 2, 5, C.navy); px(ctx, GX + 291, 57, 4, 1, C.navy);
  // 게시판 (방명록 공지)
  px(ctx, GX + 312, 48, 56, 30, '#c99a62'); px(ctx, GX + 314, 50, 52, 26, '#e6c28f');
  [[305, 53, C.yellow], [319, 55, '#ffffff'], [333, 52, '#9ad1ff'], [310, 64, '#ffffff'], [326, 65, C.coral]].forEach(([x, y, c]) => {
    px(ctx, GX + 12 + x, y, 11, 9, c); px(ctx, GX + 12 + x + 3, y - 1, 2, 2, '#ef4552');
  });
  // 퇴근 문
  drawDoor(ctx, GX + DOOR.cx * CELL, 40 + 4 + 12);

  // 바닥 격자
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = GX + c * CELL, y = GY + r * CELL;
    for (let i = 0; i < CELL; i += 2) { px(ctx, x + i, y, 1, 1, C.grid2); px(ctx, x, y + i, 1, 1, C.grid2); }
  }
  // 문 앞 매트
  px(ctx, GX + DOOR.cx * CELL - 4, GY, 40, 6, '#9db7f5');
  px(ctx, GX + DOOR.cx * CELL - 3, GY + 1, 38, 4, '#b9ccf8');

  for (const g of GOALS) dashedSquare(ctx, GX + g.cx * CELL, GY + g.cy * CELL, g.c);
  // 페이지 아래 여백
  px(ctx, GX, GY + ROWS * CELL, COLS * CELL, 8, C.page);

  // 상태 표시줄
  px(ctx, 0, H - 10, W, 10, C.ruler);
  px(ctx, 0, H - 10, W, 1, C.line);
  // 확대 슬라이더
  px(ctx, W - 82, H - 5, 40, 1, '#8090b0'); px(ctx, W - 64, H - 8, 3, 6, C.blue);
  px(ctx, W - 88, H - 5, 3, 1, '#596789'); px(ctx, W - 38, H - 5, 3, 1, '#596789'); px(ctx, W - 37, H - 6, 1, 3, '#596789');
}

function drawProp(ctx, p) {
  const x = GX + p.cx * CELL, y = GY + p.cy * CELL;
  if (p.kind === 'cab') drawCabinet(ctx, x, y - 24);
  else if (p.kind === 'plant') drawPlant(ctx, x, y);
  else if (p.kind === 'paper') drawPaperStack(ctx, x, y, 7);
  else if (p.kind === 'doc') drawDocBlock(ctx, x, y + 1, p.color);
}

// ---------- 장면 ----------
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const rand = (a, b) => a + Math.random() * (b - a);
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Scene {
  constructor({ canvas, layer, onTapEntry, maxOnScreen = 36 }) {
    this.canvas = canvas; this.layer = layer; this.onTapEntry = onTapEntry;
    this.maxOnScreen = maxOnScreen;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas'); this.bg.width = W; this.bg.height = H;
    this.skyKey = '';
    this.blocked = new Set(PROPS.map((p) => `${p.cx},${p.cy}`));
    this.dday = '';
    this.actors = new Map();   // id -> actor (화면에 있는 사람)
    this.entries = new Map();  // id -> entry (전체)
    this.queue = [];           // 화면 밖에서 출근을 기다리는 id
    this.scale = 1;
    this.lastBubble = 0; this.lastGroup = performance.now(); this.lastRotate = performance.now();
    this.sparkles = [];
    this.groupDir = null; this.groupUntil = 0;

    // 장면이 들어갈 상자 (전체 화면, 또는 부스 모드에서 영상 옆 영역)
    this.host = canvas.parentElement;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(this.host);
    layer.addEventListener('pointerdown', (e) => this.handleTap(e));
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const vw = this.host.clientWidth || window.innerWidth, vh = this.host.clientHeight || window.innerHeight;
    // 화면이 세로로 길면 사무실도 세로로 늘려서(바닥 줄 추가) 위아래 여백 없이 채워요
    const wantH = Math.max(H_MIN, Math.min(H_MAX, Math.round(W * vh / vw)));
    if (wantH !== H) this.setHeight(wantH);
    // 남는 여백 없이 들어갈 수 있는 만큼 최대로 키워요
    const s = Math.min(vw / W, vh / H);
    this.scale = s;
    const cw = Math.round(W * s), ch = Math.round(H * s);
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cw * ratio); this.canvas.height = Math.round(ch * ratio);
    for (const el of [this.canvas, this.layer]) {
      el.style.width = cw + 'px'; el.style.height = ch + 'px';
      el.style.left = Math.round((vw - cw) / 2) + 'px'; el.style.top = Math.round((vh - ch) / 2) + 'px';
    }
    this.layer.style.setProperty('--s', s);
    this.layer.style.setProperty('--lh', H);
    this.pxRatio = ratio;
  }

  setHeight(h) {
    H = h;
    ROWS = Math.floor((H - GY - 18) / CELL);
    PROPS = buildProps();
    this.blocked = new Set(PROPS.map((p) => `${p.cx},${p.cy}`));
    this.bg.height = H;
    this.skyKey = ''; // 배경 다시 그리기
    // 바뀐 바닥 밖이나 막힌 칸에 서 있던 사람은 빈 칸으로 옮겨요
    for (const a of this.actors.values()) {
      if (a.cy < ROWS && !this.blocked.has(`${a.cx},${a.cy}`)) continue;
      const f = this.freeCell();
      if (f) { [a.cx, a.cy] = f; a.tx = a.cx; a.ty = a.cy; a.x = a.cx; a.y = a.cy; a.path = []; a.moving = false; if (a.state === 'walk') a.state = 'idle'; }
    }
  }

  // ----- 데이터 -----
  setEntries(list, { announce = false } = {}) {
    const ids = new Set(list.map((e) => e.id));
    for (const id of [...this.entries.keys()]) if (!ids.has(id)) this.removeEntry(id);
    const fresh = [];
    for (const e of list) if (!this.entries.has(e.id)) { this.entries.set(e.id, e); fresh.push(e); }
    if (!announce) {
      // 처음 불러올 때: 최근 사람부터 바로 자리에 배치
      const sorted = [...fresh].sort((a, b) => b.at - a.at);
      sorted.forEach((e, i) => { if (i < this.maxOnScreen) this.spawn(e, 'place'); else this.queue.push(e.id); });
    } else {
      for (const e of fresh) {
        if (this.actors.size >= this.maxOnScreen) this.sendOneHome();
        this.spawn(e, 'arrive');
      }
    }
  }

  removeEntry(id) {
    this.entries.delete(id);
    this.queue = this.queue.filter((q) => q !== id);
    const a = this.actors.get(id);
    if (a) { a.label.remove(); a.bubble.remove(); this.actors.delete(id); }
  }

  // 오프라인으로 먼저 보여 준 글이 서버에 올라가면, 같은 캐릭터를 새 id 로 바꿔 줘요 (다시 등장하지 않게)
  rekey(oldId, entry) {
    if (!this.entries.has(oldId)) return;
    this.entries.delete(oldId); this.entries.set(entry.id, entry);
    this.queue = this.queue.map((q) => (q === oldId ? entry.id : q));
    const a = this.actors.get(oldId);
    if (a) { this.actors.delete(oldId); a.id = entry.id; a.entry = entry; a.label.textContent = entry.name; this.actors.set(entry.id, a); }
  }

  get count() { return this.entries.size; }
  get onScreen() { return this.actors.size; }

  occupied(cx, cy, except) {
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
    if (this.blocked.has(`${cx},${cy}`)) return true;
    for (const a of this.actors.values()) {
      if (a === except || a.state === 'gone') continue;
      if ((a.cx === cx && a.cy === cy) || (a.tx === cx && a.ty === cy)) return true;
    }
    return false;
  }

  freeCell() {
    for (let i = 0; i < 400; i++) {
      const cx = Math.floor(Math.random() * COLS), cy = 1 + Math.floor(Math.random() * (ROWS - 1));
      if (!this.occupied(cx, cy)) return [cx, cy];
    }
    return null;
  }

  spawn(entry, how) {
    if (this.actors.has(entry.id)) return;
    let cx, cy;
    if (how === 'place') { const f = this.freeCell(); if (!f) { this.queue.push(entry.id); return; } [cx, cy] = f; }
    else { cx = DOOR.cx; cy = DOOR.cy; }
    const label = document.createElement('div'); label.className = 'name-tag'; label.textContent = entry.name;
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    this.layer.append(label, bubble);
    const a = {
      id: entry.id, entry, cx, cy, tx: cx, ty: cy, x: cx, y: cy, t0: 0, path: [],
      state: how === 'place' ? 'idle' : 'enter', wait: rand(400, 3000), frame: 0,
      blinkAt: performance.now() + rand(1500, 5000), alpha: how === 'place' ? 1 : 0,
      enterT: performance.now(), label, bubble, bubbleUntil: 0, glowUntil: 0, flip: false,
    };
    if (how === 'arrive') {
      a.glowUntil = performance.now() + 15000;
      a.y = cy - 1;
      this.showBubble(a, entry.msg, 9000, true);
      this.sparkle(cx, cy);
      window.dispatchEvent(new CustomEvent('guest-arrived', { detail: entry }));
    }
    this.actors.set(entry.id, a);
  }

  sendOneHome() {
    const cand = [...this.actors.values()].filter((a) => a.state === 'idle' && performance.now() > a.glowUntil);
    const a = cand.sort((p, q) => p.entry.at - q.entry.at)[0] || null;
    if (a) this.goHome(a);
  }

  goHome(a) {
    const path = this.findPath(a, DOOR.cx, DOOR.cy, true);
    if (path) { a.path = path; a.state = 'exit'; }
  }

  // ----- 길 찾기 (BFS, 상하좌우 한 칸씩) -----
  findPath(a, gx, gy, allowGoalOccupied = false) {
    const key = (x, y) => y * COLS + x;
    const prev = new Map([[key(a.cx, a.cy), -1]]);
    const q = [[a.cx, a.cy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === gx && y === gy) {
        const out = []; let k = key(x, y);
        while (k !== key(a.cx, a.cy)) { out.unshift([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
        return out;
      }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (prev.has(nk)) continue;
        const isGoal = nx === gx && ny === gy;
        if (this.occupied(nx, ny, a) && !(isGoal && allowGoalOccupied && !this.blocked.has(`${nx},${ny}`) && nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS)) continue;
        prev.set(nk, key(x, y)); q.push([nx, ny]);
      }
      if (prev.size > COLS * ROWS) break;
    }
    return null;
  }

  stepTo(a, nx, ny, now) {
    if (nx !== a.cx) a.flip = nx < a.cx;
    a.tx = nx; a.ty = ny; a.t0 = now; a.state = a.state === 'exit' ? 'exit' : 'walk';
    a.moving = true;
  }

  // ----- 말풍선 -----
  showBubble(a, text, ms = 6000, full = false) {
    const t = full ? text : (text.length > 30 ? text.slice(0, 29) + '…' : text);
    a.bubble.textContent = t;
    a.bubble.classList.add('on');
    a.bubbleUntil = performance.now() + ms;
  }

  sparkle(cx, cy) {
    const now = performance.now();
    for (let i = 0; i < 14; i++) this.sparkles.push({ x: GX + cx * CELL + 8, y: GY + cy * CELL - 8, vx: rand(-0.06, 0.06), vy: rand(-0.09, -0.02), t0: now, life: rand(600, 1200), c: choice([C.yellow, '#ffffff', C.blueL]) });
  }

  // 게임 규칙 오마주: 모두 함께 한 칸 이동
  groupMove(now) {
    const [dx, dy] = choice(DIRS);
    this.groupDir = [dx, dy]; this.groupUntil = now + 2600;
    window.dispatchEvent(new CustomEvent('group-move', { detail: { dx, dy } }));
    const list = [...this.actors.values()].filter((a) => a.state === 'idle');
    list.sort((p, q) => (q.cx * dx + q.cy * dy) - (p.cx * dx + p.cy * dy)); // 앞에 있는 사람부터
    setTimeout(() => {
      const t = performance.now();
      for (const a of list) {
        if (a.state !== 'idle') continue;
        const nx = a.cx + dx, ny = a.cy + dy;
        if (!this.occupied(nx, ny, a)) this.stepTo(a, nx, ny, t);
        else a.bump = t; // 막힌 칸이면 제자리에서 움찔
        a.wait = rand(1500, 4000);
      }
    }, 700);
  }

  // ----- 터치 -----
  handleTap(e) {
    const r = this.layer.getBoundingClientRect();
    const lx = (e.clientX - r.left) / this.scale, ly = (e.clientY - r.top) / this.scale;
    let best = null;
    for (const a of this.actors.values()) {
      const sx = GX + a.x * CELL, sy = GY + a.y * CELL + CELL - SPRITE_H - 2;
      if (lx >= sx - 3 && lx <= sx + SPRITE_W + 3 && ly >= sy - 3 && ly <= sy + SPRITE_H + 4) {
        if (!best || a.y > best.y) best = a;
      }
    }
    if (best) { best.tapAt = performance.now(); this.onTapEntry?.(best.entry); }
  }

  // ----- 메인 루프 -----
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const d = new Date(), sky = skyFor(d);
    this.dday = ddayLabel(d);
    if (sky.key !== this.skyKey) { this.skyKey = sky.key; paintStatic(this.bg.getContext('2d'), sky); }
    this.update(now);
    this.draw(now);
  }

  update(now) {
    // 가끔 "모두 함께 한 칸"
    if (now - this.lastGroup > 42000 && this.actors.size >= 2) { this.lastGroup = now; this.groupMove(now); }
    // 화면에 다 못 들어온 사람은 돌아가며 출근/퇴근
    if (this.queue.length && now - this.lastRotate > 14000) {
      this.lastRotate = now;
      if (this.actors.size >= this.maxOnScreen) this.sendOneHome();
      else { const id = this.queue.shift(); const e = this.entries.get(id); if (e) this.spawn(e, 'enter'); }
    }
    // 말풍선 돌리기
    const bubbling = [...this.actors.values()].filter((a) => a.bubbleUntil > now).length;
    if (now - this.lastBubble > 3500 && bubbling < 3 && this.actors.size) {
      this.lastBubble = now;
      const cand = [...this.actors.values()].filter((a) => a.bubbleUntil < now && a.state !== 'gone');
      if (cand.length) { const a = choice(cand); this.showBubble(a, a.entry.msg); }
    }

    for (const a of this.actors.values()) {
      if (a.bubbleUntil && now > a.bubbleUntil) { a.bubble.classList.remove('on'); a.bubbleUntil = 0; }
      if (now > a.blinkAt) a.blinkAt = now + rand(2500, 6000);

      if (a.state === 'enter') { // 문에서 나와 한 칸 내려오기
        const t = Math.min(1, (now - a.enterT) / 700);
        a.alpha = t; a.y = a.cy - 1 + t;
        if (t >= 1) { a.state = 'idle'; a.y = a.cy; a.wait = rand(1200, 2500); }
        continue;
      }
      if (a.state === 'leave') { // 문 안으로 들어가기
        const t = Math.min(1, (now - a.enterT) / 700);
        a.alpha = 1 - t; a.y = a.cy - t;
        if (t >= 1) {
          a.state = 'gone'; a.label.remove(); a.bubble.remove(); this.actors.delete(a.id);
          if (this.entries.has(a.id)) this.queue.push(a.id);
          const next = this.queue.shift();
          const e = next && this.entries.get(next);
          if (e && next !== a.id) setTimeout(() => this.spawn(e, 'enter'), 1200); else if (next) this.queue.unshift(next);
        }
        continue;
      }
      if (a.moving) {
        const t = Math.min(1, (now - a.t0) / STEP_MS);
        a.x = a.cx + (a.tx - a.cx) * t; a.y = a.cy + (a.ty - a.cy) * t;
        a.frame = t < 0.5 ? 1 : 2;
        if (t >= 1) {
          a.cx = a.tx; a.cy = a.ty; a.x = a.cx; a.y = a.cy; a.moving = false; a.frame = 0;
          if (a.path.length) {
            const [nx, ny] = a.path.shift();
            if (!this.occupied(nx, ny, a) || (a.state === 'exit' && nx === DOOR.cx && ny === DOOR.cy && !this.blockedByOther(a, nx, ny))) this.stepTo(a, nx, ny, now);
            else { a.path = []; if (a.state === 'exit') a.retry = now + 1500; else a.state = 'idle'; a.wait = rand(800, 2000); }
          } else if (a.state === 'exit') {
            if (a.cx === DOOR.cx && a.cy === DOOR.cy) { a.state = 'leave'; a.enterT = now; }
            else a.retry = now + 1000;
          } else { a.state = 'idle'; a.wait = rand(1500, 6000); }
        }
        continue;
      }
      if (a.state === 'exit') { // 길이 막혔으면 다시 찾기
        if (!a.retry || now > a.retry) {
          a.retry = now + 1500;
          const p = this.findPath(a, DOOR.cx, DOOR.cy, true);
          if (p && p.length) { a.path = p; const [nx, ny] = a.path.shift(); if (!this.occupied(nx, ny, a)) this.stepTo(a, nx, ny, now); }
          else if (a.cx === DOOR.cx && a.cy === DOOR.cy) { a.state = 'leave'; a.enterT = now; }
        }
        continue;
      }
      if (a.state === 'idle') {
        a.wait -= 16;
        if (a.wait > 0) continue;
        const roll = Math.random();
        if (roll < 0.7) { // 한 칸만 옮기기
          const opts = DIRS.map(([dx, dy]) => [a.cx + dx, a.cy + dy]).filter(([x, y]) => !this.occupied(x, y, a) && y > 0);
          if (opts.length) { const [nx, ny] = choice(opts); this.stepTo(a, nx, ny, now); }
          a.wait = rand(1500, 6000);
        } else {
          const nx = Math.max(0, Math.min(COLS - 1, a.cx + Math.round(rand(-6, 6))));
          const ny = Math.max(1, Math.min(ROWS - 1, a.cy + Math.round(rand(-4, 4))));
          const p = !this.occupied(nx, ny, a) && this.findPath(a, nx, ny);
          if (p && p.length) { a.path = p; const [sx, sy] = a.path.shift(); this.stepTo(a, sx, sy, now); }
          a.wait = rand(2000, 6000);
        }
      }
    }
    // 반짝이
    this.sparkles = this.sparkles.filter((s) => now - s.t0 < s.life);
  }

  blockedByOther(a, x, y) {
    for (const b of this.actors.values()) if (b !== a && b.state !== 'gone' && ((b.cx === x && b.cy === y) || (b.tx === x && b.ty === y))) return true;
    return false;
  }

  draw(now) {
    const ctx = this.ctx;
    const k = this.scale * this.pxRatio;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bg, 0, 0);
    drawWindowSnow(ctx, now);
    drawWallLights(ctx, now);

    // 모두 함께 한 칸: 바닥 화살표 표시
    if (this.groupDir && now < this.groupUntil) {
      const [dx, dy] = this.groupDir;
      const blink = Math.floor(now / 200) % 2;
      ctx.globalAlpha = blink ? 0.22 : 0.12;
      for (let r = 0; r < ROWS; r += 3) for (let c = 1; c < COLS; c += 4) {
        const x = GX + c * CELL + 4, y = GY + r * CELL + 6;
        px(ctx, x, y + 1, 7, 2, C.blue);
        if (dx) { px(ctx, dx > 0 ? x + 6 : x - 2, y - 1, 3, 6, C.blue); }
        if (dy) { px(ctx, x + 2, dy > 0 ? y + 3 : y - 3, 3, 3, C.blue); }
      }
      ctx.globalAlpha = 1;
    }

    // 깊이 순서대로 (아래쪽이 앞)
    const items = [];
    for (const p of PROPS) {
      if (p.kind === 'block') continue;
      if (p.kind === 'tree') items.push({ y: p.cy + 0.01, draw: () => drawTree(ctx, now) });
      else if (p.kind === 'banner') items.push({ y: p.cy + 0.01, draw: () => drawBanner(ctx, this.dday, now) });
      else items.push({ y: p.cy + 0.01, draw: () => drawProp(ctx, p) });
    }
    for (const a of this.actors.values()) items.push({ y: a.y, draw: () => this.drawActor(ctx, a, now) });
    items.sort((p, q) => p.y - q.y);
    for (const it of items) it.draw();

    for (const s of this.sparkles) {
      const t = now - s.t0;
      ctx.globalAlpha = 1 - t / s.life;
      px(ctx, Math.round(s.x + s.vx * t), Math.round(s.y + s.vy * t), 2, 2, s.c);
    }
    ctx.globalAlpha = 1;

    // 이름표 / 말풍선 위치 (DOM)
    for (const a of this.actors.values()) {
      const cx = (GX + a.x * CELL + 8) * this.scale;
      const top = (GY + a.y * CELL + CELL - SPRITE_H - 2) * this.scale;
      const foot = (GY + a.y * CELL + CELL + 1) * this.scale;
      a.label.style.transform = `translate(${cx}px, ${foot}px) translateX(-50%)`;
      a.label.style.opacity = a.alpha;
      a.label.classList.toggle('new', now < a.glowUntil);
      a.bubble.style.transform = `translate(${cx}px, ${top}px) translate(-50%, -100%)`;
      a.bubble.style.zIndex = String(10 + Math.round(a.y * 10));
    }
  }

  drawActor(ctx, a, now) {
    // 외곽선 여백(1px)만큼 왼쪽 위로 당겨서, 발이 칸 바닥에 오도록
    const sx = Math.round(GX + a.x * CELL) - 1, base = GY + a.y * CELL + CELL - SPRITE_H - 1;
    let sy = Math.round(base);
    if (a.frame) sy -= 1;
    if (a.bump && now - a.bump < 300) sy -= (now - a.bump < 150 ? 1 : 0);
    if (a.tapAt && now - a.tapAt < 400) sy -= Math.round(Math.sin(((now - a.tapAt) / 400) * Math.PI) * 4);
    ctx.globalAlpha = a.alpha;
    // 그림자
    px(ctx, sx + 2, Math.round(GY + a.y * CELL + CELL - 3), 14, 3, 'rgba(31,42,77,0.16)');
    // 새로 온 사람: 바닥 빛
    if (now < a.glowUntil) {
      const pulse = 0.25 + 0.2 * Math.sin(now / 200);
      ctx.globalAlpha = a.alpha * pulse;
      px(ctx, sx - 1, Math.round(GY + a.y * CELL + 1), 18, 14, C.yellow);
      ctx.globalAlpha = a.alpha;
    }
    let expr = 'normal';
    if (now > a.blinkAt - 140) expr = 'blink';
    if (a.bubbleUntil > now || now < a.glowUntil) expr = 'happy';
    if (a.bump && now - a.bump < 600) expr = 'oops';
    const spr = getSprite(a.entry.look || {}, expr, a.frame);
    if (a.flip) { ctx.save(); ctx.translate(sx + SPRITE_W, sy); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
    else ctx.drawImage(spr, sx, sy);
    ctx.globalAlpha = 1;
  }
}

export const LAYOUT = { W, get H() { return H; }, GX, GY, CELL, COLS, get ROWS() { return ROWS; } };
