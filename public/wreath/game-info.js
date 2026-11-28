// 게임 소개 창: 게임을 해 보지 못한 분들도 읽는 재미가 있게, 하나의 콘텐츠로
// 팀 문서 「한 칸만 옮겼는데_허송세월」을 참고해서 새로 썼어요. 팀원 후기만 원문 그대로예요.
import { TEAM } from '../config.js';
import { paintLook } from '../sprites.js';
import { mountMiniPuzzle } from './mini-puzzle.js';

// 팀원 후기 (원문)
export const REVIEWS = {
  송채연: '프로젝트를 처음부터 기획하고 마무리하기까지 게임 개발의 전 과정을 경험하며 많이 배웠습니다. 머릿속으로 그리던 시스템이 하나씩 구현되고, 직접 플레이할 수 있는 게임으로 완성되어 가는 모습이 뿌듯했습니다. 그 과정에서 프로젝트에 더 애정이 생겼고, 저의 기획을 믿고 끝까지 함께 만들어 준 팀원에게도 고마웠습니다.',
  허혜림: '프로젝트를 하면서 많은 어려움과 고비가 있었지만 팀원과 같이 하면서 이겨낼 수 있었습니다(진심으로). 개발은 혼자서도 할 수 있겠지만, 팀으로 함께 하는 것이 즐겁다는 것을 느꼈습니다. 개발을 하면서 ‘이게 된다고? 이게 말이 돼?’라는 순간이 있었고 그 덕분에 개발하는 과정이 재밌고 뿌듯했습니다. 앞으로도 계속 사람들이 즐길 수 있는 콘텐츠를 만들고 싶습니다. 개발하는 시간동안 믿고 맡겨준 팀원에게 고마움을 표합니다. 또한 플레이 해주신 모든 분들께 감사합니다.',
};

const html = String.raw;

const SECTIONS = html`
<section class="gi-sec gi-story-sec" id="gi-story">
  <div class="gi-hero">
    <img src="../assets/logo.webp" alt="한 칸만 옮겼는데">
    <div>
      <p class="gi-kicker">사진 한 장 옮겼을 뿐인데,</p>
      <h2 class="gi-big">문서가 <em>터졌다.</em></h2>
      <div class="gi-tags"><span>3D 턴제 퍼즐</span><span>1인용</span><span>모바일 · PC</span><span>팀 허송세월</span></div>
    </div>
  </div>

  <div class="gi-chat" aria-label="사내 메신저 대화">
    <div class="gi-chat-top">💬 한칸톡 · 기획팀 단체방</div>
    <div class="msg them"><i>👔</i><div><small>김 팀장</small><p>신입 씨~ 보고서 3페이지 사진 있죠?<br>그거 <b>한 칸만</b> 옮겨 줄래요?</p></div></div>
    <div class="msg me"><div><p>넵! 금방 하겠습니다 😊</p></div></div>
    <div class="msg sys">신입 님이 사진을 한 칸 옮겼습니다.</div>
    <div class="msg sys warn">⚠️ 표가 다음 페이지로 도망갔습니다<br>⚠️ 문단이 사방으로 흩어졌습니다<br>⚠️ 쪽 번호가 실종되었습니다</div>
    <div class="msg me"><div><p>.......<br>한 칸만 옮겼는데?</p></div></div>
    <div class="msg them"><i>👔</i><div><small>김 팀장</small><p>6시 전까지 원래대로 부탁해요.<br>오늘 하루도 파이팅!</p></div></div>
  </div>

  <p class="gi-lead">워드에서 사진 하나 옮겼다가 문서 전체가 와르르 무너지는 경험, 한 번쯤 있으시죠?
  <b>「한 칸만 옮겼는데」</b>는 그 사무실의 악몽을 퍼즐로 만든 게임이에요.
  3D 사무실 격자 위에서 나(신입)를 한 칸씩 움직여, 흩어진 「문서」를 같은 색 점선 칸에 돌려놓으세요. 목표는 단 하나, <b>오늘도 칼퇴</b>예요.</p>
</section>

<section class="gi-sec" id="gi-rules">
  <h3>한 칸 컴퍼니 업무 규정</h3>
  <p class="gi-sub">입사 첫날 꼭 읽어야 하는 사내 규정이에요. 게임 규칙과 같아요.</p>
  <ol class="gi-law">
    <li><b>제1조 (함께 이동)</b> 화면을 스와이프하면 나와 「문서」가 <em>한 칸씩 함께</em> 이동합니다. 내가 막히면 「문서」도 움직이지 못해요.</li>
    <li><b>제2조 (양식에 맞추기)</b> 「문서」를 「양식」에 걸어 정지시키세요. 막힌 방향으로는 「문서」가 움직이지 않습니다.</li>
    <li><b>제3조 (결재는 쟤가)</b> 같은 색 점선 칸에 도착한 「문서」는 결재 완료. 결재된 「문서」는 「양식」처럼 고정된 채 길을 막아요.</li>
    <li><b>제4조 (퇴근은 내가)</b> 모든 「문서」를 결재하면 「퇴근」 칸이 열려요. 「퇴근」 칸에 도착하면 오늘 업무 끝.</li>
  </ol>
  <p class="gi-fine">부칙 · 이동 횟수에 따라 업무 평가(별)가 달라져요. 한 번의 이동이 모든 「문서」를 움직이니, <b>다음 수까지</b> 생각해 보세요.</p>
</section>

<section class="gi-sec" id="gi-play">
  <h3>직접 해 보기</h3>
  <p class="gi-sub">게임 규칙을 그대로 옮긴 미니 업무 3개예요. 규정은 몸으로 익히는 법이죠.</p>
  <div class="gi-mini"></div>
  <p class="gi-fine">실제 게임은 3D 사무실에서 더 많은 「문서」와 「양식」, 그리고 「되돌리기」 · 「길 찾기」 · 「마감 연장」 아이템과 함께 펼쳐져요.</p>
</section>

<section class="gi-sec" id="gi-video">
  <h3>영상으로 보기</h3>
  <p class="gi-sub">백문이 불여일견. 사건의 시작과 실제 업무 현장이에요.</p>
  <div class="gi-videos">
    <figure><video src="../assets/cutscene.mp4" controls playsinline preload="metadata"></video><figcaption>📼 사건의 시작 <small>인트로 컷씬</small></figcaption></figure>
    <figure><video src="../assets/play.mp4" controls playsinline preload="metadata"></video><figcaption>🎮 업무 현장 <small>플레이 영상</small></figcaption></figure>
  </div>
</section>

<section class="gi-sec" id="gi-behind">
  <h3>비하인드: 이렇게 만들었어요</h3>
  <div class="gi-facts">
    <div><i>🏢</i><b>사무실을 통째로 지었다</b><p>Unity 6와 C#으로 3D 사무실과 퍼즐을 만들었어요.</p></div>
    <div><i>📱</i><b>밀어서 출근</b><p>휴대폰 세로 화면(9:16)에서 화면을 밀어 움직이고, PC에서는 방향키로 플레이해요.</p></div>
    <div><i>🤖</i><b>AI와 함께 빚은 신입 사원</b><p>3D 캐릭터는 NC AI의 Varco AI로 모델링하고 텍스처를 입혔어요.</p></div>
    <div><i>🧩</i><b>퍼즐 공장도 직접</b><p>브라우저에서 돌아가는 레벨 에디터를 따로 만들어, 퍼즐을 배치하고 최소 이동 수를 확인한 뒤 JSON으로 뽑아냈어요.</p></div>
  </div>
  <h4>한 칸 움직이는 순간, 게임 속에서는</h4>
  <p class="gi-sub">스와이프 한 번에 이동 · 충돌 판정 → 「되돌리기」용 기록 → 나와 「문서」 이동 → 결재 → 퇴근 확인 → 업무 평가 저장까지 순서대로 일어나요.</p>
  <img class="gi-diagram" src="../assets/system-diagram.webp" loading="lazy" alt="한 턴의 흐름: 스와이프·키보드 입력, 이동·충돌 판정, 이전 상태 기록(턴 취소), 캐릭터·서류 이동, 목표 칸의 서류 고정, 전체 결재 및 퇴근 확인, 별 평가 및 진행도 저장">
  <p class="gi-fine">같은 규칙으로 격자 모양이나 「양식」 · 점선 칸 위치만 바꿔도 새로운 퍼즐이 계속 나와요. 물류 정리나 길 찾기처럼 이동 순서가 중요한 주제로도 바꿀 수 있어요.</p>
</section>

<section class="gi-sec" id="gi-team">
  <h3>만든 사람들 · 팀 허송세월</h3>
  <p class="gi-sub">이름은 허송세월이지만, 시간을 허투루 쓰지 않은 두 사람.</p>
  <div class="gi-team"></div>
</section>`;

