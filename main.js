/**
 * robloxport — main.js
 * Carregamento dinâmico de Data.json + interações da UI
 */

/* ── State ─────────────────────────────────────── */
const state = {
  data: null,
  activeFilter: 'all',
  activeSection: 'hero',
};

/* ── DOM refs ───────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ── Init ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initNav();
  initScrollSpy();
  initReveal();
  hideLoader();
});

/* ── Load Data.json ─────────────────────────────── */
async function loadData() {
  try {
    const res = await fetch('Data/Data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    renderAll();
  } catch (err) {
    console.error('[robloxport] Falha ao carregar Data.json:', err);
    renderError();
  }
}

function renderAll() {
  renderAuthor();
  renderProjects(state.data.systems);
  renderContact();
}

/* ── Author / About ─────────────────────────────── */
function renderAuthor() {
  const { author } = state.data;

  // Hero name
  const heroName = $('#hero-name');
  if (heroName) heroName.innerHTML = author.name || 'Dev';

  // Sidebar brand
  const brandName = $('#brand-name');
  if (brandName) brandName.textContent = author.name || 'robloxport';

  // About bio
  const bioParagraphs = $$('.about-bio-p');
  if (bioParagraphs.length && author.bio) {
    const sentences = author.bio.split('. ').filter(Boolean);
    bioParagraphs.forEach((p, i) => {
      p.textContent = sentences[i] ? sentences[i] + (sentences[i].endsWith('.') ? '' : '.') : '';
    });
  }
}

/* ── Projects ───────────────────────────────────── */
function renderProjects(systems) {
  const grid = $('#projects-grid');
  if (!grid) return;

  grid.innerHTML = '';

  systems.forEach((sys, i) => {
    const card = buildProjectCard(sys, i);
    grid.appendChild(card);

    // staggered reveal delay
    setTimeout(() => card.classList.add('visible'), i * 80);
  });

  buildFilterButtons(systems);
}

function buildProjectCard(sys) {
  const card = document.createElement('article');
  card.className = `project-card reveal${sys.featured ? ' featured' : ''}`;
  card.dataset.tags = sys.tags.join(',').toLowerCase();

  // Media
  const hasMedia = sys.gif && sys.gif.trim() !== '';
  const mediaHtml = hasMedia
    ? `<img src="${sys.gif}" alt="${sys.name} demo" loading="lazy" />`
    : `<div class="card-media-placeholder">
        <span class="ph-icon">⬛</span>
        <span>sem preview</span>
       </div>`;

  // Links
  const linksHtml = (sys.links && sys.links.length > 0)
    ? sys.links.map(l => `
        <a href="${l.url}" target="_blank" rel="noopener" class="card-link">
          ↗ ${l.label}
        </a>`).join('')
    : `<span class="card-no-links">// sem links públicos</span>`;

  // Tags
  const tagsHtml = sys.tags.map(t => `<span class="card-tag">${t}</span>`).join('');

  card.innerHTML = `
    <div class="card-media">${mediaHtml}</div>
    <div class="card-body">
      <div class="card-id">// ${sys.id}</div>
      <h3 class="card-title">${sys.name}</h3>
      <p class="card-desc">${sys.description}</p>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-footer">${linksHtml}</div>
    </div>
  `;

  return card;
}

function buildFilterButtons(systems) {
  const container = $('#projects-filter');
  if (!container) return;

  // Collect unique tags
  const allTags = new Set();
  systems.forEach(s => s.tags.forEach(t => allTags.add(t)));

  // Clear and rebuild
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'Todos';
  allBtn.dataset.filter = 'all';
  allBtn.addEventListener('click', () => applyFilter('all', allBtn));
  container.appendChild(allBtn);

  allTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = tag;
    btn.dataset.filter = tag.toLowerCase();
    btn.addEventListener('click', () => applyFilter(tag.toLowerCase(), btn));
    container.appendChild(btn);
  });
}

