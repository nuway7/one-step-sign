// 축하 화환 보내기: 방문하지 못한 분들을 위한 방명록
import { Lobby } from './lobby.js';
import { PART_LISTS, DEFAULT_LOOK, randomLook, paintWreath2x, getWreathSprite } from './wreath-art.js';
import { api, ApiError, LIMITS } from './wreath-api.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
document.body.classList.add('backend-' + api.kind);
$('#senderInput').maxLength = LIMITS.maxSender;
$('#ribbonInput').maxLength = LIMITS.maxRibbon;
$('#msgInput').maxLength = LIMITS.maxMessage;

// ================= 로비 =================
const lobby = new Lobby({ canvas: $('#world'), layer: $('#layer'), onTap: openViewer });

let loaded = false, lastSig = '';
async function poll() {
  try {
    const list = await api.list();
    const sig = list.map((e) => e.id).join(',');
    if (sig !== lastSig) { lastSig = sig; lobby.setEntries(list, { announce: loaded }); updateStatus(); }
    loaded = true;
  } catch (e) {
    if (!loaded) toast(e.network ? '인터넷 연결을 확인해 주세요.' : '화환을 불러오지 못했어요.');
  }
}
function updateStatus() {
  $('#stCount').innerHTML = `화환 <b>${lobby.count}</b>개 도착`;
  $('#empty').classList.toggle('hidden', lobby.count > 0 || !loaded);
}
poll(); setInterval(poll, LIMITS.pollSeconds * 1000); setInterval(updateStatus, 1000);

let toastTimer;
function toast(text) {
  const t = $('#toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 4200);
}
addEventListener('wreath-arrived', (e) => toast(`💐 ${e.detail.sender} 님의 화환이 도착했어요!`));

// ================= 화환 보기 =================
function openViewer(entry) {
  if (!$('#flow').classList.contains('hidden')) return;
  paintWreath2x($('#vFace'), entry.look, { scale: 5, left: entry.ribbon, right: entry.sender });
  $('#vSender').textContent = `${entry.sender} 님의 화환`;
  const d = new Date(entry.at);
  $('#vInfo').textContent = `No.${entry.n} · ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 도착`;
  $('#vRibbon').textContent = entry.ribbon;
  $('#vMsg').textContent = entry.msg || '';
  $('#viewer').classList.remove('hidden');
}
function closeViewer() { $('#viewer').classList.add('hidden'); }
$('#viewer').addEventListener('click', (e) => { if (e.target.id === 'viewer' || e.target.closest('[data-vclose]')) closeViewer(); });

// ================= 보내기 흐름 =================
const look = { ...DEFAULT_LOOK };
let current = 'start';
const history = [];

function show(step, push = true) {
  if (push && current !== step) history.push(current);
  current = step;
  $$('.step').forEach((s) => s.classList.toggle('on', s.dataset.step === step));
  $('#flow').scrollTop = 0;
  if (step === 'design') renderCloset();
  if (step === 'ribbon') drawRibbonPreview();
  if (step === 'msg') { $('#err').textContent = ''; updateCount(); }
}
function openFlow(step = 'start') {
  closeViewer();
  $('#flow').classList.remove('hidden');
  history.length = 0; current = '';
  show(step, false);
}
function closeFlow() { $('#flow').classList.add('hidden'); }
function resetForm() {
  Object.assign(look, DEFAULT_LOOK);
  $('#senderInput').value = ''; $('#ribbonInput').value = ''; $('#msgInput').value = ''; $('#err').textContent = '';
  closetTab = 'shape';
}

$('#joinBtn').addEventListener('click', () => openFlow('start'));
$('#flow').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]'); if (go) return show(go.dataset.go);
  if (e.target.closest('[data-back]')) { const prev = history.pop(); return show(prev || 'start', false); }
  if (e.target.closest('[data-close]')) { if (current === 'done') resetForm(); return closeFlow(); }
});

// ----- 꾸미기 -----
const TABS = [
  { key: 'shape', name: '모양' }, { key: 'flower', name: '꽃 색' }, { key: 'accent', name: '가운데 꽃' },
  { key: 'ribbon', name: '리본 색' }, { key: 'deco', name: '장식' },
];
let closetTab = 'shape';
function renderCloset() {
  paintWreath2x($('#bigPreview'), look, { scale: 5, left: ribbonText(), right: senderText() });
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
    if (closetTab === 'flower' || closetTab === 'accent' || closetTab === 'ribbon') {
      const sw = document.createElement('div'); sw.className = 'sw'; sw.style.background = item.c; b.append(sw);
    } else {
      const c = document.createElement('canvas'); c.className = 'wthumb';
      paintWreath2x(c, { ...look, [closetTab]: item.id }, { scale: 2 });
      b.append(c);
    }
    const label = document.createElement('span'); label.textContent = item.name; b.append(label);
    b.onclick = () => { look[closetTab] = item.id; renderCloset(); };
    box.append(b);
  }
}
$('#randomBtn').addEventListener('click', () => { Object.assign(look, randomLook()); renderCloset(); });

