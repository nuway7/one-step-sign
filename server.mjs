// 한 칸만 옮겼는데 방명록 서버
// 의존성 없음. Node 18 이상에서 `node server.mjs` 로 실행합니다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'entries.json');

// config.json (PIN이 들어 있어 깃허브에 올리지 않아요) 이 없으면 예시 파일을 써요
const configFile = fs.existsSync(path.join(ROOT, 'config.json')) ? 'config.json' : 'config.example.json';
const config = JSON.parse(fs.readFileSync(path.join(ROOT, configFile), 'utf8'));
if (configFile !== 'config.json') console.warn('  ⚠ config.json 이 없어서 config.example.json 을 사용해요. 관리자 PIN을 바꾸려면 config.json 을 만들어 주세요.');
const PORT = Number(process.env.PORT) || config.port || 4327;

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- 저장소 ----------
let store = { rev: 0, entries: [] };
try {
  store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(store.entries)) store.entries = [];
  store.rev = Number(store.rev) || 0;
} catch { /* 처음 실행 */ }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store, null, 1));
    fs.renameSync(tmp, DATA_FILE); // 쓰다가 꺼져도 원본이 깨지지 않게
  }, 50);
}

// ---------- 검사 ----------
const normalize = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}0-9]/gu, '');
const banned = (config.bannedWords || []).map(normalize).filter(Boolean);
const hasBanned = (s) => { const n = normalize(s); return banned.some((w) => n.includes(w)); };
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const PART_KEYS = ['hair', 'hairColor', 'acc', 'outfit', 'skin'];

function validateLook(look) {
  const out = {};
  for (const k of PART_KEYS) {
    const v = String(look?.[k] ?? '');
    out[k] = /^[a-z0-9-]{1,20}$/.test(v) ? v : '';
  }
  return out;
}

const publicEntry = (e) => ({ id: e.id, n: e.n, name: e.name, msg: e.msg, look: e.look, at: e.at });

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, {
    'Content-Type': isObj ? MIME['.json'] : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

const isAdmin = (req) => {
  const pin = String(req.headers['x-admin-pin'] || '');
  const a = Buffer.from(pin), b = Buffer.from(String(config.adminPin));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/config' && req.method === 'GET') {
      return send(res, 200, { maxName: config.maxName, maxMessage: config.maxMessage, maxOnScreen: config.maxOnScreen, idleResetSeconds: config.idleResetSeconds });
    }
    if (p === '/api/entries' && req.method === 'GET') {
      const since = Number(url.searchParams.get('since'));
      if (since === store.rev) return send(res, 200, { rev: store.rev, same: true });
      return send(res, 200, { rev: store.rev, entries: store.entries.filter((e) => !e.hidden).map(publicEntry) });
    }
    if (p === '/api/entries' && req.method === 'POST') {
      const body = await readBody(req);
      const name = clean(body.name, config.maxName);
      const msg = clean(body.msg, config.maxMessage);
      if (!msg) return send(res, 400, { error: '방명록 내용을 적어 주세요.' });
      if (hasBanned(name) || hasBanned(msg)) return send(res, 400, { error: '조금 더 순한 말로 적어 주세요 🙂' });
      const n = store.entries.length + 1;
      const entry = { id: crypto.randomUUID(), n, name: name || `익명의 신입사원 ${n}`, msg, look: validateLook(body.look), at: Date.now() };
      store.entries.push(entry);
      store.rev++;
      save();
      return send(res, 201, { ok: true, entry: publicEntry(entry), rev: store.rev });
    }
    // ---- 관리자 ----
    if (p === '/api/admin/entries' && req.method === 'GET') {
      if (!isAdmin(req)) return send(res, 403, { error: 'PIN이 맞지 않아요.' });
      return send(res, 200, { rev: store.rev, entries: store.entries });
    }
    const m = p.match(/^\/api\/admin\/entries\/([\w-]{8,64})$/);
    if (m && req.method === 'PATCH') {
      if (!isAdmin(req)) return send(res, 403, { error: 'PIN이 맞지 않아요.' });
      const e = store.entries.find((x) => x.id === m[1]);
      if (!e) return send(res, 404, { error: '없는 글이에요.' });
      const body = await readBody(req);
      e.hidden = !!body.hidden; // 지우지 않고 숨김만 (되돌릴 수 있게)
      store.rev++;
      save();
      return send(res, 200, { ok: true });
    }

    // ---- 정적 파일 ----
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
    let rel = decodeURIComponent(p === '/' ? '/index.html' : p);
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden');
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, 'Not Found');
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Last-Modified': st.mtime.toUTCString(), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
      // 영상은 브라우저가 부분(Range)으로 나눠 달라고 해요
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (m && (m[1] || m[2])) {
        let start = m[1] ? Number(m[1]) : st.size - Number(m[2]);
        let end = m[1] && m[2] ? Number(m[2]) : st.size - 1;
        if (start < 0) start = 0;
        if (start >= st.size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
        end = Math.min(end, st.size - 1);
        res.writeHead(206, { ...base, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${st.size}` });
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { ...base, 'Content-Length': st.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  } catch (err) {
    send(res, 400, { error: '요청을 처리하지 못했어요.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('');
  console.log('  한 칸만 옮겼는데 · 방명록 서버가 켜졌어요');
  console.log('');
  console.log(`  이 컴퓨터 (터치 화면 하나):   http://localhost:${PORT}/`);
  console.log(`  큰 화면 (보기 전용):          http://localhost:${PORT}/?mode=display`);
  for (const ip of ips) console.log(`  태블릿 (같은 와이파이):        http://${ip}:${PORT}/?mode=kiosk`);
  console.log('');
  console.log(`  저장 위치: ${DATA_FILE}`);
  console.log('  끄려면 이 창에서 Ctrl + C');
  console.log('');
});
