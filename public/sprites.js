// 도트 캐릭터: 부품 정의 + 그리기
// 캐릭터 한 명 = 16 x 22 픽셀. 머리(헤어/얼굴/액세서리) + 몸(의상) + 신발.
// 캐릭터 스타일 가이드의 "1칸 x 1칸 바닥, 약 1.2칸 높이" 비율을 도트로 옮겼어요.

// 그림은 16 x 22 칸에 그리고, 바깥에 1픽셀 외곽선을 둘러 18 x 24 캔버스로 만들어요.
const ART_W = 16, ART_H = 22, PAD = 1;
export const SPRITE_W = ART_W + PAD * 2;
export const SPRITE_H = ART_H + PAD * 2;
export const SPRITE_PAD = PAD;
const HEAD_Y = 2;   // 위 2줄은 고양이, 리본 같은 액세서리 자리
const BODY_Y = 14;

// ---------- 색 도우미 ----------
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function shade(hex, amt) { // amt < 0 어둡게, > 0 밝게
  const c = hexToRgb(hex);
  return rgbToHex(c.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
}

// ---------- 부품 ----------
export const HAIR_STYLES = [
  { id: 'part', name: '단정 가르마', clip: true, rows: [
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '.HHHHHHHHHDHHHH.',
    '.HHHHHHHHHDHHHH.',
    '.HHHHHHHHD.HHHH.',
    '.HHHHHHHD...HHH.',
    '.HHHHHD......HH.',
    '.HH...........H.',
    '.H............H.',
    '.D............D.',
  ] },
  { id: 'crop', name: '크롭컷', rows: [
    '..HHHHHHHHHHHH..',
    '.HHHHHHHHHHHHHH.',
    '.HLHHLHHLHHLHHH.',
    '.HHHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHHH.',
    '.DHDHDHDHDHDHDD.',
    '.D............D.',
  ] },
  { id: 'twoblock', name: '투블럭', rows: [
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '.HHHHHHHHHHHHLH.',
    '.DHHHHHHHHHHHHD.',
    '.DHHHHHHHHHHHHD.',
    '.DDHHHHD.HHHHDD.',
    '.DD..........DD.',
    '.D............D.',
  ] },
  { id: 'slick', name: '올백', rows: [
    '...HHHHHHHHHH...',
    '..HLHHLHHLHHLH..',
    '.HHLHHLHHLHHLHH.',
    '.HHHHHHHHHHHHHH.',
    '.DHHHHHHHHHHHHD.',
    '.D............D.',
    '.D............D.',
  ] },
  { id: 'short', name: '숏컷', clip: true, rows: [
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '.HHHHHHHHHHHLHH.',
    '.HHHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHHH.',
    '.HHHHHHHHHDD.HH.',
    '.HHHHHHD.....HH.',
    '.HD...........H.',
  ] },
  { id: 'bob', name: '보브', clip: true, rows: [
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '.HHHHHHHHHHLHHH.',
    'HHHHHHHHHHHHHHHH',
    'HHHHHHHHHHHHHHHH',
    'HHHDHHHHHHHHDHHH',
    'HHH..........HHH',
    'HH............HH',
    'HH............HH',
    'HH............HH',
    'HD............DH',
    'DD............DD',
  ] },
  { id: 'blunt', name: '단발', clip: true, rows: [
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '.HHHHHHHHHHHLHH.',
    'HHHHHHHHHHHHHHHH',
    'HHHHHHHHHHHHHHHH',
    'HHHHHHHHHHHHHHHH',
    'HHDDDDDDDDDDDDHH',
    'HH............HH',
    'HH............HH',
    'HH............HH',
    'HH............HH',
    'DD............DD',
  ] },
  { id: 'curly', name: '곱슬', rows: [
    '..HHH.HHHH.HHH..',
    '.HHLHHHLHHHLHHH.',
    'HHHHHHHHHHHHHHHH',
    'HLHHLHHLHHLHHLHH',
    'HHHHHHHHHHHHHHHH',
    'HHDHHDHHDHHDHHDH',
    'HHD..........DHH',
    'HH............HH',
    'HD............DH',
    'D..............D',
  ] },
  { id: 'pony', name: '포니테일', clip: true, rows: [
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHHH.',
    '.HHHHHHHHHHHLHDD',
    '.HHHHHHHHHHHHHDH',
    '.HHHHHHHHHHHHHHH',
    '.HHHHDHHHHHDHHHH',
    '.HH..........HHH',
    '.H............HH',
    '.H.............H',
    '...............H',
    '...............D',
  ] },
];

export const HAIR_COLORS = [
  { id: 'brown', name: '브라운', c: '#7a4526' },
  { id: 'dark', name: '다크 브라운', c: '#4a2c1d' },
  { id: 'charcoal', name: '차콜', c: '#2e2f38' },
  { id: 'blonde', name: '블론드', c: '#e0ad52' },
  { id: 'ash', name: '애쉬', c: '#8d93a3' },
  { id: 'pink', name: '핑크', c: '#f28fb0' },
  { id: 'blue', name: '블루', c: '#4f78e0' },
];

export const SKINS = [
  { id: 'light', name: '밝은', c: '#ffdcbd' },
  { id: 'mid', name: '중간', c: '#f4c29a' },
  { id: 'tan', name: '태닝', c: '#d79e74' },
  { id: 'deep', name: '진한', c: '#a46d4a' },
];

// 액세서리: dy 는 머리 기준 시작 줄 (음수면 머리 위)
export const ACCESSORIES = [
  { id: 'none', name: '없음', dy: 0, rows: [], pal: {} },
  { id: 'glasses', name: '안경', dy: 7, rows: [
    '..GGGG....GGGG..',
    '..Gg.GGGGGG.gG..',
    '..Gg.G....G.gG..',
    '..GGGG....GGGG..',
  ], pal: { G: '#262833', g: '#e4eeff' } },
  { id: 'headphone', name: '헤드폰', dy: -1, rows: [
    '....BBBBBBBB....',
    '...B........B...',
    '..B..........B..',
    '.B............B.',
    '.B............B.',
    '.B............B.',
    'bBB..........BBb',
    'bBB..........BBb',
    'bBB..........BBb',
    '.bb..........bb.',
  ], pal: { B: '#3d78f0', b: '#24489b' } },
  { id: 'cap', name: '캡 모자', dy: -1, rows: [
    '....PPPPPPPP....',
    '...PPPPWWPPPP...',
    '..PPPPPWWPPPPP..',
    '.PPPPPPPPPPPPPP.',
    '.PPPPPPPPPPPPPP.',
    'pppppppppppppppp',
    '.pppppppppppppp.',
  ], pal: { P: '#e3cfa6', p: '#b89c6c', W: '#3d6fe0' } },
  { id: 'postit', name: '포스트잇', dy: -1, rows: [
    '.........YYYY...',
    '........YYYYYY..',
    '........YyyyYY..',
    '.........YYYYy..',
  ], pal: { Y: '#ffd84a', y: '#c9a227' } },
  { id: 'cat', name: '고양이', dy: -2, rows: [
    '...O...O........',
    '...OOOOO........',
    '..OKOOOKO.......',
    '..OOOpOOOO......',
  ], pal: { O: '#ffffff', K: '#262833', p: '#f5a3b5' } },
  { id: 'ribbon', name: '리본', dy: 0, rows: [
    '..........RR.RR.',
    '..........RRrRR.',
    '..........RR.RR.',
  ], pal: { R: '#ef4552', r: '#a82633' } },
];

const BODY_TEMPLATES = {
  suit: [
    // J 겉옷, j 겉옷 그늘, W 셔츠, T 넥타이, N 목걸이 줄, I/i 사원증, b 문서 모서리 표식, S 손
    '..JJJJWTTWJJJJ..',
    '.JJJJjWTTWjJJJJ.',
    '.JJJJJNTTNJJJJJ.',
    '.JbJJJNIINJJJbJ.',
    '.SbbJJJIiJJJbbS.',
    '.SJJJJJJJJJJJJS.',
    '..PPPPP..PPPPP..',
    '..KKKKK..KKKKK..',
  ],
  hoodie: [
    '..JJJJjjjjJJJJ..',
    '.JJJJjWWWWjJJJJ.',
    '.JJJJJTNNTJJJJJ.',
    '.JJJJJTIITJJJJJ.',
    '.SJJJJJIiJJJJJS.',
    '.SJjjjjjjjjjjJS.',
    '..PPPPP..PPPPP..',
    '..KKKKK..KKKKK..',
  ],
  cardigan: [
    '..JJJJWTTWJJJJ..',
    '.JJJJJWTTWJJJJJ.',
    '.JJJJJNTTNJJJJJ.',
    '.JJJJBNIINBJJJJ.',
    '.SJJJJWIiWJJJJS.',
    '.SJJJJBWWBJJJJS.',
    '..PPPPP..PPPPP..',
    '..KKKKK..KKKKK..',
  ],
};

export const OUTFITS = [
  { id: 'suit', name: '기본 정장', t: 'suit', J: '#2f3f7a', W: '#f2f4f8', T: '#3b6fe0', P: '#262b40' },
  { id: 'white', name: '화이트 셔츠', t: 'suit', J: '#eef1f6', W: '#ffffff', T: '#3b6fe0', P: '#39405e' },
  { id: 'casual', name: '캐주얼 오피스', t: 'suit', J: '#3b3c47', W: '#f2f4f8', T: '#2f3f7a', P: '#2a2b33' },
  { id: 'cardigan', name: '가디건', t: 'cardigan', J: '#4f7a4a', W: '#f2f4f8', T: '#2f3f7a', P: '#2f3437', B: '#e8d27a' },
  { id: 'hoodie', name: '후드티', t: 'hoodie', J: '#8fb3ea', W: '#f2f4f8', T: '#ffffff', P: '#39405e' },
  { id: 'field', name: '현장 근무복', t: 'suit', J: '#c9a777', W: '#f0e6d2', T: '#4f7a4a', P: '#6b5a44' },
  { id: 'coral', name: '코랄 러너', t: 'hoodie', J: '#ff7a66', W: '#fff1ec', T: '#ffffff', P: '#3b3c47' },
  { id: 'lemon', name: '레몬 레인코트', t: 'hoodie', J: '#ffd23f', W: '#fff7d6', T: '#3b6fe0', P: '#39405e' },
];

export const PART_LISTS = { hair: HAIR_STYLES, hairColor: HAIR_COLORS, acc: ACCESSORIES, outfit: OUTFITS, skin: SKINS };

export const DEFAULT_LOOK = { hair: 'part', hairColor: 'brown', acc: 'none', outfit: 'suit', skin: 'light' };

const pick = (list, id) => list.find((x) => x.id === id) || list[0];

export function randomLook() {
  const r = (l) => l[Math.floor(Math.random() * l.length)].id;
  return {
    hair: r(HAIR_STYLES), hairColor: r(HAIR_COLORS),
    acc: Math.random() < 0.35 ? 'none' : r(ACCESSORIES),
    outfit: r(OUTFITS), skin: r(SKINS),
  };
}

// ---------- 그리기 ----------
// 부품을 픽셀 버퍼에 쌓은 뒤, 머리카락 그림자, 입체감, 외곽선을 계산해서 한 번에 찍어요.
class Buf {
  constructor() { this.c = new Array(ART_W * ART_H).fill(null); this.t = new Array(ART_W * ART_H).fill(''); }
  ok(x, y) { return x >= 0 && y >= 0 && x < ART_W && y < ART_H; }
  set(x, y, c, t) { if (!c || !this.ok(x, y)) return; const i = y * ART_W + x; this.c[i] = c; this.t[i] = t; }
  get(x, y) { return this.ok(x, y) ? this.c[y * ART_W + x] : null; }
  tag(x, y) { return this.ok(x, y) ? this.t[y * ART_W + x] : ''; }
  map(fn) { for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) { const i = y * ART_W + x; if (this.c[i]) { const n = fn(x, y, this.c[i], this.t[i]); if (n) this.c[i] = n; } } }
}

