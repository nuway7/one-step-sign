// "직접 해 보기" 미니 퍼즐: 방향키 · 스와이프 · 화면 버튼으로 플레이
import { LEVELS, initState, step, solve, allFixed } from './mini-rules.js';
import { getSprite, SPRITE_H } from '../sprites.js';

const CELL = 16, PAD = 4, TOP = 12;
const COL = { red: '#ef5b5b', blue: '#2b5fd9', yellow: '#ffc93c' };
const shadeOf = { red: '#b83b3b', blue: '#1f47a8', yellow: '#d39b14' };
const LOOK = { hair: 'short', hairColor: 'dark', acc: 'none', outfit: 'suit', skin: 'light' }; // 신입 사원
// 클리어 결과: 게임 속 별 평가 문구 그대로 (제목 · 멘트)
const RESULTS = {
  1: [['막차 탑승 실패', '버스는 놓쳤어도 업무는 안 놓쳤어요.'], ['불 끄고 퇴근', '사무실 불은 마지막 사람이 끄는 거래요.'], ['연장 근무 완료', '과정은… 묻지 않을게요.']],
  2: [['저녁 약속 사수', '약속 시간엔 늦지 않겠어요.'], ['(거의) 칼퇴근', '노을 보면서 퇴근하는 것도 나쁘지 않죠.'], ['한 끗 차이', '조금만 다듬으면 에이스예요.']],
  3: [['완벽한 마무리', '일 잘하는 직원이 칼퇴도 쟁취하는 법.'], ['에이스 신입', '이렇게 잘하면 실력이 금방 늘죠.'], ['신(神)입', '완벽해요. 내일도 이대로 부탁해요.']],
};
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

