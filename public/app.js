import { Scene } from './scene.js';
import { PART_LISTS, DEFAULT_LOOK, randomLook, paintLook, getSprite } from './sprites.js';
import { api, booth, queue, ApiError } from './api.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const MODE = ['display', 'kiosk'].includes(params.get('mode')) ? params.get('mode') : 'all';
document.body.classList.add('mode-' + MODE, 'backend-' + api.kind);

const cfg = await api.config();
$('#nameInput').maxLength = cfg.maxName;
$('#msgInput').maxLength = cfg.maxMessage;

// 화면 안 길게 누르기 메뉴, 두 손가락 확대 막기
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('gesturestart', (e) => e.preventDefault());

// ================= 쓰기 권한 (부스 코드) =================
function refreshWriteState() {
  const can = booth.canWrite;
  document.body.classList.toggle('view-only', !can);
  $('#joinBtn').classList.toggle('hidden', !can);
  $('#startBtn').classList.toggle('hidden', !can);
  $('#startNotice').classList.toggle('hidden', !can);
  $('#lockedNotice').classList.toggle('hidden', can);
  $('#stMode').innerHTML = api.kind === 'supabase' && !can ? '<b>보기 전용</b>' : '';
}
refreshWriteState();

// ================= 공간 =================
let scene = null;
if (MODE !== 'kiosk') {
  scene = new Scene({ canvas: $('#world'), layer: $('#layer'), maxOnScreen: cfg.maxOnScreen, onTapEntry: openViewer });
}

// 아직 서버에 못 올린 글도 화면에는 먼저 보여 줘요
const pendingEntries = () => queue.all().map((p) => ({ id: p.tempId, n: '…', name: p.name || '익명의 신입사원', msg: p.msg, look: p.look, at: p.at, pending: true }));

let loaded = false, lastSig = '', lastServer = [];
async function poll() {
  try {
    // 연결이 끊겼으면 마지막으로 받은 목록에 대기 중인 글을 더해서 보여 줘요
    try { lastServer = await api.list(); } catch { /* 오프라인 */ }
    const list = [...lastServer, ...pendingEntries()];
    const sig = list.map((e) => e.id).join(',');
    if (sig !== lastSig) {
      lastSig = sig;
      scene?.setEntries(list, { announce: loaded });
      updateStatus();
    }
    loaded = true;
  } catch { /* 연결이 잠시 끊겨도 화면은 계속 */ }
}
function updateStatus() {
  if (!scene) return;
  $('#stCount').innerHTML = `방명록 <b>${scene.count}</b>개`;
  $('#stNow').innerHTML = `지금 출근 <b>${scene.onScreen}</b>명`;
  $('#empty').classList.toggle('hidden', scene.count > 0);
}
if (scene) { poll(); setInterval(poll, cfg.pollSeconds * 1000); setInterval(updateStatus, 1000); }

// ----- 오프라인 대기열 올리기 -----
let flushing = false;
async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    for (const p of queue.all()) {
      try {
        const entry = await api.submit({ code: p.code, name: p.name, msg: p.msg, look: p.look });
        queue.remove(p.tempId);
        scene?.rekey(p.tempId, entry);
        lastSig = '';
      } catch (e) {
        if (e.network) break;          // 아직 오프라인: 다음에 다시
        queue.remove(p.tempId);        // 서버가 거절한 글은 버려요 (금지어, 기간 종료 등)
        lastSig = '';
      }
    }
  } finally { flushing = false; }
}
setInterval(flushQueue, 10000);
addEventListener('online', flushQueue);
flushQueue();

let toastTimer;
function toast(text) {
  const t = $('#toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 4200);
}
addEventListener('guest-arrived', (e) => toast(`${e.detail.name} 님이 출근했어요!`));
addEventListener('group-move', (e) => {
  const { dx, dy } = e.detail;
  $('#groupArrow').textContent = dx > 0 ? '→' : dx < 0 ? '←' : dy > 0 ? '↓' : '↑';
  const b = $('#groupBanner'); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 2600);
});

// ================= 방명록 보기 =================
let viewerTimer;
function openViewer(entry) {
  if (!$('#flow').classList.contains('hidden')) return;
  paintLook($('#vFace'), entry.look || DEFAULT_LOOK, { scale: 6, expr: 'happy' });
  $('#vTitle').textContent = entry.pending ? '방명록_올리는중.docx' : `방명록_${String(entry.n).padStart(3, '0')}.docx`;
  $('#vName').textContent = entry.name;
  const d = new Date(entry.at);
  const no = entry.pending ? '전송 대기' : `No.${entry.n}`;
  $('#vInfo').textContent = `${no} · ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 출근`;
  $('#vMsg').textContent = entry.msg;
  $('#viewer').classList.remove('hidden');
  clearTimeout(viewerTimer); viewerTimer = setTimeout(closeViewer, 15000);
}
function closeViewer() { $('#viewer').classList.add('hidden'); }
$('#viewer').addEventListener('pointerdown', (e) => { if (e.target.id === 'viewer' || e.target.closest('[data-vclose]')) closeViewer(); });