function stamp(buf, rows, ox, oy, pal, tagOf) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const col = pal[ch];
      if (col) buf.set(ox + x, oy + y, col, typeof tagOf === 'function' ? tagOf(ch) : tagOf);
    }
  }
}

const EYE = '#262833';
function drawFace(buf, skin, expr) {
  const sd = shade(skin, -0.13);
  for (let y = HEAD_Y + 2; y <= HEAD_Y + 10; y++) for (let x = 1; x <= 14; x++) buf.set(x, y, skin, 'face');
  for (let x = 1; x <= 14; x++) buf.set(x, HEAD_Y + 11, sd, 'chin');
  const ey = HEAD_Y + 8;
  const eye = (x, y) => buf.set(x, y, EYE, 'eye');
  if (expr === 'blink') { eye(3, ey + 1); eye(4, ey + 1); eye(11, ey + 1); eye(12, ey + 1); }
  else if (expr === 'happy') { eye(3, ey + 1); eye(4, ey); eye(5, ey + 1); eye(10, ey + 1); eye(11, ey); eye(12, ey + 1); }
  else { eye(4, ey); eye(4, ey + 1); eye(11, ey); eye(11, ey + 1); }
  // 볼
  for (const x of [2, 3, 12, 13]) buf.set(x, ey + 2, '#f7a8a8', 'cheek');
  // 입
  const m = '#8c4434';
  if (expr === 'happy') { buf.set(7, ey + 2, m, 'mouth'); buf.set(8, ey + 2, m, 'mouth'); buf.set(7, ey + 3, '#e0605a', 'mouth'); buf.set(8, ey + 3, '#e0605a', 'mouth'); }
  else if (expr === 'oops') { buf.set(7, ey + 2, m, 'mouth'); buf.set(8, ey + 2, m, 'mouth'); buf.set(7, ey + 3, m, 'mouth'); buf.set(8, ey + 3, m, 'mouth'); }
  else { buf.set(7, ey + 2, m, 'mouth'); buf.set(8, ey + 2, m, 'mouth'); }
}

