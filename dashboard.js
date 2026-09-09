const config = window.SUPABASE_CONFIG || {};
const loginBox = document.getElementById('login-box');
const dashboardPanel = document.getElementById('dashboard-panel');
const authStatus = document.getElementById('auth-status');
const authMessage = document.getElementById('auth-message');
const logoutButton = document.getElementById('logout-button');
const loginButton = document.getElementById('login-button');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const originFilter = document.getElementById('origin-filter');
const newRecordButton = document.getElementById('new-record');
const recordEditor = document.getElementById('record-editor');
const importTrigger = document.getElementById('import-trigger');
const csvInput = document.getElementById('csv-input');
const tableBody = document.getElementById('acolhidos-table-body');
const overviewView = document.getElementById('overview-view');
const historyView = document.getElementById('history-view');
const reportsView = document.getElementById('reports-view');
const capacityInput = document.getElementById('capacity-input');
const reportMonth = document.getElementById('report-month');
const reportYear = document.getElementById('report-year');

const state = {
  session: null,
  signedIn: false
};

let supabaseClient = null;

const FIELD_DEFS = [
  ['origem_encaminhamento', 'Quem encaminhou / origem'], ['nome', 'Nome completo'], ['data_nascimento', 'Data de nascimento', 'date'],
  ['naturalidade', 'Naturalidade / estado'], ['sexo', 'Sexo'], ['rg', 'RG'], ['orgao_emissor', 'Órgão emissor'], ['documento', 'CPF'],
  ['telefone', 'Contato'], ['email', 'E-mail', 'email'], ['nome_pai', 'Nome do pai'], ['nome_mae', 'Nome da mãe'],
  ['contato_familiar', 'Contato do pai / mãe'], ['dependentes_renda', 'Pessoas dependentes da renda'], ['renda_familiar', 'Renda familiar'],
  ['problemas_justica', 'Problemas com a Justiça?'], ['problemas_vicios', 'Problemas com vícios?'], ['data_entrada', 'Data de entrada', 'date'],
  ['horario_chegada', 'Horário de chegada'], ['faixa_etaria', 'Faixa de idade'], ['identidade_genero', 'Identidade de gênero'],
  ['raca_cor_etnia', 'Raça / cor / etnia'], ['veio_de_outro_local', 'Veio de outro local?'], ['documentacao_basica', 'Documentação civil básica?'],
  ['beneficiario_programas', 'Beneficiário de programas?'], ['endereco', 'Endereço'], ['link_pasta', 'Link da pasta', 'url'],
  ['status', 'Situação'], ['motivo_desligamento', 'Motivo do desligamento'], ['data_desligamento', 'Data de desligamento', 'date'],
  ['tempo_na_casa', 'Tempo na casa'], ['reincidencia', 'Reincidência'], ['codigo_acolhido', 'Código do acolhido'], ['observacoes', 'Observações', 'textarea']
];

const filterState = { search: '', status: 'todos', origin: '' };

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
  overviewView.classList.add('hidden');
  historyView.classList.add('hidden');
  reportsView.classList.add('hidden');
  logoutButton.style.display = 'none';
}

function markLoggedIn() {
  state.signedIn = true;
  authStatus.textContent = 'Acesso autorizado';
  loginBox.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
  overviewView.classList.remove('hidden');
  logoutButton.style.display = 'inline-block';
}