function applyFilter(filter, clickedBtn) {
  state.activeFilter = filter;

  $$('#projects-filter .filter-btn').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');

  $$('.project-card').forEach(card => {
    const tags = card.dataset.tags || '';
    const show = filter === 'all' || tags.includes(filter);
    card.style.display = show ? '' : 'none';
    if (show) {
      // re-trigger reveal animation
      card.classList.remove('visible');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => card.classList.add('visible'));
      });
    }
  });
}

/* ── Contact ────────────────────────────────────── */
function renderContact() {
  const { author } = state.data;
  const handleEl = $('#discord-handle');
  if (handleEl) handleEl.textContent = author.discord || '@—';

  const copyBtn = $('#copy-discord');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(author.discord || '').then(() => {
        copyBtn.textContent = '✓ copiado';
        copyBtn.classList.add('copied');
        showToast('Discord copiado!');
        setTimeout(() => {
          copyBtn.textContent = 'copiar';
          copyBtn.classList.remove('copied');
        }, 2000);
      });
    });
  }
}

/* ── Terminal animation (hero) ──────────────────── */
const TERMINAL_LINES = [
  { type: 'prompt', cmd: 'luau portfolio.lua', comment: '-- iniciando sistema' },
  { type: 'output', text: '> Carregando módulos...' },
  { type: 'output', text: '> DataStore conectado.' },
  { type: 'output', text: '> Sistemas online. Bem-vindo.' },
];

async function runTerminalAnimation() {
  const body = $('#terminal-body');
  if (!body) return;

  body.innerHTML = '';

  for (const line of TERMINAL_LINES) {
    await sleep(320);

    const el = document.createElement('div');
    el.className = 'terminal-line';

    if (line.type === 'prompt') {
      el.innerHTML = `
        <span class="terminal-prompt">❯</span>
        <span class="terminal-cmd">${line.cmd}</span>
        <span class="terminal-comment">&nbsp;${line.comment}</span>
      `;
    } else {
      el.innerHTML = `<span class="terminal-output">${line.text}</span>`;
    }

    body.appendChild(el);

    // Scroll to bottom
    body.scrollTop = body.scrollHeight;
    await sleep(180);
  }

  // Blinking cursor at end
  await sleep(200);
  const cursor = document.createElement('div');
  cursor.className = 'terminal-line';
  cursor.innerHTML = `<span class="terminal-prompt">❯</span><span class="terminal-cursor"></span>`;
  body.appendChild(cursor);
}

/* ── Navigation ─────────────────────────────────── */
function initNav() {
  $$('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const target = document.getElementById(item.dataset.section);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Start terminal after loader
  setTimeout(runTerminalAnimation, 1400);
}

/* ── Scroll Spy ─────────────────────────────────── */
function initScrollSpy() {
  const sections = $$('section[id]');
  const navItems = $$('.nav-item[data-section]');

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navItems.forEach(n => {
            n.classList.toggle('active', n.dataset.section === id);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
  );

  sections.forEach(s => obs.observe(s));
}

/* ── Reveal on scroll ───────────────────────────── */
function initReveal() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  $$('.reveal').forEach(el => obs.observe(el));
}

/* ── Loader ─────────────────────────────────────── */
function hideLoader() {
  const loader = $('#loading');
  if (!loader) return;
  setTimeout(() => loader.classList.add('hidden'), 1200);
}

/* ── Toast ──────────────────────────────────────── */
function showToast(msg) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ── Error fallback ─────────────────────────────── */
function renderError() {
  const grid = $('#projects-grid');
  if (grid) {
    grid.innerHTML = `
      <div style="font-family: var(--mono); color: var(--text-muted); font-size: 0.8rem; padding: 1rem; grid-column: 1/-1;">
        // Erro ao carregar Data/Data.json<br>
        // Verifique se o arquivo existe no repositório.
      </div>
    `;
  }
}

/* ── Utils ──────────────────────────────────────── */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