// ================= 참여 흐름 =================
const look = { ...DEFAULT_LOOK };
let current = 'start';
const history = [];

function show(step, push = true) {
  if (push && current !== step) history.push(current);
  current = step;
  $$('.step').forEach((s) => s.classList.toggle('on', s.dataset.step === step));
  if (step === 'look') renderCloset();
  if (step === 'name') paintLook($('#badgeFace'), look, { scale: 6, pad: 2 });
  if (step === 'msg') { paintLook($('#docFace'), look, { scale: 5 }); $('#err').textContent = ''; updateCount(); }
}
function openFlow(step = 'start') {
  closeViewer();
  refreshWriteState();
  $('#flow').classList.remove('hidden');
  history.length = 0; current = '';
  show(booth.canWrite ? step : 'start', false);
  bumpIdle();
}
function closeFlow() {
  if (MODE === 'kiosk') { resetForm(); openFlow('start'); return; }
  $('#flow').classList.add('hidden');
  resetForm();
}
function resetForm() {
  Object.assign(look, DEFAULT_LOOK);
  $('#nameInput').value = ''; $('#msgInput').value = ''; $('#err').textContent = '';
  closetTab = 'hair';
  document.activeElement?.blur?.();
}

$('#joinBtn').addEventListener('click', () => openFlow('start'));
$('#flow').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]'); if (go) return show(go.dataset.go);
  if (e.target.closest('[data-back]')) { const prev = history.pop(); return show(prev || 'start', false); }
  if (e.target.closest('[data-close]')) return closeFlow();
});

// ----- 옷장 -----
const TABS = [
  { key: 'hair', name: '헤어' }, { key: 'hairColor', name: '헤어 색' }, { key: 'acc', name: '액세서리' },
  { key: 'outfit', name: '의상' }, { key: 'skin', name: '피부' },
];
let closetTab = 'hair';
function renderCloset() {
  paintLook($('#bigPreview'), look, { scale: 12 });
  $('#ctabs').innerHTML = '';
  for (const t of TABS) {
    const b = document.createElement('button');
    b.textContent = t.name; b.className = t.key === closetTab ? 'on' : '';
    b.onclick = () => { closetTab = t.key; renderCloset(); };
    $('#ctabs').append(b);
  }
  const box = $('#options'); box.innerHTML = '';
  for (const item of PART_LISTS[closetTab]) {
    const b = document.createElement('button');
    b.className = 'opt' + (look[closetTab] === item.id ? ' on' : '');
    if (closetTab === 'hairColor' || closetTab === 'skin') {
      const sw = document.createElement('div'); sw.className = 'sw'; sw.style.background = item.c; b.append(sw);
    } else {
      const c = document.createElement('canvas');
      paintLook(c, { ...look, [closetTab]: item.id }, { scale: 4 });
      b.append(c);
    }
    const label = document.createElement('span'); label.textContent = item.name; b.append(label);
    b.onclick = () => { look[closetTab] = item.id; renderCloset(); };
    box.append(b);
  }
}
$('#randomBtn').addEventListener('click', () => { Object.assign(look, randomLook()); renderCloset(); });

// ----- 사원증 이름 -----
const ADJ = ['칼퇴하는', '졸린', '야근 중인', '커피 수혈 중인', '한 칸 옮긴', '망했다 싶은', '정리 잘하는', '방금 출근한', '퇴근이 급한', '문서 지키는'];
const RANK = ['인턴', '신입사원', '사원', '주임', '대리', '과장', '팀장', '관람객'];
function renderNameChips() {
  const box = $('#nameChips'); box.innerHTML = '';
  const shuffle = () => {
    for (let k = 0; k < 50; k++) {
      const n = `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${RANK[Math.floor(Math.random() * RANK.length)]}`;
      if (n.length <= cfg.maxName) return n;
    }
    return RANK[Math.floor(Math.random() * RANK.length)];
  };
  for (let i = 0; i < 3; i++) {
    const n = shuffle();
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = n;
    b.onclick = () => { $('#nameInput').value = n; };
    box.append(b);
  }
  const r = document.createElement('button'); r.className = 'chip alt'; r.textContent = '🎲 다른 이름';
  r.onclick = renderNameChips; box.append(r);
  const a = document.createElement('button'); a.className = 'chip alt'; a.textContent = '익명으로 할게요';
  a.onclick = () => { $('#nameInput').value = ''; show('msg'); }; box.append(a);
}
renderNameChips();

