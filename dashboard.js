const config = window.SUPABASE_CONFIG || {};
const loginBox = document.getElementById('login-box');
const dashboardPanel = document.getElementById('dashboard-panel');
const authStatus = document.getElementById('auth-status');
const authMessage = document.getElementById('auth-message');
const logoutButton = document.getElementById('logout-button');
const loginButton = document.getElementById('login-button');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

const state = {
  session: null,
  signedIn: false
};

function isConfigured() {
  return Boolean(config.url && config.anonKey && config.url !== '' && config.anonKey !== '');
}

function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), 15000);
    })
  ]);
}

function markLoggedOut() {
  state.signedIn = false;
  state.session = null;
  authStatus.textContent = 'Acesso pendente';
  loginBox.classList.remove('hidden');
  dashboardPanel.classList.add('hidden');
  logoutButton.style.display = 'none';
}

function markLoggedIn() {
  state.signedIn = true;
  authStatus.textContent = 'Acesso autorizado';
  loginBox.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
  logoutButton.style.display = 'inline-block';
}

function renderAcolhidos(rows) {
  const tbody = document.getElementById('acolhidos-table-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4">Nenhum acolhido cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((item) => {
    const statusClass = item.status || 'em-acompanhamento';
    const statusLabel = item.status === 'ativo' ? 'Ativo' : item.status === 'urgente' ? 'Urgente' : 'Em acompanhamento';
    return `
      <tr>
        <td>${item.nome || 'Sem nome'}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>${item.telefone || '—'}</td>
        <td>${item.atualizado_em ? new Date(item.atualizado_em).toLocaleDateString('pt-BR') : '—'}</td>
      </tr>
    `;
  }).join('');
}

async function loadDashboardData() {
  const supabase = window.supabase;
  if (!supabase || !state.session) {
    return;
  }

  const { data, error } = await withTimeout(
    supabase.from('acolhidos').select('*').order('atualizado_em', { ascending: false }),
    'O carregamento dos acolhidos demorou demais. Verifique sua conexão e tente novamente.'
  );
  if (error) {
    authMessage.textContent = 'Erro ao carregar os dados do painel: ' + error.message;
    return;
  }

  renderAcolhidos(data || []);
  document.getElementById('total-acolhidos').textContent = String(data?.length || 0);
  document.getElementById('ativos-hoje').textContent = String((data || []).filter((item) => item.status === 'ativo').length);
  document.getElementById('encaminhamentos').textContent = String((data || []).filter((item) => item.status === 'urgente').length);
  document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleDateString('pt-BR');
}

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authMessage.textContent = 'Preencha e-mail e senha para continuar.';
    return;
  }

  const supabase = window.supabase;
  if (!supabase || !isConfigured()) {
    authMessage.textContent = 'Ainda falta configurar a URL e a chave pública do Supabase no arquivo supabase-config.js.';
    return;
  }

  authMessage.textContent = 'Entrando no painel...';
  loginButton.disabled = true;
  loginButton.textContent = 'Entrando...';

  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'O login demorou demais. Verifique sua conexão e tente novamente.'
    );
    if (error) {
      authMessage.textContent = 'Não foi possível entrar: ' + error.message;
      return;
    }

    state.session = data.session;
    markLoggedIn();
    authMessage.textContent = 'Login realizado com sucesso.';
    await loadDashboardData();
  } catch (error) {
    authMessage.textContent = error.message || 'Não foi possível concluir o login.';
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Acessar painel';
  }
}

async function logout() {
  const supabase = window.supabase;
  if (!supabase) return;
  await supabase.auth.signOut();
  markLoggedOut();
  authMessage.textContent = 'Sessão encerrada.';
}

function initializeSupabase() {
  if (!isConfigured()) {
    markLoggedOut();
    authMessage.textContent = 'Configure a URL e a chave pública do Supabase para ativar o login real.';
    logoutButton.style.display = 'none';
    return;
  }

  window.supabase = window.supabase || window.createClient(config.url, config.anonKey);
  if (typeof window.supabase === 'undefined') {
    authMessage.textContent = 'A biblioteca do Supabase não carregou corretamente.';
    return;
  }

  authMessage.textContent = 'Supabase conectado. Faça login com a conta do colaborador.';
  markLoggedOut();
}

loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});

initializeSupabase();
