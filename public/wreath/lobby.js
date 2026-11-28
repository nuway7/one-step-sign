// 축하 화환 공간: "한 칸 컴퍼니" 1층 로비 (도트)
// 세로는 324 로 고정하고, 가로는 화면 비율에 맞춰 늘이거나 줄여요 (휴대폰 세로 화면도 꽉 차게).
// 가운데 빨간 카펫 양옆으로 화환이 줄지어 서고, 새 화환은 입구 문에서 배달되어 자리에 놓여요.
import { getWreathSprite, drawRibbonText, SW, SH } from './wreath-art.js';

let H = 324;                  // 세로 (휴대폰 세로 화면에서는 더 길어져요)
const W_MIN = 232, W_MAX = 640;
const WALL = 116;            // 벽과 바닥 경계
const DOOR = { w: 70, y: 40 }; // 입구 자동문 (가운데). 누르면 방명록 사무실로 가요
let ROWS = [206, 264, 320];   // 화환이 서는 줄 (바닥 닿는 y)
const GAP = 44;               // 화환 사이 간격
const C = {
  wall: '#f4e9da', wallD: '#e6d6c0', wain: '#d9c1a0', wainD: '#c3a77f', ceil: '#fbf6ee',
  tileA: '#efe8dc', tileB: '#e5dccd', grout: '#d8cdbb',
  carpet: '#c8323f', carpetD: '#a52632', gold: '#e8b84a',
  glass: '#bfe3ff', glassD: '#93c6ee', frame: '#3b4466', navy: '#1f2a4d',
};
const FONT = '"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

const logo = new Image(); logo.src = '../assets/logo.webp';