// ----- 방명록 -----
const SAMPLES = ['전시 잘 봤어요!', '한 칸만 옮겼는데 망했다…ㅋㅋ', '오늘도 칼퇴 응원합니다', '출시하면 꼭 해 볼게요', '캐릭터 너무 귀여워요', '졸업 축하해요 🎉'];
function renderMsgChips() {
  const box = $('#msgChips'); box.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = s;
    b.onclick = () => {
      const t = $('#msgInput');
      t.value = (t.value ? t.value.trimEnd() + ' ' : '') + s;
      t.value = t.value.slice(0, cfg.maxMessage); updateCount();
    };
    box.append(b);
  }
}
renderMsgChips();
function updateCount() {
  const v = $('#msgInput').value;
  $('#msgCount').textContent = `${v.length} / ${cfg.maxMessage}자`;
  $('#msgWords').textContent = `${v.trim() ? v.trim().split(/\s+/).length : 0}개 단어`;
}
$('#msgInput').addEventListener('input', updateCount);

let sending = false;
$('#submitBtn').addEventListener('click', async () => {
  if (sending) return;
  const msg = $('#msgInput').value.trim();
  const name = $('#nameInput').value.trim();
  if (!msg) { $('#err').textContent = '한 마디만 적어 주세요!'; return; }
  sending = true; $('#submitBtn').disabled = true;
  const payload = { code: booth.code, name, msg, look: { ...look } };
  try {
    let shownName;
    try {
      const entry = await api.submit(payload);
      shownName = entry.name;
      lastSig = ''; poll();
    } catch (e) {
      if (!e.network) throw e;
      // 인터넷이 끊겼으면 기기에 보관했다가 다시 연결되면 올려요
      const tempId = 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      queue.push({ tempId, ...payload, at: Date.now() });
      shownName = name || '익명의 신입사원';
      lastSig = ''; poll();
    }
    paintLook($('#doneFace'), look, { scale: 9, expr: 'happy' });
    $('#doneText').textContent = MODE === 'kiosk'
      ? `${shownName} 님, 큰 화면에서 내 캐릭터를 찾아보세요!`
      : `${shownName} 님, 사무실에서 내 캐릭터를 찾아보세요!`;
    show('done');
    startDoneCountdown();
  } catch (e) {
    if (e.code === 'BOOTH_CODE') { booth.code = ''; refreshWriteState(); }
    $('#err').textContent = e instanceof ApiError ? e.message : '저장하지 못했어요. 다시 눌러 주세요.';
  } finally { sending = false; $('#submitBtn').disabled = false; }
});

let doneTimer;
function startDoneCountdown() {
  let n = 6;
  const tick = () => {
    if (current !== 'done') return;
    $('#doneBtn').textContent = `확인 (${n})`;
    if (n-- <= 0) closeFlow(); else doneTimer = setTimeout(tick, 1000);
  };
  clearTimeout(doneTimer); tick();
}

// ----- 아무도 안 만지면 처음으로 -----
let idleTimer;
function bumpIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if ($('#flow').classList.contains('hidden')) return;
    if (MODE === 'kiosk' && current === 'start') return;
    closeFlow();
  }, cfg.idleResetSeconds * 1000);
}
['pointerdown', 'keydown', 'input'].forEach((ev) => addEventListener(ev, bumpIdle, true));

if (MODE === 'kiosk') openFlow('start');

// ================= 관리자 =================
// 공간 화면: 왼쪽 위 W 아이콘 / 태블릿: 왼쪽 위 모서리를 3초 안에 5번
// 터치 기기는 손가락을 뗀 뒤 "클릭"을 한 번 더 보내요. 누르는 순간(pointerdown)에 창을 열면
// 그 클릭이 방금 열린 창의 배경에 떨어져서 창이 바로 닫혀요. 그래서 클릭이 끝난 뒤에 세고 열어요.
let taps = [], adminOpenedAt = 0;
const adminVisible = () => !$('#admin').classList.contains('hidden');
function countTap() {
  if (adminVisible()) return;
  const now = Date.now(); taps = taps.filter((t) => now - t < 3000); taps.push(now);
  if (taps.length >= 5) { taps = []; openAdmin(); }
}
$('#adminHit').addEventListener('pointerdown', (e) => e.stopPropagation()); // 캐릭터 터치로 번지지 않게
$('#adminHit').addEventListener('click', (e) => { e.stopPropagation(); countTap(); });
addEventListener('click', (e) => {
  if (MODE !== 'kiosk' || e.clientX > 70 || e.clientY > 70) return;
  countTap();
});

const isLocal = api.kind === 'local';
$('#pinPane').classList.toggle('hidden', !isLocal);
$('#boothPane').classList.toggle('hidden', isLocal);
$('#loginPane').classList.toggle('hidden', isLocal);

