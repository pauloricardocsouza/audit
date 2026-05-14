// ============================================================
// R2 Audit · shared.js
// Núcleo: Firebase, auth, helpers, formatters, sidebar shell
// ============================================================

(function () {
  'use strict';

  const CFG = window.R2A_CONFIG;
  const R2A = window.R2A = window.R2A || {};

  // Atalho para path relativo (corrige links quando estamos em subpasta)
  function rel(href) {
    if (href.startsWith('http') || href.startsWith('/')) return href;
    const segments = window.location.pathname.split('/').filter(Boolean);
    const inSubfolder = segments.length >= 2 && segments[segments.length - 1].includes('.html');
    if (inSubfolder) {
      const currentFolder = segments[segments.length - 2];
      if (href.startsWith(currentFolder + '/')) {
        return href.slice(currentFolder.length + 1);
      }
      return '../' + href;
    }
    return href;
  }

  R2A.rel = rel;

  // ----------------------------------------------------------
  // FIREBASE
  // ----------------------------------------------------------
  let _db = null, _auth = null, _fbApp = null;

  R2A.initFirebase = function () {
    if (CFG.MODO_DEV) return false;
    if (_fbApp) return true;
    try {
      _fbApp = firebase.initializeApp(CFG.FIREBASE);
      _db = firebase.firestore();
      _auth = firebase.auth();
      return true;
    } catch (e) {
      console.error('[R2A] Firebase falhou:', e);
      return false;
    }
  };
  R2A.db = () => _db;
  R2A.auth = () => _auth;

  // ----------------------------------------------------------
  // SESSÃO
  // ----------------------------------------------------------
  const SESSION_KEY = 'r2a_session';

  R2A.session = {
    get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } },
    set(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); },
    clear() { sessionStorage.removeItem(SESSION_KEY); },
    isLoggedIn() { return !!this.get(); },
    user() { return this.get() || { uid: 'dev', email: 'dev@local', nome: 'Desenvolvedor', perfil: 'admin', iniciais: 'DV' }; }
  };

  R2A.requireAuth = function (redirectTo) {
    if (CFG.MODO_DEV) return true;
    if (!R2A.session.isLoggedIn()) {
      window.location.href = redirectTo || rel('login.html');
      return false;
    }
    return true;
  };

  R2A.login = async function (email, senha) {
    if (CFG.MODO_DEV) {
      const fake = {
        uid: 'dev', email,
        nome: email.split('@')[0] || 'Usuário',
        perfil: 'admin',
        iniciais: (email[0] || 'U').toUpperCase()
      };
      R2A.session.set(fake);
      return fake;
    }
    if (!R2A.initFirebase()) throw new Error('Firebase indisponível');
    const cred = await _auth.signInWithEmailAndPassword(email, senha);
    const snap = await _db.collection(CFG.COLLECTIONS.USUARIOS).doc(cred.user.uid).get();
    const dados = snap.exists ? snap.data() : { nome: email, perfil: 'operador' };
    const user = {
      uid: cred.user.uid, email: cred.user.email,
      nome: dados.nome || email, perfil: dados.perfil || 'operador',
      iniciais: R2A.iniciais(dados.nome || email)
    };
    R2A.session.set(user);
    return user;
  };

  R2A.logout = async function () {
    try { if (_auth) await _auth.signOut(); } catch {}
    R2A.session.clear();
    window.location.href = rel('login.html');
  };

  R2A.iniciais = function (nome) {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };

  // ----------------------------------------------------------
  // FORMATTERS
  // ----------------------------------------------------------
  R2A.fmt = {
    moeda(v, { sinal = true } = {}) {
      const n = Number(v) || 0;
      const s = 'R$ ' + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (!sinal) return s;
      return n < 0 ? '-' + s : s;
    },
    data(d) {
      if (!d) return '';
      if (d instanceof Date) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
      }
      const [y, m, day] = String(d).split('-');
      return `${day}/${m}/${y}`;
    },
    dataCurta(d) { const [, m, day] = String(d).split('-'); return `${day}/${m}`; },
    dataHora(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    periodoBR(d) {
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const dt = d ? new Date(d) : new Date();
      return `${meses[dt.getMonth()]} · ${dt.getFullYear()}`;
    }
  };

  // ----------------------------------------------------------
  // TOAST
  // ----------------------------------------------------------
  R2A.toast = function (msg, type = 'info', timeout = 3000) {
    let c = document.getElementById('r2-toasts');
    if (!c) {
      c = document.createElement('div');
      c.id = 'r2-toasts';
      c.className = 'r2-toasts';
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'true');
      document.body.appendChild(c);
    }
    const el = document.createElement('div');
    el.className = `r2-toast ${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.2s';
      setTimeout(() => el.remove(), 250);
    }, timeout);
  };

  R2A.confirm = function (msg) { return Promise.resolve(window.confirm(msg)); };

  // ----------------------------------------------------------
  // ÍCONES SVG (inline, stroke 1.8, currentColor)
  // ----------------------------------------------------------
  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>',
    conciliador: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a2 2 0 0 1 2-2h16"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a2 2 0 0 1-2 2H3"/></svg>',
    contratos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    sep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };

  function moduleIcon(id) {
    return ICONS[id] || ICONS.contratos;
  }

  // ----------------------------------------------------------
  // SHELL: renderiza sidebar + topbar + footer
  // active = { modulo: 'conciliador', item: 'conciliacao' } ou { dashboardGeral: true }
  // Estrutura nova .r2-side / .r2-top (compatível com .r2a-sidebar legado via aliases CSS)
  // ----------------------------------------------------------
  R2A.renderShell = function (active = {}) {
    const u = R2A.session.user();
    const collapsed = localStorage.getItem('r2a_sidebar_collapsed') === '1';

    // Skip link · primeira parada do Tab pra acessibilidade
    if (!document.getElementById('r2-skip-link')) {
      const skip = document.createElement('a');
      skip.id = 'r2-skip-link';
      skip.className = 'r2-skip';
      skip.href = '#r2-main-content';
      skip.textContent = 'Pular para o conteúdo';
      document.body.insertBefore(skip, document.body.firstChild);
    }

    // Garante a classe .r2-app no container
    const shell = document.querySelector('.r2a-shell, .r2-app');
    if (shell) shell.classList.toggle('is-collapsed', collapsed);
    if (shell) shell.classList.toggle('sidebar-collapsed', collapsed);

    // Marca a área de conteúdo principal como destino do skip link
    const content = document.querySelector('.r2a-content, .r2-content');
    if (content) {
      content.id = 'r2-main-content';
      content.setAttribute('role', 'main');
      content.setAttribute('tabindex', '-1');
    }

    // ---------------- SIDEBAR ----------------
    const sidebar = document.querySelector('.r2a-sidebar, .r2-side');
    if (sidebar) {
      sidebar.className = (sidebar.className.replace(/(^|\s)(r2a-sidebar|r2-side)(\s|$)/g, ' ').trim() + ' r2-side r2a-sidebar').trim();
      const userIniciais = (u.iniciais || (u.nome ? u.nome.slice(0, 2).toUpperCase() : 'DV'));

      sidebar.id = 'r2-side-main';
      sidebar.setAttribute('role', 'navigation');
      sidebar.setAttribute('aria-label', 'Navegação principal');
      sidebar.innerHTML = `
        <div class="r2-side__brand">
          <a href="${rel('index.html')}" style="display:flex;align-items:center;" aria-label="Ir para o Dashboard geral">
            <img src="${rel('logoR2azul.png')}" alt="R2 Soluções Empresariais">
          </a>
        </div>

        <div class="r2-side__pill" aria-label="${CFG.APP_NAME} versão ${CFG.APP_VERSION}">
          <span class="dot" aria-hidden="true"></span> ${CFG.APP_NAME} · v${CFG.APP_VERSION}
        </div>

        <nav class="r2-side__nav" aria-label="Itens de navegação">
          <a href="${rel('index.html')}" class="r2-side__item ${active.dashboardGeral ? 'is-active' : ''}" ${active.dashboardGeral ? 'aria-current="page"' : ''}>
            ${ICONS.home}<span>Dashboard geral</span>
          </a>
          ${u.perfil === 'admin' ? `
            <a href="${rel('auditoria.html')}" class="r2-side__item ${active.auditoria ? 'is-active' : ''}" ${active.auditoria ? 'aria-current="page"' : ''}>
              ${ICONS.audit}<span>Auditoria</span>
            </a>
          ` : ''}

          <div class="r2-side__group" role="presentation">Módulos</div>

          ${CFG.MODULOS.map(m => {
            const isActive = active.modulo === m.id;
            const submenuOpen = isActive || localStorage.getItem('r2a_sb_open_' + m.id) === '1';
            const firstHref = m.itens && m.itens[0] ? rel(m.itens[0].href) : '#';
            return `
              <button class="r2-side__item has-sub ${isActive ? 'is-active' : ''} ${submenuOpen ? 'is-expanded' : ''}" data-module="${m.id}" data-first-href="${firstHref}" aria-expanded="${submenuOpen}" aria-controls="r2-sub-${m.id}">
                ${moduleIcon(m.id)}<span>${m.label}</span>${ICONS.chev}
              </button>
              <div class="r2-side__sub ${submenuOpen ? 'is-open' : ''}" data-sub-of="${m.id}" id="r2-sub-${m.id}" role="group" aria-label="Itens de ${m.label}">
                ${m.itens.map(it => `
                  <a href="${rel(it.href)}" class="${active.modulo === m.id && active.item === it.id ? 'is-active' : ''}" ${active.modulo === m.id && active.item === it.id ? 'aria-current="page"' : ''}>${it.label}</a>
                `).join('')}
              </div>
            `;
          }).join('')}
        </nav>

        <div class="r2-side__user">
          <div class="avatar" aria-hidden="true">${userIniciais}</div>
          <div class="meta">
            <div class="name">${u.nome}</div>
            <div class="role">${u.perfil === 'admin' ? 'Administrador' : 'Operador'}</div>
          </div>
          <button class="logout" id="r2-logout" title="Sair" aria-label="Sair da sessão">${ICONS.logout}</button>
        </div>
      `;

      // Eventos: clique no item de módulo abre/fecha submenu; duplo-clique navega
      document.querySelectorAll('.r2-side__item.has-sub').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.module;
          const sub = document.querySelector(`.r2-side__sub[data-sub-of="${id}"]`);
          if (!sub) return;
          const opened = sub.classList.toggle('is-open');
          b.classList.toggle('is-expanded', opened);
          b.setAttribute('aria-expanded', opened ? 'true' : 'false');
          localStorage.setItem('r2a_sb_open_' + id, opened ? '1' : '0');
        });
        b.addEventListener('dblclick', () => {
          const href = b.dataset.firstHref;
          if (href && href !== '#') window.location.href = href;
        });
      });

      const lg = document.getElementById('r2-logout');
      if (lg) lg.addEventListener('click', () => R2A.logout());
    }

    // ---------------- TOPBAR ----------------
    const topbar = document.querySelector('.r2a-topbar, .r2-top');
    if (topbar) {
      topbar.className = (topbar.className.replace(/(^|\s)(r2a-topbar|r2-top)(\s|$)/g, ' ').trim() + ' r2-top r2a-topbar').trim();
      const crumbs = [];
      if (active.dashboardGeral) crumbs.push({ label: 'Dashboard geral', last: true });
      else if (active.auditoria) crumbs.push({ label: 'Auditoria', last: true });
      else if (active.modulo) {
        const m = CFG.MODULOS.find(x => x.id === active.modulo);
        if (m) {
          crumbs.push({ label: m.label, last: !active.item });
          if (active.item) {
            const it = m.itens.find(x => x.id === active.item);
            if (it) crumbs.push({ label: it.label, last: true });
          }
        }
      }
      const crumbsHtml = crumbs.map((c, i) =>
        `<span class="${c.last ? 'is-current' : ''}">${c.label}</span>${!c.last ? ICONS.sep : ''}`
      ).join('');

      topbar.innerHTML = `
        <div class="r2-top__left">
          <button class="r2-top__menu" id="r2-top-menu" title="Menu" aria-label="Abrir/fechar menu lateral" aria-controls="r2-side-main">${ICONS.menu}</button>
          <nav class="r2-crumbs">${crumbsHtml}</nav>
        </div>
        <div class="r2-top__right">
          <div class="r2-search">
            ${ICONS.search}
            <input placeholder="Buscar lançamento, conta, contrato…" id="r2-search-global" aria-label="Buscar global">
          </div>
          <button class="r2-icon-btn" id="r2-bell" title="Notificações" aria-label="Abrir notificações" aria-haspopup="true" aria-expanded="false">${ICONS.bell}</button>
        </div>
      `;

      const bell = document.getElementById('r2-bell');
      if (bell) {
        bell.addEventListener('click', (e) => {
          e.stopPropagation();
          R2A._toggleNotifications(bell);
        });
        // Atualiza dot/contagem em background
        R2A._refreshBell();
      }

      const menuBtn = document.getElementById('r2-top-menu');
      if (menuBtn) menuBtn.addEventListener('click', () => {
        const sh = document.querySelector('.r2a-shell, .r2-app');
        const sd = document.querySelector('.r2a-sidebar, .r2-side');
        if (!sh || !sd) return;
        // Mobile: abre/fecha como overlay com backdrop
        if (window.innerWidth < 760) {
          const opened = sd.classList.toggle('is-open');
          R2A._toggleSideBackdrop(opened);
        } else {
          // Desktop: alterna colapsada/expandida e persiste
          const next = !sh.classList.contains('is-collapsed');
          sh.classList.toggle('is-collapsed', next);
          sh.classList.toggle('sidebar-collapsed', next);
          localStorage.setItem('r2a_sidebar_collapsed', next ? '1' : '0');
        }
      });
    }

    // Em mobile: clique em link da sidebar fecha overlay automaticamente
    if (sidebar) {
      sidebar.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          if (window.innerWidth < 760) {
            sidebar.classList.remove('is-open');
            R2A._toggleSideBackdrop(false);
          }
        });
      });
    }
  };

  // ----------------------------------------------------------
  // NOTIFICAÇÕES (sino do topbar)
  // ----------------------------------------------------------
  R2A.notifications = {
    _cache: null,
    _cacheAt: 0,

    async compute() {
      // cache de 30s para evitar recomputar a cada toggle
      if (this._cache && (Date.now() - this._cacheAt) < 30000) return this._cache;
      const out = [];
      const COL = CFG.COLLECTIONS;

      // 1. Lançamentos ambíguos (Conciliador)
      try {
        const banco = await R2A.data.list(COL.LANCAMENTOS_BANCO);
        const amb = banco.filter(b => b.status === 'ambiguo');
        if (amb.length > 0) {
          out.push({
            severidade: 'warn',
            icone: '◆',
            titulo: `${amb.length} lançamento${amb.length > 1 ? 's' : ''} ambíguo${amb.length > 1 ? 's' : ''}`,
            sub: 'Requer revisão manual no Conciliador',
            href: rel('conciliador/conciliacao.html')
          });
        }
      } catch {}

      // 2. Parcelas em atraso + próximas 30d (Análise Contratos)
      let contratosCache = null;
      try {
        if (R2A.contratos && R2A.contratos.kpisDashboard) {
          contratosCache = await R2A.data.list(COL.CONTRATOS);
          const lancs = await R2A.data.list(COL.LANCAMENTOS_BANCO);
          const k = R2A.contratos.kpisDashboard(contratosCache, lancs);
          if (k.qtdAtraso > 0) {
            out.push({
              severidade: 'err',
              icone: '!',
              titulo: `${k.qtdAtraso} parcela${k.qtdAtraso > 1 ? 's' : ''} em atraso`,
              sub: `Total ${R2A.fmt.moeda(k.totalAtraso, { sinal: false })}`,
              href: rel('contratos/dashboard.html')
            });
          }
          if (k.qtdProx30 > 0) {
            out.push({
              severidade: 'info',
              icone: '⏱',
              titulo: `${k.qtdProx30} parcela${k.qtdProx30 > 1 ? 's' : ''} a vencer (30 dias)`,
              sub: `Total ${R2A.fmt.moeda(k.totalProx30, { sinal: false })}`,
              href: rel('contratos/dashboard.html')
            });
          }
        }
      } catch {}

      // 3. Meses antigos não fechados (>90 dias)
      try {
        const banco = await R2A.data.list(COL.LANCAMENTOS_BANCO);
        const periodos = await R2A.periodos.list();
        const fechados = new Set(periodos.filter(p => p.status === 'fechado').map(p => p.mes));
        const mesesObs = new Set();
        banco.forEach(b => { if (b.data) mesesObs.add(String(b.data).slice(0, 7)); });
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        let antigos = 0;
        mesesObs.forEach(mes => {
          if (mes >= mesAtual) return;
          if (fechados.has(mes)) return;
          const [y, m] = mes.split('-').map(Number);
          const fimMes = new Date(y, m, 0);
          const dias = Math.floor((hoje - fimMes) / 86400000);
          if (dias > 90) antigos++;
        });
        if (antigos > 0) {
          out.push({
            severidade: 'warn',
            icone: '◷',
            titulo: `${antigos} mês${antigos > 1 ? 'es' : ''} aberto${antigos > 1 ? 's' : ''} há +90 dias`,
            sub: 'Considere fechar contabilmente',
            href: rel('conciliador/periodos.html')
          });
        }
      } catch {}

      // 4. Contratos ativos sem PDF anexado
      try {
        const contratos = contratosCache || await R2A.data.list(COL.CONTRATOS);
        const semPDF = contratos.filter(c =>
          c.estado === 'ativo' &&
          (!c.pdf_original || !c.pdf_original.url)
        );
        if (semPDF.length > 0) {
          out.push({
            severidade: 'info',
            icone: '◫',
            titulo: `${semPDF.length} contrato${semPDF.length > 1 ? 's' : ''} sem PDF anexado`,
            sub: 'Faça upload do arquivo original',
            href: rel('contratos/contratos.html')
          });
        }
      } catch {}

      this._cache = out;
      this._cacheAt = Date.now();
      return out;
    },

    invalidate() { this._cache = null; this._cacheAt = 0; }
  };

  R2A._refreshBell = async function () {
    try {
      const items = await R2A.notifications.compute();
      const bell = document.getElementById('r2-bell');
      if (!bell) return;
      bell.classList.toggle('has-dot', items.length > 0);
      bell.setAttribute('data-count', items.length);
    } catch {}
  };

  R2A._toggleNotifications = async function (anchor) {
    let dd = document.getElementById('r2-notif-dropdown');
    if (dd) {
      dd.remove();
      document.removeEventListener('click', R2A._closeNotifOnOutside);
      anchor.setAttribute('aria-expanded', 'false');
      return;
    }
    dd = document.createElement('div');
    dd.id = 'r2-notif-dropdown';
    dd.className = 'r2-notif-dropdown';
    dd.setAttribute('role', 'dialog');
    dd.setAttribute('aria-label', 'Notificações');
    anchor.setAttribute('aria-expanded', 'true');
    const rect = anchor.getBoundingClientRect();
    dd.style.position = 'fixed';
    dd.style.top = (rect.bottom + 8) + 'px';
    dd.style.right = Math.max(14, window.innerWidth - rect.right) + 'px';

    dd.innerHTML = `
      <div class="r2-notif__head">
        <span>Notificações</span>
        <button class="r2-notif__close" title="Fechar">✕</button>
      </div>
      <div class="r2-notif__body"><div class="r2-spin" style="margin: 24px auto; display: block;"></div></div>
    `;
    document.body.appendChild(dd);
    dd.querySelector('.r2-notif__close').addEventListener('click', () => R2A._toggleNotifications(anchor));

    setTimeout(() => document.addEventListener('click', R2A._closeNotifOnOutside), 10);

    const items = await R2A.notifications.compute();
    const body = dd.querySelector('.r2-notif__body');
    if (items.length === 0) {
      body.innerHTML = '<div class="r2-notif__empty"><div style="font-size:24px;margin-bottom:6px;opacity:.4;">✓</div>Nada pendente · tudo em dia</div>';
    } else {
      body.innerHTML = items.map(item => `
        <a class="r2-notif__item" href="${item.href}">
          <div class="r2-notif__ico ${item.severidade}">${item.icone}</div>
          <div class="r2-notif__info">
            <div class="title">${item.titulo}</div>
            <div class="sub">${item.sub}</div>
          </div>
        </a>
      `).join('');
    }
  };

  R2A._closeNotifOnOutside = function (e) {
    const dd = document.getElementById('r2-notif-dropdown');
    if (dd && !dd.contains(e.target) && !e.target.closest('#r2-bell')) {
      dd.remove();
      document.removeEventListener('click', R2A._closeNotifOnOutside);
    }
  };

  // ESC global · fecha modais, sidebar mobile e dropdown de notificações
  // TAB · prende foco dentro do modal aberto (focus trap acessível)
  function getFocusableIn(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
  }
  function getOpenModal() {
    return document.querySelector('.r2-modal-backdrop.is-open, .r2a-modal-backdrop.open');
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.r2-modal-backdrop.is-open, .r2a-modal-backdrop.open').forEach(m => {
        m.classList.remove('is-open');
        m.classList.remove('open');
      });
      const sd = document.querySelector('.r2a-sidebar.is-open, .r2-side.is-open');
      if (sd) { sd.classList.remove('is-open'); R2A._toggleSideBackdrop && R2A._toggleSideBackdrop(false); }
      const dd = document.getElementById('r2-notif-dropdown');
      if (dd) {
        dd.remove();
        document.removeEventListener('click', R2A._closeNotifOnOutside);
        const bell = document.getElementById('r2-bell');
        if (bell) bell.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    if (e.key === 'Tab') {
      const modal = getOpenModal();
      if (!modal) return;
      const focusables = getFocusableIn(modal);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Quando um modal abre, foca no primeiro elemento focável
  new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.attributeName === 'class') {
        const t = m.target;
        const aberto = t.classList && (t.classList.contains('is-open') || t.classList.contains('open'));
        const isBackdrop = t.classList && (t.classList.contains('r2-modal-backdrop') || t.classList.contains('r2a-modal-backdrop'));
        if (isBackdrop && aberto) {
          t.setAttribute('role', 'dialog');
          t.setAttribute('aria-modal', 'true');
          // Foca no primeiro elemento dentro do modal
          setTimeout(() => {
            const focusables = getFocusableIn(t);
            // Pula o botão de close para focar num campo de input se houver
            const input = t.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
            (input || focusables[1] || focusables[0])?.focus();
          }, 50);
        }
      }
    });
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Backdrop overlay mobile da sidebar
  R2A._toggleSideBackdrop = function (show) {
    let bd = document.getElementById('r2-side-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'r2-side-backdrop';
      bd.className = 'r2-side-backdrop';
      bd.addEventListener('click', () => {
        const sd = document.querySelector('.r2a-sidebar, .r2-side');
        if (sd) sd.classList.remove('is-open');
        bd.classList.remove('is-open');
      });
      document.body.appendChild(bd);
    }
    bd.classList.toggle('is-open', !!show);
  };

  R2A.renderFooter = function () {
    const f = document.querySelector('.r2a-footer, .r2-footer');
    if (f) {
      f.className = (f.className.replace(/(^|\s)(r2a-footer|r2-footer)(\s|$)/g, ' ').trim() + ' r2-footer r2a-footer').trim();
      const ambiente = CFG.MODO_DEV ? 'DEV · localStorage' : 'PROD · Firestore';
      f.innerHTML = `<span>${CFG.COMPANY} · v${CFG.APP_VERSION}</span><span id="r2a-footer-status">${ambiente}</span>`;
    }
  };

  // ----------------------------------------------------------
  // HELPERS DIVERSOS
  // ----------------------------------------------------------
  R2A.hashLancamento = function ({ data, valor, descricao }) {
    const valC = Math.round((Number(valor) || 0) * 100);
    const desc = String(descricao || '').toUpperCase().replace(/\s+/g, ' ').trim();
    let h = 0;
    const s = `${data}|${valC}|${desc}`;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return 'L' + Math.abs(h).toString(36);
  };

  R2A.subsetSum = function (valuesC, targetC, maxSols = 50) {
    const results = [];
    function rec(idx, sum, picked) {
      if (results.length >= maxSols) return;
      if (sum === targetC && picked.length >= 2) { results.push([...picked]); return; }
      if (idx >= valuesC.length) return;
      const v = valuesC[idx];
      const same = (targetC >= 0 && v >= 0) || (targetC <= 0 && v <= 0) || targetC === 0;
      if (same) {
        picked.push(idx);
        rec(idx + 1, sum + v, picked);
        picked.pop();
      }
      rec(idx + 1, sum, picked);
    }
    rec(0, 0, []);
    return results;
  };

  R2A.auditar = async function (acao, detalhes = {}) {
    const u = R2A.session.user();
    const log = {
      acao,
      usuario_uid: u.uid,
      usuario_nome: u.nome,
      usuario_perfil: u.perfil,
      ts: new Date().toISOString(),
      detalhes: detalhes || {}
    };
    if (CFG.MODO_DEV) {
      console.info('[AUDIT]', log);
      try { await R2A.data.add(CFG.COLLECTIONS.AUDITORIA, log); }
      catch (e) { /* silencioso em DEV: localStorage pode falhar por quota */ }
      return;
    }
    try { await _db.collection(CFG.COLLECTIONS.AUDITORIA).add(log); }
    catch (e) { console.error('[R2A] Audit:', e); }
  };

  R2A.$ = (s, r = document) => r.querySelector(s);
  R2A.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ----------------------------------------------------------
  // PERÍODOS · fechamento contábil mensal
  // Cada documento: { id, mes: 'YYYY-MM', status: 'aberto'|'fechado',
  //                   fechado_por_uid, fechado_por_nome, fechado_em,
  //                   reaberto_por_uid, reaberto_em, observacao }
  // ----------------------------------------------------------
  R2A.periodos = {
    _cache: null,
    _cacheAt: 0,

    async list() {
      // Cache curto (5 segundos) para não bater no storage a cada checagem
      if (this._cache && (Date.now() - this._cacheAt) < 5000) return this._cache;
      const arr = await R2A.data.list(CFG.COLLECTIONS.PERIODOS);
      this._cache = arr;
      this._cacheAt = Date.now();
      return arr;
    },

    async get(mes) {
      const all = await this.list();
      return all.find(p => p.mes === mes) || null;
    },

    // Retorna true se o mês daquela data está fechado
    async estaFechado(dataISO) {
      if (!dataISO) return false;
      const mes = String(dataISO).slice(0, 7);
      const p = await this.get(mes);
      return p && p.status === 'fechado';
    },

    async fechar(mes, observacao = '') {
      const u = R2A.session.user();
      if (u.perfil !== 'admin') throw new Error('Apenas admin pode fechar períodos');
      const existente = await this.get(mes);
      const patch = {
        mes,
        status: 'fechado',
        fechado_por_uid: u.uid,
        fechado_por_nome: u.nome,
        fechado_em: new Date().toISOString(),
        observacao: observacao || (existente && existente.observacao) || ''
      };
      this._cache = null;
      if (existente) {
        await R2A.data.update(CFG.COLLECTIONS.PERIODOS, existente.id, patch);
      } else {
        await R2A.data.add(CFG.COLLECTIONS.PERIODOS, patch);
      }
      R2A.auditar('periodo.fechar', { mes });
    },

    async reabrir(mes, observacao = '') {
      const u = R2A.session.user();
      if (u.perfil !== 'admin') throw new Error('Apenas admin pode reabrir períodos');
      const existente = await this.get(mes);
      if (!existente) throw new Error('Período não encontrado');
      this._cache = null;
      await R2A.data.update(CFG.COLLECTIONS.PERIODOS, existente.id, {
        status: 'aberto',
        reaberto_por_uid: u.uid,
        reaberto_por_nome: u.nome,
        reaberto_em: new Date().toISOString(),
        observacao: observacao || existente.observacao || ''
      });
      R2A.auditar('periodo.reabrir', { mes });
    },

    // Sentinel pra usar em guards: lança erro se data cair em mês fechado
    async assertAberto(dataISO, contexto = 'operação') {
      if (await this.estaFechado(dataISO)) {
        const mes = String(dataISO).slice(0, 7);
        const err = new Error(`Mês ${mes} está fechado · ${contexto} bloqueada. Solicite reabertura ao admin.`);
        err.code = 'PERIODO_FECHADO';
        err.mes = mes;
        throw err;
      }
    }
  };

  // ----------------------------------------------------------
  // AMORTIZAÇÃO · Price e SAC determinísticos
  // taxa em decimal mensal (0.01 = 1% a.m.), prazo e carência em meses
  // dataInicio: data ISO da primeira parcela
  // ----------------------------------------------------------
  R2A.amortizacao = {
    price(principal, taxaMensal, prazo, carencia = 0) {
      const out = [];
      let saldo = principal;
      for (let i = 1; i <= carencia; i++) {
        const juros = saldo * taxaMensal;
        out.push({ n: i, juros, amort: 0, parcela: juros, saldo, tipo: 'carencia' });
      }
      const n = prazo - carencia;
      const pmt = saldo * (taxaMensal * Math.pow(1 + taxaMensal, n)) / (Math.pow(1 + taxaMensal, n) - 1);
      for (let i = 1; i <= n; i++) {
        const juros = saldo * taxaMensal;
        const amort = pmt - juros;
        saldo -= amort;
        out.push({ n: carencia + i, juros, amort, parcela: pmt, saldo: Math.max(0, saldo), tipo: 'amortizacao' });
      }
      return out;
    },

    sac(principal, taxaMensal, prazo, carencia = 0) {
      const out = [];
      let saldo = principal;
      for (let i = 1; i <= carencia; i++) {
        const juros = saldo * taxaMensal;
        out.push({ n: i, juros, amort: 0, parcela: juros, saldo, tipo: 'carencia' });
      }
      const n = prazo - carencia;
      const amort = saldo / n;
      for (let i = 1; i <= n; i++) {
        const juros = saldo * taxaMensal;
        const parcela = juros + amort;
        saldo -= amort;
        out.push({ n: carencia + i, juros, amort, parcela, saldo: Math.max(0, saldo), tipo: 'amortizacao' });
      }
      return out;
    },

    // Adiciona meses preservando dia (fallback para último dia do mês)
    addMeses(iso, n) {
      const d = new Date(iso);
      const diaOriginal = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + n);
      const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(diaOriginal, ultimoDia));
      return d.toISOString().slice(0, 10);
    },

    // Gera cronograma com datas, formato compatível com cronograma_parcelas do schema
    gerarCronograma({ sistema = 'price', principal, taxaMensal, prazo, carencia = 0, dataInicio }) {
      const fn = sistema === 'sac' ? this.sac : this.price;
      const linhas = fn.call(this, principal, taxaMensal, prazo, carencia);
      const offsetInicial = carencia; // 1ª parcela de amortização cai em data + carencia
      return linhas.map((l, idx) => ({
        n: l.n,
        vencimento: this.addMeses(dataInicio, l.n - 1 - offsetInicial < 0 ? 0 : l.n - 1 - offsetInicial),
        valor: l.parcela,
        tipo: l.tipo
      }));
    }
  };

})();
