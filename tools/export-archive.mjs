// 전시가 끝난 뒤, Supabase 에 있는 공개 방명록(숨김 제외)을 public/archive.json 으로 내보내요.
// Supabase 무료 프로젝트가 일시 정지돼도 포트폴리오 사이트에서 이 파일을 대신 보여 줘요.
//
//   node tools/export-archive.mjs
//
// public/config.js 의 SUPABASE_URL, SUPABASE_ANON_KEY 를 그대로 써요 (공개 데이터만 읽어요).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import(pathToFileURL(path.join(ROOT, 'public', 'config.js')).href);
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error('public/config.js 에 SUPABASE_URL 과 SUPABASE_ANON_KEY 를 먼저 넣어 주세요.'); process.exit(1); }

const headers = { apikey: SUPABASE_ANON_KEY };
if (SUPABASE_ANON_KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + SUPABASE_ANON_KEY;
const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/guestbook_entries?select=id,n,name,msg,look,created_at&order=created_at.asc&limit=5000`;
const r = await fetch(url, { headers });
if (!r.ok) { console.error('불러오지 못했어요:', r.status, await r.text()); process.exit(1); }
const rows = await r.json();
const entries = rows.map((e) => ({ id: e.id, n: e.n, name: e.name, msg: e.msg, look: e.look, at: Date.parse(e.created_at) }));
const out = path.join(ROOT, 'public', 'archive.json');
fs.writeFileSync(out, JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 1));
console.log(`방명록 ${entries.length}개를 ${path.relative(ROOT, out)} 에 저장했어요.`);
