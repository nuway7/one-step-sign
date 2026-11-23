// 데이터 연결: Supabase 또는 노트북 서버 중 하나를 같은 모양으로 감싸요.
import { SUPABASE_URL, SUPABASE_ANON_KEY, LIMITS } from './config.js';

export class ApiError extends Error {
  constructor(message, { network = false, code = '' } = {}) { super(message); this.network = network; this.code = code; }
}

async function call(url, opts) {
  let r;
  try { r = await fetch(url, opts); } catch { throw new ApiError('인터넷에 연결되어 있지 않아요.', { network: true }); }
  if (r.status >= 500 || r.status === 0) throw new ApiError('서버가 잠시 응답하지 않아요.', { network: true });
  let body = null;
  const text = await r.text();
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const msg = body?.hint || body?.error_description || body?.msg || body?.error || body?.message || '요청을 처리하지 못했어요.';
    throw new ApiError(msg, { code: body?.message || String(r.status) });
  }
  return body;
}

// 저장소에 넣어 둔 아카이브 (Supabase가 멈췄을 때 포트폴리오용으로 보여 줘요)
async function loadArchive() {
  try { const r = await fetch('archive.json', { cache: 'no-store' }); if (r.ok) return (await r.json()).entries || []; } catch { /* 없음 */ }
  return null;
}

// ---------------- 노트북 서버 ----------------
class LocalApi {
  kind = 'local';
  needsBoothCode = false;
  async config() {
    try { return { ...LIMITS, ...(await call('/api/config')) }; } catch { return LIMITS; }
  }
  async list() { return (await call('/api/entries?since=-1')).entries || []; }
  async submit({ name, msg, look }) {
    const d = await call('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, msg, look }) });
    return d.entry;
  }
  async login({ pin }) { this.pin = pin; await this.adminList(); }
  logout() { this.pin = ''; }
  get loggedIn() { return !!this.pin; }
  async adminList() { return (await call('/api/admin/entries', { headers: { 'x-admin-pin': this.pin || '' } })).entries; }
  async setHidden(id, hidden) {
    await call('/api/admin/entries/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pin': this.pin || '' }, body: JSON.stringify({ hidden }) });
  }
}

// ---------------- Supabase ----------------
const toEntry = (e) => ({ id: e.id, n: e.n, name: e.name, msg: e.msg, look: e.look || {}, at: Date.parse(e.created_at), hidden: e.hidden });

class SupabaseApi {
  kind = 'supabase';
  needsBoothCode = true;
  constructor(url, key) { this.url = url.replace(/\/+$/, ''); this.key = key; this.token = ''; }
  headers(json = true) {
    const h = { apikey: this.key };
    // 예전 anon 키(JWT)는 Authorization 에도 넣고, 새 publishable 키는 apikey 에만 넣어요.
    if (this.token) h.Authorization = 'Bearer ' + this.token;
    else if (this.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + this.key;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  rpc(name, body = {}) {
    return call(`${this.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
  }
  async config() { return LIMITS; }
  async list() {
    try {
      const rows = await call(`${this.url}/rest/v1/guestbook_entries?select=id,n,name,msg,look,created_at&order=created_at.asc&limit=2000`, { headers: this.headers(false) });
      return rows.map(toEntry);
    } catch (err) {
      const arch = await loadArchive();
      if (arch) return arch;
      throw err;
    }
  }
  async submit({ code, name, msg, look }) {
    return toEntry(await this.rpc('submit_entry', { p_code: code, p_name: name, p_msg: msg, p_look: look }));
  }
  async checkCode(code) { return !!(await this.rpc('check_booth_code', { p_code: code })); }
  async login({ email, password }) {
    const d = await call(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    }).catch((e) => { throw new ApiError(e.network ? e.message : '이메일이나 비밀번호가 맞지 않아요.', { network: e.network }); });
    this.token = d.access_token; // 메모리에만 보관 (새로고침하면 다시 로그인)
    try { await this.adminList(); } catch (e) { this.token = ''; throw e; }
  }
  logout() { this.token = ''; }
  get loggedIn() { return !!this.token; }
  async adminList() { return (await this.rpc('admin_list_entries')).map(toEntry); }
  async setHidden(id, hidden) { await this.rpc('admin_set_hidden', { p_id: id, p_hidden: hidden }); }
}

const forced = new URLSearchParams(location.search).get('backend');
export const api = forced !== 'local' && SUPABASE_URL && SUPABASE_ANON_KEY
  ? new SupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new LocalApi();

// ---------------- 부스 코드 / 오프라인 대기열 (이 기기에만 저장) ----------------
const K_CODE = 'onestep.boothCode', K_QUEUE = 'onestep.pending';
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* 저장 불가 */ } },
};
export const booth = {
  get code() { return ls.get(K_CODE) || ''; },
  set code(v) { v ? ls.set(K_CODE, v) : ls.del(K_CODE); },
  get canWrite() { return !api.needsBoothCode || !!this.code; },
};
export const queue = {
  all() { try { return JSON.parse(ls.get(K_QUEUE) || '[]'); } catch { return []; } },
  save(list) { list.length ? ls.set(K_QUEUE, JSON.stringify(list)) : ls.del(K_QUEUE); },
  push(item) { const l = this.all(); l.push(item); this.save(l); },
  remove(tempId) { this.save(this.all().filter((x) => x.tempId !== tempId)); },
};