const BODY_TAG = { J: 'cloth', j: 'cloth', W: 'shirt', S: 'hand', P: 'leg', K: 'leg' };
function drawBody(buf, outfit, skin, frame) {
  const o = outfit;
  const pal = {
    J: o.J, j: shade(o.J, -0.2), W: o.W, T: o.T, N: '#9cb8f5', I: '#ffffff', i: '#3b6fe0',
    b: '#8fb0ff', S: skin, P: o.P, K: '#1b1d27', B: o.B || shade(o.J, 0.45),
  };
  let rows = BODY_TEMPLATES[o.t] || BODY_TEMPLATES.suit;
  if (frame === 1) rows = [...rows.slice(0, 6), '..KKKKK..PPPPP..', '.........KKKKK..'];
  if (frame === 2) rows = [...rows.slice(0, 6), '..PPPPP..KKKKK..', '..KKKKK.........'];
  stamp(buf, rows, 0, BODY_Y, pal, (ch) => BODY_TAG[ch] || 'detail');
}

// 캐릭터 시그니처 헤어핀: 왼쪽 앞머리에 속이 빈 금색 네모
function drawClip(buf) {
  const g = '#f6c83a', gd = '#c48f17';
  const ring = [[2, 4, g], [3, 4, g], [4, 4, g], [2, 5, g], [4, 5, gd], [2, 6, gd], [3, 6, gd], [4, 6, gd]];
  for (const [x, y, c] of ring) buf.set(x, HEAD_Y + y, c, 'clip');
}