export class Lobby {
  constructor({ canvas, layer, onTap, onDoor }) {
    this.canvas = canvas; this.layer = layer; this.onTap = onTap; this.onDoor = onDoor;
    this.doorOpenAt = 0;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.W = 0; this.scale = 1;
    this.items = new Map();  // id -> 화면에 서 있는 화환
    this.entries = new Map();
    this.queue = [];         // 자리가 없어 기다리는 id (돌아가며 보여 줘요)
    this.sparkles = [];
    this.lastBubble = 0; this.lastRotate = performance.now();
    this.host = canvas.parentElement;
    this.resize();
    addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(this.host);
    layer.addEventListener('pointerdown', (e) => this.handleTap(e));
    layer.addEventListener('pointermove', (e) => { const [x, y] = this.toLocal(e); layer.style.cursor = this.hitWreath(x, y) || this.onDoorArea(x, y) ? 'pointer' : ''; });
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---------- 크기 ----------
  resize() {
    const vw = this.host.clientWidth || innerWidth, vh = this.host.clientHeight || innerHeight;
    const W = Math.max(W_MIN, Math.min(W_MAX, Math.round(324 * vw / vh)));
    // 휴대폰처럼 세로로 긴 화면: 로비를 아래로 늘리고, 화환 줄 간격도 넓혀 리본이 잘 보이게 해요
    const h = W === W_MIN ? Math.max(324, Math.min(600, Math.round(W * vh / vw))) : 324;
    if (W !== this.W || h !== H) {
      H = h;
      ROWS = [];
      const step = H > 324 ? 80 : 58;
      for (let y = 206; y <= H - 4; y += step) ROWS.push(y);
      if (H === 324) ROWS = [206, 264, 320];
      this.setWidth(W);
    }
    const s = Math.min(vw / this.W, vh / H);
    this.scale = s;
    const cw = Math.round(this.W * s), ch = Math.round(H * s), ratio = devicePixelRatio || 1;
    this.canvas.width = Math.round(cw * ratio); this.canvas.height = Math.round(ch * ratio);
    for (const el of [this.canvas, this.layer]) {
      el.style.width = cw + 'px'; el.style.height = ch + 'px';
      el.style.left = Math.round((vw - cw) / 2) + 'px'; el.style.top = Math.round((vh - ch) / 2) + 'px';
    }
    this.layer.style.setProperty('--s', s);
    this.pxRatio = ratio;
  }

  setWidth(W) {
    this.W = W;
    this.carpet = Math.round(Math.max(30, Math.min(60, W * 0.11)));
    // 자리: 카펫에 가까운 곳부터, 뒷줄부터 채워요
    const side = W / 2 - this.carpet / 2 - 6 - 8;
    const cols = Math.max(1, Math.floor(side / GAP));
    this.slots = [];
    for (const [ri, y] of ROWS.entries()) for (let c = 0; c < cols; c++) {
      const off = this.carpet / 2 + 6 + GAP / 2 + c * GAP + (ri % 2 ? 6 : 0);
      if (off + GAP / 2 > W / 2 - 4) continue;
      this.slots.push({ x: Math.round(W / 2 - off), y, row: ri }, { x: Math.round(W / 2 + off), y, row: ri });
    }
    this.bg.width = W; this.bg.height = H;
    this.paintStatic();
    // 자리가 바뀌면 다시 배치
    const list = [...this.items.values()];
    this.items.clear();
    for (const it of list) { if (!this.place(it.entry, 'place')) this.queue.unshift(it.entry.id); }
  }

  // ---------- 고정 배경 ----------
  paintStatic() {
    const ctx = this.bg.getContext('2d'), W = this.W, mid = W / 2;
    ctx.clearRect(0, 0, W, H);
    // 벽
    px(ctx, 0, 0, W, WALL, C.wall);
    for (let x = 0; x < W; x += 24) px(ctx, x, 0, 1, WALL - 26, C.wallD);
    px(ctx, 0, 0, W, 8, C.ceil); px(ctx, 0, 8, W, 2, C.wallD);
    // 천장 조명
    for (let x = 24; x < W; x += 64) { px(ctx, x - 8, 10, 16, 2, '#fff7d6'); ctx.globalAlpha = 0.25; px(ctx, x - 12, 12, 24, 3, '#fff1b0'); ctx.globalAlpha = 1; }
    // 징두리 판벽
    px(ctx, 0, WALL - 26, W, 26, C.wain); px(ctx, 0, WALL - 26, W, 2, C.wainD);
    for (let x = 6; x < W; x += 30) { px(ctx, x, WALL - 21, 24, 16, shade2(C.wain)); }
    px(ctx, 0, WALL - 2, W, 2, C.wainD);
    // 입구 자동문 (가운데)
    const dw = DOOR.w, dx = Math.round(mid - dw / 2), dy = DOOR.y;
    px(ctx, dx - 4, dy - 4, dw + 8, WALL - dy + 4, C.frame);
    px(ctx, dx, dy, dw, WALL - dy, C.glass);
    px(ctx, mid - 1, dy, 2, WALL - dy, C.frame);
    for (const gx of [dx + 6, mid + 6]) { px(ctx, gx, dy + 6, 3, 30, '#e6f5ff'); px(ctx, gx + 5, dy + 10, 2, 16, '#e6f5ff'); }
    px(ctx, dx, WALL - 18, dw, 18, C.glassD);
    // 바깥 풍경 (나무)
    for (const tx of [dx + 10, dx + dw - 20]) { px(ctx, tx, WALL - 30, 10, 12, '#6cc68a'); px(ctx, tx + 4, WALL - 18, 2, 6, '#8a6a4a'); }
    // 문 위 간판 (글씨는 DOM)
    px(ctx, mid - 58, 16, 116, 18, C.navy); px(ctx, mid - 56, 18, 112, 14, '#2b3a6b');
    // 문 앞 매트
    px(ctx, mid - this.carpet / 2 - 4, WALL, this.carpet + 8, 4, '#8a8f9e');
    // 바닥 대리석 타일
    for (let y = WALL; y < H; y += 16) for (let x = 0; x < W; x += 16) {
      px(ctx, x, y, 16, 16, ((x + y) / 16) % 2 ? C.tileA : C.tileB);
      px(ctx, x, y, 16, 1, C.grout); px(ctx, x, y, 1, 16, C.grout);
      if (((x * 7 + y * 3) % 5) === 0) px(ctx, x + 5, y + 6, 5, 1, '#ffffff');
    }
    // 빨간 카펫
    const cx0 = Math.round(mid - this.carpet / 2);
    px(ctx, cx0, WALL + 4, this.carpet, H - WALL - 4, C.carpet);
    px(ctx, cx0, WALL + 4, 2, H - WALL - 4, C.gold); px(ctx, cx0 + this.carpet - 2, WALL + 4, 2, H - WALL - 4, C.gold);
    for (let y = WALL + 10; y < H; y += 12) px(ctx, cx0 + 5, y, this.carpet - 10, 1, C.carpetD);
    // 벽 장식: 넓으면 엘리베이터와 게임 포스터
    if (W >= 420) {
      const ex = 26; // 엘리베이터
      px(ctx, ex - 3, 38, 50, WALL - 38 - 26 + 26, '#9aa3b8');
      px(ctx, ex, 44, 21, WALL - 44 - 2, '#c9d0de'); px(ctx, ex + 23, 44, 21, WALL - 44 - 2, '#c9d0de');
      px(ctx, ex + 21, 44, 2, WALL - 46, '#7f889c');
      px(ctx, ex + 14, 32, 16, 5, C.navy); px(ctx, ex + 18, 33, 2, 3, '#ff6b5b'); px(ctx, ex + 23, 33, 3, 3, '#7cf0a0');
      const pxx = W - 96; // 포스터 액자
      px(ctx, pxx - 3, 30, 76, 54, '#8a6a4a'); px(ctx, pxx, 33, 70, 48, '#2a3a72');
      this.poster = { x: pxx + 3, y: 36, w: 64, h: 42 };
    } else this.poster = null;
    // 화분 (문 양옆)
    for (const x of [mid - dw / 2 - 22, mid + dw / 2 + 8]) drawPlant(ctx, Math.round(x), WALL - 16);
  }

  // ---------- 데이터 ----------
  get count() { return this.entries.size; }
  get onScreen() { return this.items.size; }

  setEntries(list, { announce = false } = {}) {
    const ids = new Set(list.map((e) => e.id));
    for (const id of [...this.entries.keys()]) if (!ids.has(id)) this.remove(id);
    const fresh = list.filter((e) => !this.entries.has(e.id));
    for (const e of fresh) this.entries.set(e.id, e);
    if (!announce) {
      // 처음: 최근 화환부터 자리에, 나머지는 대기
      const sorted = [...fresh].sort((a, b) => b.at - a.at);
      for (const e of sorted) if (!this.place(e, 'place')) this.queue.push(e.id);
    } else {
      for (const e of fresh.sort((a, b) => a.at - b.at)) {
        if (!this.freeSlot()) this.retireOldest();
        if (!this.place(e, 'deliver')) this.queue.unshift(e.id);
      }
    }
  }

  remove(id) {
    this.entries.delete(id);
    this.queue = this.queue.filter((q) => q !== id);
    const it = this.items.get(id);
    if (it) { it.bubble.remove(); this.items.delete(id); }
  }

  freeSlot() {
    const used = new Set([...this.items.values()].map((it) => it.slot));
    return this.slots.find((s) => !used.has(s)) || null;
  }

  retireOldest() {
    const cand = [...this.items.values()].filter((it) => it.state === 'idle').sort((a, b) => a.entry.at - b.entry.at)[0];
    if (!cand) return;
    cand.bubble.remove(); this.items.delete(cand.entry.id);
    this.queue.push(cand.entry.id);
  }

  place(entry, how) {
    if (this.items.has(entry.id)) return true;
    const slot = this.freeSlot();
    if (!slot) return false;
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    this.layer.append(bubble);
    const now = performance.now();
    const it = { entry, slot, x: slot.x, y: slot.y, state: 'idle', t0: now, bubble, bubbleUntil: 0, glowUntil: 0, alpha: 1 };
    if (how === 'deliver') {
      // 문 앞 → 카펫 따라 내려와서 → 옆으로 자리까지
      it.state = 'deliver'; it.start = [this.W / 2, WALL + 30]; it.path = [[this.W / 2, slot.y], [slot.x, slot.y]];
      it.x = it.start[0]; it.y = it.start[1]; it.alpha = 0; it.seg = 0; it.segT = now;
      it.glowUntil = now + 14000;
      window.dispatchEvent(new CustomEvent('wreath-arrived', { detail: entry }));
    } else if (how === 'fade') { it.alpha = 0; it.state = 'fadein'; }
    this.items.set(entry.id, it);
    return true;
  }

  showBubble(it, text, ms = 6000) {
    if (!text) return;
    it.bubble.textContent = text.length > 34 ? text.slice(0, 33) + '…' : text;
    it.bubble.classList.add('on');
    it.bubbleUntil = performance.now() + ms;
  }

  sparkle(x, y) {
    const now = performance.now();
    for (let i = 0; i < 18; i++) this.sparkles.push({ x, y, vx: rand(-0.07, 0.07), vy: rand(-0.1, -0.02), t0: now, life: rand(700, 1300), c: choice(['#ffd23f', '#ffffff', '#ff8fb8', '#7cc4ff']) });
  }

  // ---------- 터치 ----------
  toLocal(e) {
    const r = this.layer.getBoundingClientRect();
    return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale];
  }
  hitWreath(lx, ly) {
    let best = null;
    for (const it of this.items.values()) {
      const sx = it.x - SW / 2, sy = it.y - SH + 18;
      if (lx >= sx + 2 && lx <= sx + SW - 2 && ly >= sy && ly <= it.y + 2 && (!best || it.y > best.y)) best = it;
    }
    return best;
  }
  onDoorArea(lx, ly) { return Math.abs(lx - this.W / 2) <= DOOR.w / 2 + 4 && ly >= DOOR.y - 4 && ly <= WALL + 6; }
  handleTap(e) {
    const [lx, ly] = this.toLocal(e);
    const best = this.hitWreath(lx, ly);
    if (best) { best.tapAt = performance.now(); this.onTap?.(best.entry); return; }
    // 입구 문: 문이 열리는 모습을 보여 준 뒤 방명록으로
    if (this.onDoorArea(lx, ly) && !this.doorOpenAt) {
      this.doorOpenAt = performance.now();
      setTimeout(() => { this.onDoor?.(); setTimeout(() => { this.doorOpenAt = 0; }, 800); }, 520);
    }
  }