export function mountMiniPuzzle(root) {
  root.innerHTML = `
    <div class="mp-head"><span class="mp-stage"></span><b class="mp-name"></b><span class="mp-moves"></span></div>
    <p class="mp-tip"></p>
    <div class="mp-board"><canvas></canvas><div class="mp-toast"></div><div class="mp-clear hidden"><span class="mp-stars"></span><b></b><small class="mp-ment"></small><button class="btn small primary mp-next">다음 업무</button></div></div>
    <div class="mp-ctrl">
      <div class="mp-pad"><button data-d="0,-1" aria-label="위">▲</button><button data-d="-1,0" aria-label="왼쪽">◀</button><button data-d="0,1" aria-label="아래">▼</button><button data-d="1,0" aria-label="오른쪽">▶</button></div>
      <div class="mp-side"><button class="btn small mp-undo">↶ 되돌리기</button><button class="btn small mp-reset">⟲ 다시 시작</button></div>
    </div>
    <p class="mp-help">PC는 방향키(또는 WASD), 휴대폰은 판 위를 밀어서 이동해요.</p>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const mins = LEVELS.map((lv) => solve(lv));
  let li = 0, lv, s, hist, anim = null, bumpAt = 0;

  function load(i) {
    li = i; lv = LEVELS[i]; s = initState(lv); hist = []; anim = null;
    const k = 4;
    canvas.width = (lv.w * CELL + PAD * 2) * k; canvas.height = (lv.h * CELL + PAD * 2 + TOP) * k;
    canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    $('.mp-stage').textContent = `업무 ${i + 1}/${LEVELS.length}`;
    $('.mp-name').textContent = lv.name;
    $('.mp-tip').textContent = lv.tip;
    $('.mp-clear').classList.add('hidden');
    hud();
  }
  function hud() { $('.mp-moves').textContent = `현재 이동 ${s.moves}회 · 최소 ${mins[li]}회`; }
  // 하단 알림 (게임 속 문구 그대로)
  let toastTimer;
  function toast(text) {
    const t = $('.mp-toast'); t.textContent = text; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
  }

  function move(dx, dy) {
    if (s.cleared || !lv) return;
    const n = step(lv, s, dx, dy);
    if (!n) { bumpAt = performance.now(); toast('그쪽은 막혀 있어요. 이동 횟수는 그대로예요.'); return; } // 막힘
    const before = s.docs.filter((d) => d.fixed).length;
    hist.push(s); anim = { from: s, t0: performance.now() }; s = n; hud();
    const done = s.docs.filter((d) => d.fixed).length;
    if (!s.cleared && done > before) toast(done === s.docs.length ? '결재 끝. 이제 퇴근 칸으로 이동하세요.' : `한 건 끝. 아직 남은 문서 ${s.docs.length - done}건`);
    if (s.cleared) setTimeout(cleared, 260);
  }
  function cleared() {
    const stars = s.moves <= mins[li] ? 3 : s.moves <= mins[li] + 3 ? 2 : 1;
    const [title, ment] = RESULTS[stars][Math.floor(Math.random() * 3)];
    $('.mp-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('.mp-clear b').textContent = title;
    $('.mp-ment').textContent = ment;
    $('.mp-next').textContent = li === LEVELS.length - 1 ? '처음부터 다시' : '다음 업무';
    $('.mp-clear').classList.remove('hidden');
  }

  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { const [dx, dy] = d.dataset.d.split(',').map(Number); move(dx, dy); }
    if (e.target.closest('.mp-undo') && hist.length) { s = hist.pop(); anim = null; hud(); $('.mp-clear').classList.add('hidden'); toast('방금 이동은 없던 일로. 쉿…'); }
    if (e.target.closest('.mp-reset')) load(li);
    if (e.target.closest('.mp-next')) load((li + 1) % LEVELS.length);
  });
  // 스와이프
  let sx = 0, sy = 0, swiping = false;
  canvas.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; swiping = true; });
  canvas.addEventListener('pointerup', (e) => {
    if (!swiping) return; swiping = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    Math.abs(dx) > Math.abs(dy) ? move(Math.sign(dx), 0) : move(0, Math.sign(dy));
  });
  // 방향키: 퍼즐이 화면에 보일 때만
  addEventListener('keydown', (e) => {
    if (!root.isConnected || root.closest('.hidden')) return;
    const r = root.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
    const m = map[e.key];
    if (m) { e.preventDefault(); move(...m); }
    if (e.key === 'z' || e.key === 'Z') root.querySelector('.mp-undo').click();
  });

  // ---------- 그리기 ----------
  function cellXY(x, y) { return [PAD + x * CELL, TOP + PAD + y * CELL]; }
  function draw(now) {
    requestAnimationFrame(draw);
    if (!lv || !root.isConnected || root.closest('.hidden')) return;
    const k = canvas.width / (lv.w * CELL + PAD * 2);
    ctx.setTransform(k, 0, 0, k, 0, 0); ctx.imageSmoothingEnabled = false;
    const W = lv.w * CELL + PAD * 2, H = lv.h * CELL + PAD * 2 + TOP;
    ctx.clearRect(0, 0, W, H);
    px(ctx, 0, TOP, W, H - TOP, '#c9d3ea');
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      const [cx, cy] = cellXY(x, y);
      px(ctx, cx, cy, CELL, CELL, (x + y) % 2 ? '#eef2fa' : '#e2e8f5');
    }
    // 목표 칸 (점선)
    for (const g of lv.goals) {
      const [cx, cy] = cellXY(...g.at);
      for (let i = 1; i < CELL - 1; i += 3) { px(ctx, cx + i, cy + 1, 2, 1, COL[g.c]); px(ctx, cx + i, cy + CELL - 2, 2, 1, COL[g.c]); px(ctx, cx + 1, cy + i, 1, 2, COL[g.c]); px(ctx, cx + CELL - 2, cy + i, 1, 2, COL[g.c]); }
    }
    // 양식 (벽)
    for (const [x, y] of lv.walls) {
      const [cx, cy] = cellXY(x, y);
      px(ctx, cx + 1, cy - 3, CELL - 2, CELL + 2, '#7f8db0'); px(ctx, cx + 1, cy - 3, CELL - 2, CELL - 1, '#a9b7d6');
      for (let i = 0; i < 3; i++) px(ctx, cx + 3, cy + i * 4, CELL - 6, 1, '#6b7ba0');
      px(ctx, cx + CELL / 2, cy - 1, 1, CELL - 3, '#6b7ba0');
    }
    // 퇴근 문
    const open = allFixed(s);
    {
      const [cx, cy] = cellXY(...lv.exit);
      px(ctx, cx + 2, cy - 6, CELL - 4, CELL + 4, open ? '#2c9a64' : '#7f889c');
      px(ctx, cx + 3, cy - 5, CELL - 6, CELL + 2, open ? '#3fbf7f' : '#a3abbd');
      px(ctx, cx + CELL - 6, cy + 3, 2, 2, '#ffd23f');
      if (open && Math.floor(now / 300) % 2) { px(ctx, cx + 5, cy - 9, 6, 2, '#ffd23f'); }
    }
    // 움직임 보간
    const t = anim ? Math.min(1, (now - anim.t0) / 130) : 1;
    const lerp = (a, b) => a + (b - a) * t;
    // 문서
    s.docs.forEach((d, i) => {
      const from = anim ? anim.from.docs[i].at : d.at;
      const [cx, cy] = cellXY(lerp(from[0], d.at[0]), lerp(from[1], d.at[1]));
      const x = Math.round(cx), y = Math.round(cy);
      px(ctx, x + 2, y + 2, CELL - 4, CELL - 3, shadeOf[d.c]); px(ctx, x + 2, y + 1, CELL - 4, CELL - 5, COL[d.c]);
      px(ctx, x + 4, y + 3, CELL - 8, 7, '#ffffff');
      px(ctx, x + 5, y + 4, 6, 1, '#7f8db0'); px(ctx, x + 5, y + 6, 4, 1, '#7f8db0'); px(ctx, x + 5, y + 8, 5, 1, '#7f8db0');
      if (d.fixed) { px(ctx, x + 9, y + 9, 2, 2, '#3fbf7f'); px(ctx, x + 11, y + 7, 2, 2, '#3fbf7f'); px(ctx, x + 7, y + 7, 2, 2, '#3fbf7f'); }
    });
    // 캐릭터
    const pf = anim ? anim.from.p : s.p;
    let [cx, cy] = cellXY(lerp(pf[0], s.p[0]), lerp(pf[1], s.p[1]));
    if (now - bumpAt < 220) cx += Math.sin((now - bumpAt) / 220 * Math.PI * 4) * 1.5;
    ctx.drawImage(getSprite(LOOK, s.cleared ? 'happy' : now - bumpAt < 400 ? 'oops' : 'normal', anim && t < 1 ? 1 : 0), Math.round(cx) - 1, Math.round(cy) + CELL - SPRITE_H - 1);
    if (t >= 1) anim = null;
  }
  load(0);
  requestAnimationFrame(draw);
}