function openAdmin() {
  adminOpenedAt = Date.now();
  pin = ''; drawPin(); $('#pinErr').textContent = '';
  $('#boothInput').value = '';
  $('#boothState').textContent = booth.code ? '✓ 이 기기는 부스로 등록되어 있어요.' : '아직 등록되지 않은 기기예요.';
  $('#boothClear').classList.toggle('hidden', !booth.code);
  $('#authPane').classList.toggle('hidden', api.loggedIn);
  $('#adminPane').classList.toggle('hidden', !api.loggedIn);
  $('#admin').classList.remove('hidden');
  if (api.loggedIn) loadAdmin();
}

// 노트북 서버 모드: PIN 키패드
let pin = '';
function drawPin() { $('#pinDots').innerHTML = '<i></i>'.repeat(pin.length); }
for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '확인']) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = k;
  b.onclick = async () => {
    if (k === '지움') pin = pin.slice(0, -1);
    else if (k === '확인') { await tryLogin({ pin }); pin = ''; }
    else if (pin.length < 8) pin += k;
    drawPin();
  };
  $('#keypad').append(b);
}

// Supabase 모드: 관리자 로그인
$('#loginPane').addEventListener('submit', async (e) => {
  e.preventDefault();
  await tryLogin({ email: $('#loginEmail').value.trim(), password: $('#loginPw').value });
  $('#loginPw').value = '';
});

async function tryLogin(cred) {
  $('#pinErr').textContent = '';
  try {
    await api.login(cred);
    $('#authPane').classList.add('hidden'); $('#adminPane').classList.remove('hidden');
    loadAdmin();
  } catch (e) {
    api.logout();
    $('#pinErr').textContent = isLocal ? 'PIN이 맞지 않아요.' : e.message;
  }
}

// 부스 등록
$('#boothSave').addEventListener('click', async () => {
  const code = $('#boothInput').value;
  if (!code) return;
  $('#boothState').textContent = '확인하는 중…';
  try {
    if (await api.checkCode(code)) {
      booth.code = code; refreshWriteState();
      $('#boothState').textContent = '✓ 등록했어요. 이제 이 기기에서 방명록을 쓸 수 있어요.';
      $('#boothClear').classList.remove('hidden');
      $('#boothInput').value = '';
    } else $('#boothState').textContent = '부스 코드가 맞지 않아요.';
  } catch (e) { $('#boothState').textContent = e.message; }
});
$('#boothClear').addEventListener('click', () => {
  booth.code = ''; refreshWriteState();
  $('#boothState').textContent = '등록을 해제했어요. 이 기기는 보기 전용이에요.';
  $('#boothClear').classList.add('hidden');
});

async function loadAdmin() {
  try { renderAdmin(await api.adminList()); }
  catch (e) { api.logout(); openAdmin(); $('#pinErr').textContent = e.message; }
}
function renderAdmin(list) {
  $('#adminCount').textContent = `전체 ${list.length}개 · 숨김 ${list.filter((e) => e.hidden).length}개`;
  const box = $('#adminList'); box.innerHTML = '';
  for (const e of [...list].sort((a, b) => b.at - a.at)) {
    const row = document.createElement('div'); row.className = 'arow' + (e.hidden ? ' hid' : '');
    const no = document.createElement('div'); no.className = 'no'; no.textContent = '#' + e.n;
    const t = document.createElement('div'); t.className = 't';
    const b = document.createElement('b'); b.textContent = e.name;
    const s = document.createElement('span'); s.textContent = e.msg;
    const sm = document.createElement('small'); sm.textContent = ' · ' + new Date(e.at).toLocaleString('ko-KR');
    t.append(b, s, sm);
    const btn = document.createElement('button'); btn.className = 'btn small'; btn.textContent = e.hidden ? '다시 보이기' : '숨기기';
    btn.onclick = async () => {
      try { await api.setHidden(e.id, !e.hidden); } catch (err) { $('#adminCount').textContent = err.message; return; }
      lastSig = ''; loadAdmin(); poll();
    };
    row.append(no, t, btn); box.append(row);
  }
}
$('#admin').addEventListener('click', (e) => {
  if (e.target.closest('[data-aclose]')) return $('#admin').classList.add('hidden');
  // 배경 터치로 닫기: 열린 직후 0.6초 동안은 무시 (남은 터치가 닫지 않게)
  if (e.target.id === 'admin' && Date.now() - adminOpenedAt > 600) $('#admin').classList.add('hidden');
});
$('#fsBtn').addEventListener('click', () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}); });
$('#reloadBtn').addEventListener('click', () => location.reload());

// 미리 캐시해 두기 (첫 터치 때 버벅이지 않게)
getSprite(DEFAULT_LOOK);