// ----- 리본 -----
const RIBBON_SAMPLES = ['축 졸업전시', '졸업 축하해요', '축 전시', '꽃길만 걷자', '허송세월 화이팅', '한 칸만 옮겼는데', '대박 기원', '수고 많았어'];
const SENDER_SAMPLES = ['친구 일동', '가족 일동', '선배가', '후배가', '익명의 팬'];
const ribbonText = () => $('#ribbonInput').value.trim() || '축 졸업전시';
const senderText = () => $('#senderInput').value.trim() || '익명';
function drawRibbonPreview() { paintWreath2x($('#ribbonPreview'), look, { scale: 4, left: ribbonText(), right: senderText() }); }
function chipRow(box, list, input) {
  for (const s of list) {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = s;
    b.onclick = () => { input.value = s.slice(0, input.maxLength); drawRibbonPreview(); };
    box.append(b);
  }
}
chipRow($('#ribbonChips'), RIBBON_SAMPLES, $('#ribbonInput'));
chipRow($('#senderChips'), SENDER_SAMPLES, $('#senderInput'));
$('#ribbonInput').addEventListener('input', drawRibbonPreview);
$('#senderInput').addEventListener('input', drawRibbonPreview);

// ----- 카드 -----
const MSG_SAMPLES = ['졸업 진심으로 축하해!', '전시 못 가서 아쉬워요 🥲', '게임 출시하면 꼭 해 볼게요', '그동안 정말 고생 많았어요', '허송세월 팀 최고!', '앞으로의 길도 응원할게요'];
for (const s of MSG_SAMPLES) {
  const b = document.createElement('button'); b.className = 'chip'; b.textContent = s;
  b.onclick = () => {
    const t = $('#msgInput');
    t.value = ((t.value ? t.value.trimEnd() + ' ' : '') + s).slice(0, LIMITS.maxMessage); updateCount();
  };
  $('#msgChips').append(b);
}
function updateCount() { $('#msgCount').textContent = `${$('#msgInput').value.length} / ${LIMITS.maxMessage}자`; }
$('#msgInput').addEventListener('input', updateCount);

let sending = false;
$('#submitBtn').addEventListener('click', async () => {
  if (sending) return;
  sending = true; $('#submitBtn').disabled = true; $('#err').textContent = '';
  try {
    const entry = await api.submit({ sender: $('#senderInput').value.trim(), ribbon: $('#ribbonInput').value.trim(), msg: $('#msgInput').value.trim(), look: { ...look } });
    paintWreath2x($('#doneFace'), look, { scale: 4, left: entry.ribbon, right: entry.sender });
    $('#doneText').textContent = `${entry.sender} 님의 화환이 한 칸 컴퍼니 로비에 배달됐어요!`;
    show('done');
    lastSig = ''; poll();
  } catch (e) {
    $('#err').textContent = e instanceof ApiError ? e.message : '보내지 못했어요. 다시 눌러 주세요.';
  } finally { sending = false; $('#submitBtn').disabled = false; }
});

// ================= 관리자 =================
// 머리글 로고를 3초 안에 5번 누르면 열려요
let taps = [];
$('#logoHit').addEventListener('click', () => {
  const now = Date.now(); taps = taps.filter((t) => now - t < 3000); taps.push(now);
  if (taps.length >= 5) { taps = []; openAdmin(); }
});
if (api.kind === 'local') { $('#loginEmail').classList.add('hidden'); $('#loginPw').placeholder = '관리자 PIN'; $('#loginHint').textContent = '노트북 서버의 관리자 PIN을 입력해요.'; }

function openAdmin() {
  $('#pinErr').textContent = '';
  $('#authPane').classList.toggle('hidden', api.loggedIn);
  $('#adminPane').classList.toggle('hidden', !api.loggedIn);
  $('#admin').classList.remove('hidden');
  if (api.loggedIn) loadAdmin();
}
$('#loginPane').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#pinErr').textContent = '';
  try {
    await api.login({ email: $('#loginEmail').value.trim(), password: $('#loginPw').value });
    $('#authPane').classList.add('hidden'); $('#adminPane').classList.remove('hidden');
    loadAdmin();
  } catch (err) { api.logout(); $('#pinErr').textContent = err.message; }
  $('#loginPw').value = '';
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
    const b = document.createElement('b'); b.textContent = `${e.sender} · 「${e.ribbon}」`;
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
  if (e.target.closest('[data-aclose]') || e.target.id === 'admin') $('#admin').classList.add('hidden');
});
$('#reloadBtn').addEventListener('click', loadAdmin);

getWreathSprite(DEFAULT_LOOK);
