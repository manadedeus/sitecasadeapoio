const modal = document.querySelector('#dashboard-modal');
const openButton = document.querySelector('#open-dashboard');
const closeButton = document.querySelector('.close-modal');
const loginButton = document.querySelector('#demo-login');

function setModal(open) {
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
}

openButton.addEventListener('click', () => setModal(true));
closeButton.addEventListener('click', () => setModal(false));
modal.addEventListener('click', (event) => {
  if (event.target === modal) setModal(false);
});
loginButton.addEventListener('click', () => {
  document.querySelector('.modal-panel').innerHTML = `
    <button class="close-modal" aria-label="Fechar">×</button>
    <p class="eyebrow"><span></span> Painel de acolhimento</p>
    <h2 class="dashboard-title">Visão<br /><em>da casa.</em></h2>
    <div class="dashboard-stats"><div><strong>18</strong><span>acolhidos<br />ativos</span></div><div><strong>04</strong><span>atendimentos<br />hoje</span></div><div><strong>03</strong><span>novos<br />encaminhamentos</span></div></div>
    <label class="search-label">Buscar acolhido<input type="search" placeholder="Nome ou código de atendimento" /></label>
    <div class="resident-list"><div><span class="status-dot"></span><strong>Cadastro demonstrativo</strong><small>Em acompanhamento · atualizado hoje</small></div><span>→</span></div>
    <p class="privacy-note">Protótipo visual. Conecte autenticação e banco seguro antes de inserir dados reais.</p>`;
  document.querySelector('.close-modal').addEventListener('click', () => setModal(false));
});
document.querySelector('.menu-button').addEventListener('click', () => {
  document.querySelector('.main-nav').classList.toggle('mobile-open');
});

const revealItems = document.querySelectorAll('.intro-section, .work-section, .support-section, .staff-section, .work-cards article, .stat-row');
revealItems.forEach((item) => item.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => revealObserver.observe(item));