function switchView(viewId) {
  [overviewView, dashboardPanel, historyView, reportsView].forEach((view) => view.classList.toggle('hidden', view.id !== viewId));
  document.querySelectorAll('.system-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === viewId));
}

function renderAcolhidos(rows) {
  const tbody = document.getElementById('acolhidos-table-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5">Nenhum acolhido cadastrado.</td></tr>';
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
        <td class="tiny-actions"><button type="button" data-action="edit" data-id="${item.id}">Editar</button><button type="button" data-action="delete" data-id="${item.id}">Excluir</button></td>
      </tr>
    `;
  }).join('');
}

function filteredRows() {
  const normalize = (value) => (value || '').toString().toLowerCase();
  const search = normalize(filterState.search);
  const origin = normalize(filterState.origin);
  return state.acolhidos.filter((item) => {
    const matchesSearch = !search || [item.nome, item.codigo_acolhido, item.documento, item.telefone].some((value) => normalize(value).includes(search));
    const matchesStatus = filterState.status === 'todos' || item.status === filterState.status;
    const matchesOrigin = !origin || normalize(item.origem_encaminhamento).includes(origin);
    return matchesSearch && matchesStatus && matchesOrigin;
  });
}

function refreshList() {
  renderAcolhidos(filteredRows());
  document.getElementById('lista-meta').textContent = `${filteredRows().length} de ${state.acolhidos.length} registros`;
}

function monthKey(value) {
  return value ? String(value).slice(0, 7) : '';
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function calculateStayDays(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const days = Math.max(0, Math.round((endDate - startDate) / 86400000));
  return `${days} dia${days === 1 ? '' : 's'}`;
}

function updateOverview() {
  const currentMonth = currentMonthKey();
  const active = state.acolhidos.filter((item) => item.status === 'ativo').length;
  const entries = state.acolhidos.filter((item) => monthKey(item.data_entrada) === currentMonth).length;
  const exits = state.acolhidos.filter((item) => monthKey(item.data_desligamento) === currentMonth || (item.status === 'egresso' && monthKey(item.atualizado_em) === currentMonth)).length;
  const capacity = Number(capacityInput.value || 0);
  document.getElementById('overview-ativos').textContent = String(active);
  document.getElementById('overview-entradas').textContent = String(entries);
  document.getElementById('overview-saidas').textContent = String(exits);
  document.getElementById('overview-vagas').textContent = capacity ? String(Math.max(capacity - active, 0)) : '—';
}

function renderHistory() {
  const search = (document.getElementById('history-search').value || '').toLowerCase();
  const start = document.getElementById('history-start').value;
  const end = document.getElementById('history-end').value;
  const rows = state.acolhidos.filter((item) => {
    const matchesSearch = !search || [item.nome, item.documento, item.codigo_acolhido].some((value) => (value || '').toLowerCase().includes(search));
    const matchesStart = !start || (item.data_entrada || '') >= start;
    const matchesEnd = !end || (item.data_entrada || '') <= end;
    return matchesSearch && matchesStart && matchesEnd;
  });
  document.getElementById('history-meta').textContent = `${rows.length} registros`;
  document.getElementById('history-table-body').innerHTML = rows.length ? rows.map((item) => `<tr><td>${item.nome || '—'}</td><td>${item.data_entrada || '—'}</td><td>${item.data_desligamento || (item.status === 'egresso' ? 'Registrada' : '—')}</td><td>${item.motivo_desligamento || '—'}</td><td>${item.origem_encaminhamento || '—'}</td><td>${item.codigo_acolhido || '—'}</td></tr>`).join('') : '<tr><td colspan="6">Nenhum registro encontrado.</td></tr>';
}

function generateReport() {
  const year = reportYear.value;
  const month = reportMonth.value.padStart(2, '0');
  const period = `${year}-${month}`;
  const entries = state.acolhidos.filter((item) => monthKey(item.data_entrada) === period);
  const exits = state.acolhidos.filter((item) => monthKey(item.data_desligamento) === period);
  const activeDuring = state.acolhidos.filter((item) => (item.data_entrada || '') <= `${period}-31` && (!item.data_desligamento || item.data_desligamento >= `${period}-01`));
  const origins = [...new Set(entries.map((item) => item.origem_encaminhamento).filter(Boolean))];
  document.getElementById('report-total').textContent = String(activeDuring.length);
  document.getElementById('report-entradas').textContent = String(entries.length);
  document.getElementById('report-saidas').textContent = String(exits.length);
  document.getElementById('report-permaneceram').textContent = String(Math.max(activeDuring.length - exits.length, 0));
  document.getElementById('report-table-body').innerHTML = `<tr><td>Origens dos novos acolhimentos</td><td>${origins.length ? origins.join(', ') : 'Nenhuma informada'}</td></tr><tr><td>Ativos ao final do período</td><td>${activeDuring.filter((item) => item.status === 'ativo').length}</td></tr><tr><td>Já passaram pela Casa</td><td>${activeDuring.filter((item) => item.status === 'egresso').length}</td></tr><tr><td>Tempo de permanência informado</td><td>${activeDuring.filter((item) => item.tempo_na_casa).length} registros</td></tr>`;
}

function initializeReportSelectors() {
  const now = new Date();
  reportMonth.innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${String(index + 1).padStart(2, '0')}</option>`).join('');
  reportMonth.value = String(now.getMonth() + 1);
  reportYear.innerHTML = Array.from({ length: 7 }, (_, index) => `<option>${now.getFullYear() - index}</option>`).join('');
  reportYear.value = String(now.getFullYear());
}

function openEditor(item = {}) {
  recordEditor.classList.remove('hidden');
  recordEditor.innerHTML = `<form id="record-form"><input type="hidden" name="id" value="${item.id || ''}"><div class="editor-grid">${FIELD_DEFS.map(([field, label, type]) => {
    const value = item[field] || '';
    const control = type === 'textarea' ? `<textarea name="${field}">${value}</textarea>` : field === 'sexo' ? `<select name="sexo"><option value="">Não informado</option><option value="feminino">Feminino</option><option value="masculino">Masculino</option><option value="outro">Outro</option></select>` : field === 'status' ? `<select name="status"><option value="ativo">Ativo</option><option value="egresso">Já passou pela casa</option><option value="em_acompanhamento">Em acompanhamento</option><option value="urgente">Urgente</option></select>` : `<input name="${field}" type="${type || 'text'}" value="${value}">`;
    return `<label class="${type === 'textarea' || field === 'endereco' ? 'wide' : ''}">${label}${control}</label>`;
  }).join('')}</div><div class="button-row"><button class="button button-primary" type="submit">Salvar cadastro</button><button class="button button-secondary" id="cancel-editor" type="button">Cancelar</button></div></form>`;
  const statusControl = recordEditor.querySelector('[name="status"]');
  if (statusControl) statusControl.value = item.status || 'em_acompanhamento';
  recordEditor.querySelector('#cancel-editor').addEventListener('click', () => recordEditor.classList.add('hidden'));
  recordEditor.querySelector('#record-form').addEventListener('submit', saveRecord);
}

async function saveRecord(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  if (!values.nome.trim()) { authMessage.textContent = 'Informe o nome completo.'; return; }
  ['data_nascimento', 'data_entrada', 'data_desligamento'].forEach((field) => { if (!values[field]) values[field] = null; });
  const id = values.id;
  delete values.id;
  const previous = id ? state.acolhidos.find((item) => item.id === id) : null;
  const sameDocument = values.documento ? state.acolhidos.filter((item) => item.documento === values.documento && item.id !== id) : [];
  if (!id && !values.codigo_acolhido) values.codigo_acolhido = `CAMD-${new Date().getFullYear()}-${String(state.acolhidos.length + 1).padStart(3, '0')}`;
  if (!id && !values.reincidencia) values.reincidencia = sameDocument.length ? `${sameDocument.length + 1}ª entrada` : '1ª entrada';
  if (values.status === 'egresso' && !values.data_desligamento) values.data_desligamento = formatDateInput(new Date());
  if (values.status === 'egresso' && !values.tempo_na_casa) values.tempo_na_casa = calculateStayDays(values.data_entrada, values.data_desligamento);
  values.atualizado_em = new Date().toISOString();
  const result = id ? await supabaseClient.from('acolhidos').update(values).eq('id', id) : await supabaseClient.from('acolhidos').insert(values).select().single();
  if (result.error) { authMessage.textContent = 'Não foi possível salvar: ' + result.error.message; return; }
  const saved = id ? { id, ...values } : result.data;
  const movementType = !id ? 'entrada' : previous?.status !== values.status ? (values.status === 'egresso' ? 'saida' : 'alteracao_status') : null;
  if (movementType) {
    await supabaseClient.from('acolhido_movimentacoes').insert({ acolhido_id: saved.id, tipo: movementType, data_evento: values.data_desligamento || values.data_entrada || new Date().toISOString().slice(0, 10), status_anterior: previous?.status || null, status_novo: values.status, motivo: values.motivo_desligamento || null, observacoes: values.observacoes || null, criado_por: state.session?.user?.id || null });
  }
  recordEditor.classList.add('hidden');
  authMessage.textContent = 'Cadastro salvo com sucesso.';
  await loadDashboardData();
}

async function deleteRecord(id) {
  authMessage.textContent = 'O histórico não é apagado. Edite o cadastro e altere o status para Já passou pela casa.';
}

function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const item = state.acolhidos.find((entry) => entry.id === button.dataset.id);
  if (button.dataset.action === 'edit') openEditor(item);
  if (button.dataset.action === 'delete') deleteRecord(button.dataset.id);
}

