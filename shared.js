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
    if (!c) { c = document.createElement('div'); c.id = 'r2-toasts'; c.className = 'r2-toasts'; document.body.appendChild(c); }
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

    // Garante a classe .r2-app no container
    const shell = document.querySelector('.r2a-shell, .r2-app');
    if (shell) shell.classList.toggle('is-collapsed', collapsed);
    if (shell) shell.classList.toggle('sidebar-collapsed', collapsed);

    // ---------------- SIDEBAR ----------------
    const sidebar = document.querySelector('.r2a-sidebar, .r2-side');
    if (sidebar) {
      sidebar.className = (sidebar.className.replace(/(^|\s)(r2a-sidebar|r2-side)(\s|$)/g, ' ').trim() + ' r2-side r2a-sidebar').trim();
      const userIniciais = (u.iniciais || (u.nome ? u.nome.slice(0, 2).toUpperCase() : 'DV'));

      sidebar.innerHTML = `
        <div class="r2-side__brand">
          <a href="${rel('index.html')}" style="display:flex;align-items:center;">
            <img src="${rel('logoR2azul.png')}" alt="R2 Soluções Empresariais">
          </a>
        </div>

        <div class="r2-side__pill">
          <span class="dot"></span> ${CFG.APP_NAME} · v${CFG.APP_VERSION}
        </div>

        <nav class="r2-side__nav">
          <a href="${rel('index.html')}" class="r2-side__item ${active.dashboardGeral ? 'is-active' : ''}">
            ${ICONS.home}<span>Dashboard geral</span>
          </a>

          <div class="r2-side__group">Módulos</div>

          ${CFG.MODULOS.map(m => {
            const isActive = active.modulo === m.id;
            const submenuOpen = isActive || localStorage.getItem('r2a_sb_open_' + m.id) === '1';
            const firstHref = m.itens && m.itens[0] ? rel(m.itens[0].href) : '#';
            return `
              <button class="r2-side__item has-sub ${isActive ? 'is-active' : ''} ${submenuOpen ? 'is-expanded' : ''}" data-module="${m.id}" data-first-href="${firstHref}">
                ${moduleIcon(m.id)}<span>${m.label}</span>${ICONS.chev}
              </button>
              <div class="r2-side__sub ${submenuOpen ? 'is-open' : ''}" data-sub-of="${m.id}">
                ${m.itens.map(it => `
                  <a href="${rel(it.href)}" class="${active.modulo === m.id && active.item === it.id ? 'is-active' : ''}">${it.label}</a>
                `).join('')}
              </div>
            `;
          }).join('')}
        </nav>

        <div class="r2-side__user">
          <div class="avatar">${userIniciais}</div>
          <div class="meta">
            <div class="name">${u.nome}</div>
            <div class="role">${u.perfil === 'admin' ? 'Administrador' : 'Operador'}</div>
          </div>
          <button class="logout" id="r2-logout" title="Sair">${ICONS.logout}</button>
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
          <button class="r2-top__menu" id="r2-top-menu" title="Menu">${ICONS.menu}</button>
          <nav class="r2-crumbs">${crumbsHtml}</nav>
        </div>
        <div class="r2-top__right">
          <div class="r2-search">
            ${ICONS.search}
            <input placeholder="Buscar lançamento, conta, contrato…" id="r2-search-global">
          </div>
          <button class="r2-icon-btn has-dot" title="Notificações">${ICONS.bell}</button>
        </div>
      `;

      const menuBtn = document.getElementById('r2-top-menu');
      if (menuBtn) menuBtn.addEventListener('click', () => {
        const sh = document.querySelector('.r2a-shell, .r2-app');
        if (!sh) return;
        const next = !sh.classList.contains('is-collapsed');
        sh.classList.toggle('is-collapsed', next);
        sh.classList.toggle('sidebar-collapsed', next);
        // mobile: abre como overlay
        const sd = document.querySelector('.r2a-sidebar, .r2-side');
        if (sd && window.innerWidth < 760) sd.classList.toggle('is-open');
        localStorage.setItem('r2a_sidebar_collapsed', next ? '1' : '0');
      });
    }
  };

  R2A.renderFooter = function () {
    const f = document.querySelector('.r2a-footer, .r2-footer');
    if (f) {
      f.className = (f.className.replace(/(^|\s)(r2a-footer|r2-footer)(\s|$)/g, ' ').trim() + ' r2-footer r2a-footer').trim();
      f.innerHTML = `<span>${CFG.COMPANY} · v${CFG.APP_VERSION}</span><span id="r2a-footer-status">Pronto</span>`;
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
    const log = {
      acao,
      usuario_uid: R2A.session.user().uid,
      usuario_nome: R2A.session.user().nome,
      ts: new Date().toISOString(),
      ...detalhes
    };
    if (CFG.MODO_DEV) { console.info('[AUDIT]', log); return; }
    try { await _db.collection(CFG.COLLECTIONS.AUDITORIA).add(log); } catch (e) { console.error('[R2A] Audit:', e); }
  };

  R2A.$ = (s, r = document) => r.querySelector(s);
  R2A.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

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