function lum(hex) { const n = parseInt(hex.slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); }

function lightAndShadow(buf) {
  const snapshot = new Buf(); snapshot.c = [...buf.c]; snapshot.t = [...buf.t];
  const T = (x, y) => snapshot.tag(x, y);
  buf.map((x, y, c, t) => {
    if (t === 'hair') {
      if (T(x, y - 1) !== 'hair' && y <= HEAD_Y + 3) return shade(c, 0.18);       // 정수리 빛
      if (T(x + 1, y) !== 'hair' && x >= 9) return shade(c, -0.16);                // 오른쪽 옆면 그늘
    }
    if (t === 'face') {
      const above = T(x, y - 1);
      if (above === 'hair' || above === 'clip' || above === 'acc') return shade(c, -0.12); // 앞머리 그림자
      if (x === 14) return shade(c, -0.07);
    }
    if (t === 'cloth') {
      if (y === BODY_Y) return shade(c, -0.12);                                    // 턱 밑 그림자
      if (x >= 12 && T(x + 1, y) !== 'cloth') return shade(c, -0.16);
      if (x <= 3 && T(x - 1, y) !== 'cloth') return shade(c, 0.1);
    }
    return null;
  });
}

function toCanvas(buf) {
  const c = document.createElement('canvas');
  c.width = SPRITE_W; c.height = SPRITE_H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SPRITE_W, SPRITE_H);
  const put = (x, y, hex, a = 255) => {
    const n = parseInt(hex.slice(1), 16), i = (y * SPRITE_W + x) * 4;
    img.data[i] = (n >> 16) & 255; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255; img.data[i + 3] = a;
  };
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) { const col = buf.get(x, y); if (col) put(x + PAD, y + PAD, col); }
  // 외곽선: 빈 칸 중 옆에 그림이 있으면, 이웃 중 가장 어두운 색을 더 어둡게 해서 칠해요
  for (let y = -PAD; y < ART_H + PAD; y++) for (let x = -PAD; x < ART_W + PAD; x++) {
    if (buf.get(x, y)) continue;
    let best = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const n = buf.get(x + dx, y + dy);
      if (n && (!best || lum(n) < lum(best))) best = n;
    }
    if (best) put(x + PAD, y + PAD, shade(best, -0.55));
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = new Map();