let built = false;
function build(root) {
  const page = root.querySelector('.gi-page');
  page.innerHTML = SECTIONS;
  mountMiniPuzzle(page.querySelector('.gi-mini'));
  const list = page.querySelector('.gi-team');
  for (const m of TEAM) {
    const card = document.createElement('div'); card.className = 'gi-member';
    const face = document.createElement('canvas'); paintLook(face, m.look, { scale: 6, expr: 'happy', pad: 1 });
    const body = document.createElement('div'); body.className = 'gi-mbody';
    const head = document.createElement('div'); head.className = 'gi-mhead';
    const b = document.createElement('b'); b.textContent = m.name;
    const r = document.createElement('span'); r.textContent = m.role || '';
    head.append(b, r);
    const q = document.createElement('p'); q.textContent = REVIEWS[m.name] || '';
    body.append(head, q); card.append(face, body); list.append(card);
  }
  built = true;
}

export function openGameInfo(section = 'story') {
  const root = document.querySelector('#gameInfo');
  if (!built) build(root);
  root.classList.remove('hidden');
  const page = root.querySelector('.gi-page');
  const target = root.querySelector('#gi-' + section);
  page.scrollTop = target && section !== 'story' ? target.offsetTop - 8 : 0;
}
export function closeGameInfo() {
  const root = document.querySelector('#gameInfo');
  root.classList.add('hidden');
  root.querySelectorAll('video').forEach((v) => v.pause());
}
export function setupGameInfo() {
  const root = document.querySelector('#gameInfo');
  root.addEventListener('click', (e) => {
    if (e.target === root || e.target.closest('[data-giclose]')) return closeGameInfo();
    const jump = e.target.closest('[data-gi]');
    if (jump) { const t = root.querySelector('#gi-' + jump.dataset.gi); root.querySelector('.gi-page').scrollTo({ top: t.offsetTop - 8, behavior: 'smooth' }); }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGameInfo(); });
}
