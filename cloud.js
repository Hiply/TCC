/* ===================== CLOUD SYNC (Supabase — free tier) ===================== */
/* Cole aqui a URL e a chave "anon public" do SEU projeto Supabase (gratuito).     */
/* Veja o passo a passo em README-WEB.md. Enquanto estiver com os valores         */
/* padrão abaixo, o app funciona normalmente apenas com localStorage (sem nuvem). */
const SUPABASE_URL = "https://aufkkwugjvkxvlbrirgf.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Zmtrd3VnanZreHZsYnJpcmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMjE4NDIsImV4cCI6MjEwNTY5Nzg0Mn0.8gMgdSa309Vlo_6EFnyEmsfIEB-pSallMaNPsDhk4is";

let supa = null;
let cloudUser = null;
let cloudSyncTimer = null;
const $$ = s => document.querySelector(s);

function cloudEnabled() {
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('http') &&
    typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20 &&
    typeof window.supabase !== 'undefined';
}

function setSyncPill(mode) {
  const p = $$('#syncPill'); if (!p) return;
  const map = {
    off: ['SEM NUVEM', ''], out: ['NUVEM: DESCONECTADO', ''],
    in: ['NUVEM: CONECTADO', 'ok'], sync: ['SINCRONIZANDO…', 'ok'], err: ['ERRO DE SINCRONIA', 'err']
  };
  const [text, cls] = map[mode] || map.off;
  p.textContent = text; p.className = 'status-pill sync-pill ' + cls;
}

function initCloud() {
  if (!cloudEnabled()) {
    document.querySelectorAll('.cloud-only').forEach(e => e.style.display = 'none');
    setSyncPill('off');
    return;
  }
  supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supa.auth.onAuthStateChange((_event, session) => {
    cloudUser = session?.user || null;
    updateAuthUI();
    if (cloudUser) pullFromCloud(); else setSyncPill('out');
  });
  supa.auth.getSession().then(({ data }) => {
    cloudUser = data.session?.user || null;
    updateAuthUI();
    if (cloudUser) pullFromCloud(); else setSyncPill('out');
  });
}

function updateAuthUI() {
  const btn = $$('#cloudBtn'); if (!btn) return;
  btn.textContent = cloudUser ? `☁ ${cloudUser.email.split('@')[0]}` : '☁ CONTA';
}

function openAuthModal() { $$('#authModal')?.classList.add('open'); $$('#authMsg').textContent = ''; }
function closeAuthModal() { $$('#authModal')?.classList.remove('open'); }

async function doSignUp() {
  const email = $$('#authEmail').value.trim(), pass = $$('#authPassword').value;
  if (!email || pass.length < 6) { $$('#authMsg').textContent = 'E-mail válido e senha com 6+ caracteres.'; return; }
  const { error } = await supa.auth.signUp({ email, password: pass });
  $$('#authMsg').textContent = error ? error.message : 'Conta criada! Verifique seu e-mail se a confirmação estiver ativa, depois entre.';
}
async function doSignIn() {
  const email = $$('#authEmail').value.trim(), pass = $$('#authPassword').value;
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  if (error) { $$('#authMsg').textContent = error.message; return; }
  closeAuthModal();
}
async function doSignOut() {
  await supa.auth.signOut();
  cloudUser = null; updateAuthUI(); setSyncPill('out');
  window.showToast?.('CONTA', 'Sessão encerrada. Progresso continua salvo neste navegador.');
}

async function pullFromCloud() {
  if (!cloudUser) return;
  setSyncPill('sync');
  const { data, error } = await supa.from('player_state').select('data,updated_at').eq('user_id', cloudUser.id).maybeSingle();
  if (error) { setSyncPill('err'); return; }
  if (data?.data) {
    const localTime = window.getStateSavedAt ? window.getStateSavedAt() : 0;
    const remoteTime = data.updated_at ? new Date(data.updated_at).getTime() : 0;
    if (remoteTime >= localTime) {
      window.applyCloudState?.(data.data);
      window.showToast?.('NUVEM', 'Progresso sincronizado deste dispositivo.');
    }
  } else {
    pushToCloud(); // primeira vez: envia o progresso local para a nuvem
  }
  setSyncPill('in');
}

let pushTimeout = null;
function scheduleCloudPush() {
  if (!cloudUser || !supa) return;
  clearTimeout(pushTimeout);
  pushTimeout = setTimeout(pushToCloud, 1500);
}
async function pushToCloud() {
  if (!cloudUser || !supa) return;
  const payload = window.getStateSnapshot?.(); if (!payload) return;
  setSyncPill('sync');
  const { error } = await supa.from('player_state').upsert({
    user_id: cloudUser.id, data: payload, updated_at: new Date().toISOString()
  });
  setSyncPill(error ? 'err' : 'in');
}

function bindCloudUI() {
  $$('#cloudBtn')?.addEventListener('click', () => cloudUser ? doSignOut() : openAuthModal());
  $$('#authCloseBtn')?.addEventListener('click', closeAuthModal);
  $$('#authSignInBtn')?.addEventListener('click', doSignIn);
  $$('#authSignUpBtn')?.addEventListener('click', doSignUp);
  $$('#authModal')?.addEventListener('click', e => { if (e.target.id === 'authModal') closeAuthModal(); });
}

window.__cloudSync = scheduleCloudPush;
bindCloudUI();
initCloud();