  // ---------- 루프 ----------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    this.update(now);
    this.draw(now);
  }

  update(now) {
    // 자리보다 화환이 많으면 14초마다 하나씩 바꿔 보여 줘요
    if (this.queue.length && now - this.lastRotate > 14000) {
      this.lastRotate = now;
      const id = this.queue.shift(), e = this.entries.get(id);
      if (e) { if (!this.freeSlot()) this.retireOldest(); this.place(e, 'fade'); }
    }
    // 말풍선 돌리기 (카드 메시지)
    const bubbling = [...this.items.values()].filter((it) => it.bubbleUntil > now).length;
    if (now - this.lastBubble > 3800 && bubbling < 2 && this.items.size) {
      this.lastBubble = now;
      const cand = [...this.items.values()].filter((it) => it.state === 'idle' && it.bubbleUntil < now && it.entry.msg);
      if (cand.length) { const it = choice(cand); this.showBubble(it, it.entry.msg); }
    }
    for (const it of this.items.values()) {
      if (it.bubbleUntil && now > it.bubbleUntil) { it.bubble.classList.remove('on'); it.bubbleUntil = 0; }
      if (it.state === 'fadein') { it.alpha = Math.min(1, it.alpha + 0.03); if (it.alpha >= 1) it.state = 'idle'; }
      if (it.state === 'deliver') {
        it.alpha = Math.min(1, it.alpha + 0.05);
        const [ax, ay] = it.seg === 0 ? it.start : it.path[it.seg - 1];
        const [bx, by] = it.path[it.seg];
        const dist = Math.hypot(bx - ax, by - ay) || 1, t = Math.min(1, (now - it.segT) / (dist / 0.075));
        it.x = ax + (bx - ax) * t; it.y = ay + (by - ay) * t;
        if (t >= 1) {
          it.seg++; it.segT = now;
          if (it.seg >= it.path.length) {
            it.state = 'idle'; it.x = it.slot.x; it.y = it.slot.y;
            this.sparkle(it.x, it.y - 70);
            this.showBubble(it, it.entry.msg || `${it.entry.sender} 님의 화환`, 8000);
          }
        }
      }
    }
    this.sparkles = this.sparkles.filter((s) => now - s.t0 < s.life);
  }

  draw(now) {
    const ctx = this.ctx, k = this.scale * this.pxRatio;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bg, 0, 0);
    if (this.poster && logo.complete && logo.naturalWidth) {
      const p = this.poster, r = Math.min(p.w / logo.naturalWidth, p.h / logo.naturalHeight);
      const w = logo.naturalWidth * r, h = logo.naturalHeight * r;
      ctx.imageSmoothingEnabled = true; ctx.drawImage(logo, p.x + (p.w - w) / 2, p.y + (p.h - h) / 2, w, h); ctx.imageSmoothingEnabled = false;
    }
    // 문 열림 (양쪽 유리문이 옆으로 밀려 들어가요)
    if (this.doorOpenAt) {
      const t = Math.min(1, (now - this.doorOpenAt) / 450), mid = this.W / 2, half = DOOR.w / 2, h = WALL - DOOR.y;
      const shift = Math.round(half * t);
      ctx.save();
      ctx.beginPath(); ctx.rect(mid - half, DOOR.y, DOOR.w, h); ctx.clip(); // 문틀 밖으로 밀려난 유리는 안 보이게
      px(ctx, mid - half, DOOR.y, DOOR.w, h, '#2b5fd9');             // 안쪽: 방명록 사무실 (워드 파랑)
      for (let gy = DOOR.y + 8; gy < WALL; gy += 8) px(ctx, mid - half, gy, DOOR.w, 1, '#5b86ee');
      ctx.globalAlpha = 0.35 * t; px(ctx, mid - half, DOOR.y, DOOR.w, h, '#ffffff'); ctx.globalAlpha = 1;
      px(ctx, mid - half - shift, DOOR.y, half, h, C.glass); px(ctx, mid + shift, DOOR.y, half, h, C.glass);
      px(ctx, mid - 1 - shift, DOOR.y, 2, h, C.frame); px(ctx, mid - 1 + shift, DOOR.y, 2, h, C.frame);
      ctx.restore();
    }
    // 앞뒤 순서: 위쪽(뒷줄) 먼저
    const list = [...this.items.values()].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const it of list) this.drawWreath(ctx, it, now);
    for (const s of this.sparkles) {
      const t = now - s.t0; ctx.globalAlpha = 1 - t / s.life;
      px(ctx, Math.round(s.x + s.vx * t), Math.round(s.y + s.vy * t), 2, 2, s.c);
    }
    ctx.globalAlpha = 1;
    // 말풍선 위치
    for (const it of this.items.values()) {
      const top = (it.y - SH + 22) * this.scale;
      it.bubble.style.transform = `translate(${it.x * this.scale}px, ${top}px) translate(-50%, -100%)`;
      it.bubble.style.zIndex = String(10 + Math.round(it.y));
    }
  }

  drawWreath(ctx, it, now) {
    const sx = Math.round(it.x - SW / 2), sy = Math.round(it.y - SH + 1);
    let hop = 0;
    if (it.state === 'deliver') hop = Math.abs(Math.sin(now / 120)) * 2;
    if (it.tapAt && now - it.tapAt < 400) hop = Math.sin(((now - it.tapAt) / 400) * Math.PI) * 4;
    ctx.globalAlpha = it.alpha;
    // 그림자
    ctx.globalAlpha = it.alpha * 0.18; px(ctx, sx + 8, it.y - 2, SW - 16, 4, C.navy); ctx.globalAlpha = it.alpha;
    // 새로 온 화환: 바닥 빛
    if (now < it.glowUntil && it.state === 'idle') {
      ctx.globalAlpha = it.alpha * (0.22 + 0.18 * Math.sin(now / 220));
      px(ctx, sx + 4, it.y - 6, SW - 8, 8, '#ffd23f');
      ctx.globalAlpha = it.alpha;
    }
    const y = Math.round(sy - hop);
    ctx.drawImage(getWreathSprite(it.entry.look || {}), sx, y);
    drawRibbonText(ctx, it.entry.look || {}, sx, y, it.entry.ribbon, it.entry.sender);
    ctx.globalAlpha = 1;
  }
}

function shade2(c) { return c === C.wain ? '#d2b893' : c; }
function drawPlant(ctx, x, y) {
  px(ctx, x + 2, y + 8, 12, 8, '#d98c5f'); px(ctx, x + 2, y + 8, 12, 1, '#b86d43');
  px(ctx, x + 6, y - 8, 4, 16, '#3fae6a');
  px(ctx, x, y - 4, 6, 8, '#2c8a50'); px(ctx, x + 10, y - 6, 6, 8, '#2c8a50');
  px(ctx, x + 3, y - 12, 4, 6, '#3fae6a'); px(ctx, x + 9, y - 14, 4, 7, '#2c8a50');
}