// look 하나를 18x24 캔버스로 그려서 돌려줘요 (같은 모습은 캐시)
export function getSprite(look, expr = 'normal', frame = 0) {
  const key = `${look.hair}|${look.hairColor}|${look.acc}|${look.outfit}|${look.skin}|${expr}|${frame}`;
  let c = cache.get(key);
  if (c) return c;
  const hair = pick(HAIR_STYLES, look.hair);
  const hc = pick(HAIR_COLORS, look.hairColor).c;
  const skin = pick(SKINS, look.skin).c;
  const outfit = pick(OUTFITS, look.outfit);
  const acc = pick(ACCESSORIES, look.acc);

  const buf = new Buf();
  drawBody(buf, outfit, skin, frame);
  drawFace(buf, skin, expr);
  stamp(buf, hair.rows, 0, HEAD_Y, { H: hc, D: shade(hc, -0.26), L: shade(hc, 0.26) }, 'hair');
  if (hair.clip && look.acc !== 'cap' && look.acc !== 'headphone') drawClip(buf);
  stamp(buf, acc.rows, 0, HEAD_Y + acc.dy, acc.pal, 'acc');
  lightAndShadow(buf);
  c = toCanvas(buf);
  if (cache.size > 2000) cache.clear();
  cache.set(key, c);
  return c;
}

// 미리보기용: 지정한 캔버스에 크게 그리기
export function paintLook(canvas, look, { scale = 8, expr = 'normal', frame = 0, pad = 0 } = {}) {
  canvas.width = (SPRITE_W + pad * 2) * scale;
  canvas.height = (SPRITE_H + pad * 2) * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(getSprite(look, expr, frame), pad * scale, pad * scale, SPRITE_W * scale, SPRITE_H * scale);
}
