// 화환 데이터 연결: Supabase(인터넷 사이트) 또는 노트북 서버(테스트용)를 같은 모양으로 감싸요.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export const LIMITS = { maxSender: 10, maxRibbon: 12, maxMessage: 80, pollSeconds: 8 };

export class ApiError extends Error {
  constructor(message, { network = false, code = '' } = {}) { super(message); this.network = network; this.code = code; }
}

async function call(url, opts) {
  let r;
  try { r = await fetch(url, opts); } catch { throw new ApiError('인터넷에 연결되어 있지 않아요.', { network: true }); }
  if (r.status >= 500 || r.status === 0) throw new ApiError('서버가 잠시 응답하지 않아요.', { network: true });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const msg = body?.hint || body?.error_description || body?.msg || body?.error || body?.message || '요청을 처리하지 못했어요.';
    throw new ApiError(msg, { code: body?.message || String(r.status) });
  }
  return body;
}

const toEntry = (e) => ({ id: e.id, n: e.n, sender: e.sender, ribbon: e.ribbon, msg: e.msg || '', look: e.look || {}, at: typeof e.at === 'number' ? e.at : Date.parse(e.created_at), hidden: e.hidden });

class LocalApi {
  kind = 'local';
  async list() { return ((await call('/api/wreaths')).entries || []).map(toEntry); }
  async submit(p) {
    const d = await call('/api/wreaths', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    return toEntry(d.entry);
  }
  async login({ password }) { this.pin = password; await this.adminList(); }
  logout() { this.pin = ''; }
  get loggedIn() { return !!this.pin; }
  async adminList() { return ((await call('/api/admin/wreaths', { headers: { 'x-admin-pin': this.pin || '' } })).entries || []).map(toEntry); }
  async setHidden(id, hidden) {
    await call('/api/admin/wreaths/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pin': this.pin || '' }, body: JSON.stringify({ hidden }) });
  }
}

class SupabaseApi {
  kind = 'supabase';
  constructor(url, key) { this.url = url.replace(/\/+$/, ''); this.key = key; this.token = ''; }
  headers(json = true) {
    const h = { apikey: this.key };
    if (this.token) h.Authorization = 'Bearer ' + this.token;
    else if (this.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + this.key;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  rpc(name, body = {}) { return call(`${this.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) }); }
  async list() {
    const rows = await call(`${this.url}/rest/v1/wreath_entries?select=id,n,sender,ribbon,msg,look,created_at&order=created_at.asc&limit=2000`, { headers: this.headers(false) });
    return rows.map(toEntry);
  }
  async submit({ sender, ribbon, msg, look }) {
    return toEntry(await this.rpc('submit_wreath', { p_sender: sender, p_ribbon: ribbon, p_msg: msg, p_look: look }));
  }
  async login({ email, password }) {
    const d = await call(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    }).catch((e) => { throw new ApiError(e.network ? e.message : '이메일이나 비밀번호가 맞지 않아요.', { network: e.network }); });
    this.token = d.access_token; // 메모리에만 보관
    try { await this.adminList(); } catch (e) { this.token = ''; throw e; }
  }
  logout() { this.token = ''; }
  get loggedIn() { return !!this.token; }
  async adminList() { return (await this.rpc('admin_list_wreaths')).map(toEntry); }
  async setHidden(id, hidden) { await this.rpc('admin_set_wreath_hidden', { p_id: id, p_hidden: hidden }); }
}

const forced = new URLSearchParams(location.search).get('backend');
export const api = forced !== 'local' && SUPABASE_URL && SUPABASE_ANON_KEY
  ? new SupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new LocalApi();
