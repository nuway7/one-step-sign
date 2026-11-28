// 미니 퍼즐 규칙 (게임 「한 칸만 옮겼는데」의 핵심 규칙을 작게 옮겼어요)
//  - 캐릭터가 한 칸 움직이면, 고정되지 않은 문서도 모두 같은 방향으로 한 칸 움직여요.
//  - 벽(양식), 고정된 문서, 가장자리, 아직 닫힌 퇴근 문에 걸린 문서는 그 자리에 멈춰요.
//  - 캐릭터가 막히면 아무것도 움직이지 않아요.
//  - 문서가 같은 색 목표에 닿으면 고정돼요. 모두 고정되면 퇴근 문이 열리고, 문에 서면 클리어!

export const LEVELS = [
  {
    name: '첫 실수, 한 칸씩', tip: '나와 「문서」는 함께 이동해요. 빨간 「문서」를 같은 색 점선 칸으로 옮기세요.',
    w: 5, h: 4, player: [0, 3], exit: [4, 3], walls: [],
    docs: [{ c: 'red', at: [1, 1] }], goals: [{ c: 'red', at: [3, 1] }],
  },
  {
    name: '양식에 맞추기', tip: '「문서」를 「양식」에 걸어 정지시키세요. 막힌 「문서」만 그 자리에 멈춰요.',
    w: 5, h: 5, player: [0, 4], exit: [4, 4], walls: [[3, 2]],
    docs: [{ c: 'red', at: [0, 0] }, { c: 'blue', at: [0, 2] }], goals: [{ c: 'red', at: [4, 0] }, { c: 'blue', at: [2, 2] }],
  },
  {
    name: '결재 순서가 중요해요', tip: '결재된 「문서」는 「양식」처럼 길을 막아요. 어느 「문서」부터 결재할지 생각해 보세요.',
    w: 5, h: 5, player: [2, 4], exit: [0, 4], walls: [[2, 1]],
    docs: [{ c: 'red', at: [0, 0] }, { c: 'blue', at: [4, 1] }, { c: 'yellow', at: [1, 3] }],
    goals: [{ c: 'red', at: [1, 0] }, { c: 'blue', at: [3, 1] }, { c: 'yellow', at: [1, 2] }],
  },
];

export function initState(lv) {
  return { p: [...lv.player], docs: lv.docs.map((d) => ({ c: d.c, at: [...d.at], fixed: false })), moves: 0, cleared: false };
}
const key = (x, y) => x + ',' + y;
export const allFixed = (s) => s.docs.every((d) => d.fixed);

// 한 턴: 바뀐 새 상태를 돌려줘요. 캐릭터가 막히면 null.
export function step(lv, s, dx, dy) {
  if (s.cleared) return null;
  const walls = new Set(lv.walls.map(([x, y]) => key(x, y)));
  const fixedCells = new Set(s.docs.filter((d) => d.fixed).map((d) => key(...d.at)));
  const exitOpen = allFixed(s);
  const inside = (x, y) => x >= 0 && y >= 0 && x < lv.w && y < lv.h;
  // 움직이는 것: 캐릭터 + 고정 안 된 문서. 진행 방향 앞쪽부터 처리해요.
  const movers = [{ kind: 'p', at: s.p }, ...s.docs.map((d, i) => ({ kind: 'd', i, at: d.at })).filter((m) => !s.docs[m.i].fixed)];
  movers.sort((a, b) => (b.at[0] * dx + b.at[1] * dy) - (a.at[0] * dx + a.at[1] * dy));
  const taken = new Set();
  const out = new Map();
  for (const m of movers) {
    const [tx, ty] = [m.at[0] + dx, m.at[1] + dy];
    let ok = inside(tx, ty) && !walls.has(key(tx, ty)) && !fixedCells.has(key(tx, ty)) && !taken.has(key(tx, ty));
    // 닫힌 퇴근 문 칸에는 문서가 들어갈 수 없어요 (캐릭터는 들어가서 기다릴 수 있어요)
    if (ok && m.kind === 'd' && !exitOpen && tx === lv.exit[0] && ty === lv.exit[1]) ok = false;
    const np = ok ? [tx, ty] : m.at;
    if (m.kind === 'p' && !ok) return null; // 캐릭터가 막히면 이번 턴은 없던 일
    taken.add(key(...np));
    out.set(m, np);
  }
  const n = { p: [...s.p], docs: s.docs.map((d) => ({ ...d, at: [...d.at] })), moves: s.moves + 1, cleared: false };
  for (const [m, np] of out) { if (m.kind === 'p') n.p = np; else n.docs[m.i].at = np; }
  for (const d of n.docs) if (!d.fixed && lv.goals.some((g) => g.c === d.c && g.at[0] === d.at[0] && g.at[1] === d.at[1])) d.fixed = true;
  if (allFixed(n) && n.p[0] === lv.exit[0] && n.p[1] === lv.exit[1]) n.cleared = true;
  return n;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 최소 이동 수 (너비 우선 탐색). 풀 수 없으면 -1.
export function solve(lv, limit = 40) {
  const sig = (s) => s.p.join() + '|' + s.docs.map((d) => d.at.join() + (d.fixed ? 'f' : '')).join(';');
  let frontier = [initState(lv)];
  const seen = new Set([sig(frontier[0])]);
  for (let depth = 0; depth < limit && frontier.length; depth++) {
    const next = [];
    for (const s of frontier) for (const [dx, dy] of DIRS) {
      const n = step(lv, s, dx, dy);
      if (!n) continue;
      if (n.cleared) return depth + 1;
      const k = sig(n);
      if (!seen.has(k)) { seen.add(k); next.push(n); }
    }
    frontier = next;
  }
  return -1;
}