function normalizeHeader(value) {
  return (value || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s:?.]+$/g, '').replace(/\s+/g, ' ');
}

function importRows(rows) {
  const aliases = {
    nome: ['nome', 'nome completo'], data_nascimento: ['data de nascimento', 'nascimento'], documento: ['cpf', 'documento'],
    rg: ['rg'], orgao_emissor: ['orgao emissor'], telefone: ['contato', 'telefone'], email: ['email'], origem_encaminhamento: ['enviado', 'origem'], naturalidade: ['naturalidade / estado'], sexo: ['sexo'],
    nome_pai: ['nome do pai'], nome_mae: ['nome da mae'], contato_familiar: ['contato do pai/mae'], dependentes_renda: ['pessoas que dependem da renda familiar'],
    renda_familiar: ['renda familiar'], problemas_justica: ['problemas com a justica'], problemas_vicios: ['problemas com vicios'], data_entrada: ['data de entrada'], horario_chegada: ['horario de chegada'], faixa_etaria: ['faxetaria de idade'], identidade_genero: ['indentidade de genero'],
    raca_cor_etnia: ['raca/ cor/ etinia', 'raca/ cor/ etnia'], veio_de_outro_local: ['veio de outros municipios/ estado/ outros paises'], documentacao_basica: ['possui doumentacao civil basica'],
    beneficiario_programas: ['beneficiario de programas', 'acolido e beneficiario de programas e beneficios'], observacoes: ['observacao'], link_pasta: ['links das pastas'], status: ['situacao', 'status'], motivo_desligamento: ['motivo de deligamento'],
    data_desligamento: ['data de deligamento'], tempo_na_casa: ['tempo na casa'], reincidencia: ['reincidencia'], codigo_acolhido: ['codigo do acolhido']
  };
  return rows.map((row) => {
    const keys = Object.keys(row);
    const result = {};
    Object.entries(aliases).forEach(([field, names]) => {
      const key = keys.find((candidate) => names.includes(normalizeHeader(candidate)));
      result[field] = key ? String(row[key] || '').trim() : null;
    });
    const status = normalizeHeader(result.status);
    result.status = status.includes('desligado') ? 'egresso' : status.includes('ativo') ? 'ativo' : 'em_acompanhamento';
    ['data_nascimento', 'data_entrada', 'data_desligamento'].forEach((field) => {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(result[field] || '')) { const [day, month, year] = result[field].split('/'); result[field] = `${year}-${month}-${day}`; }
    });
    return result;
  }).filter((row) => row.nome);
}

async function importSpreadsheet(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
  const rows = importRows(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }));
  if (!rows.length) { authMessage.textContent = 'Nenhum cadastro válido encontrado.'; return; }
  const { error } = await supabaseClient.from('acolhidos').insert(rows);
  if (error) { authMessage.textContent = 'Não foi possível importar: ' + error.message; return; }
  authMessage.textContent = `${rows.length} cadastros importados com sucesso.`;
  csvInput.value = '';
  await loadDashboardData();
}

async function loadDashboardData() {
  const supabase = supabaseClient;
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

  state.acolhidos = data || [];
  refreshList();
  document.getElementById('total-acolhidos').textContent = String(state.acolhidos.length);
  document.getElementById('ativos-hoje').textContent = String(state.acolhidos.filter((item) => item.status === 'ativo').length);
  document.getElementById('encaminhamentos').textContent = String(state.acolhidos.filter((item) => item.origem_encaminhamento).length);
  document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleDateString('pt-BR');
  updateOverview();
  renderHistory();
}

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authMessage.textContent = 'Preencha e-mail e senha para continuar.';
    return;
  }

  const supabase = supabaseClient;
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
  const supabase = supabaseClient;
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

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    authMessage.textContent = 'A biblioteca do Supabase não carregou corretamente.';
    return;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);

  authMessage.textContent = 'Supabase conectado. Faça login com a conta do colaborador.';
  markLoggedOut();
}

loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});
searchInput.addEventListener('input', (event) => { filterState.search = event.target.value; refreshList(); });
statusFilter.addEventListener('change', (event) => { filterState.status = event.target.value; refreshList(); });
originFilter.addEventListener('input', (event) => { filterState.origin = event.target.value; refreshList(); });
newRecordButton.addEventListener('click', () => openEditor());
importTrigger.addEventListener('click', () => csvInput.click());
csvInput.addEventListener('change', importSpreadsheet);
tableBody.addEventListener('click', handleTableClick);
document.querySelectorAll('.system-tab').forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
document.getElementById('history-search').addEventListener('input', renderHistory);
document.getElementById('history-start').addEventListener('change', renderHistory);
document.getElementById('history-end').addEventListener('change', renderHistory);
document.getElementById('generate-report').addEventListener('click', generateReport);
document.getElementById('capacity-save').addEventListener('click', async () => {
  const capacity = Number(capacityInput.value || 0);
  const { error } = await supabaseClient.from('configuracoes_casa').upsert({ id: 1, capacidade_total: capacity, atualizado_por: state.session?.user?.id });
  authMessage.textContent = error ? 'Não foi possível salvar a capacidade: ' + error.message : 'Capacidade atualizada.';
  updateOverview();
});

initializeReportSelectors();
initializeSupabase();
