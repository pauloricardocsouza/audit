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
    let c = document.getElementById('r2a-toasts');
    if (!c) { c = document.createElement('div'); c.id = 'r2a-toasts'; c.className = 'r2a-toast-container'; document.body.appendChild(c); }
    const el = document.createElement('div');
    el.className = `r2a-toast ${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, timeout);
  };

  R2A.confirm = function (msg) { return Promise.resolve(window.confirm(msg)); };

  // ----------------------------------------------------------
  // SHELL: renderiza sidebar + topbar
  // active = { modulo: 'conciliador', item: 'conciliacao' } ou { dashboardGeral: true }
  // ----------------------------------------------------------
  R2A.renderShell = function (active = {}) {
    const u = R2A.session.user();
    const collapsed = localStorage.getItem('r2a_sidebar_collapsed') === '1';

    // SIDEBAR
    const sidebar = document.querySelector('.r2a-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', collapsed);
      sidebar.innerHTML = `
        <div class="r2a-sb-head">
          <a href="${rel('index.html')}" class="r2a-sb-brand">
            <img class="r2a-sb-logo-img" src="${rel('logoR2azul.png')}" alt="R2 Soluções Empresariais">
            <div class="r2a-sb-logo">R²</div>
            <span class="r2a-sb-name">${CFG.APP_NAME}</span>
          </a>
          <button class="r2a-sb-toggle" title="Recolher" id="r2a-sb-toggle">‹</button>
        </div>

        <nav class="r2a-sb-nav">
          <a href="${rel('index.html')}" class="r2a-sb-item ${active.dashboardGeral ? 'active' : ''}">
            <span class="r2a-sb-icon">◇</span>
            <span class="r2a-sb-label">Dashboard geral</span>
          </a>

          <div class="r2a-sb-section">
            <span class="r2a-sb-section-label">Módulos</span>
          </div>

          ${CFG.MODULOS.map(m => {
            const isActive = active.modulo === m.id;
            const submenuOpen = isActive || localStorage.getItem('r2a_sb_open_' + m.id) === '1';
            return `
              <div class="r2a-sb-module ${isActive ? 'active' : ''} ${submenuOpen ? 'open' : ''} ${m.ativo === false ? 'disabled' : ''}">
                <button class="r2a-sb-module-head" data-module="${m.id}">
                  <span class="r2a-sb-icon">${m.icon}</span>
                  <span class="r2a-sb-label">${m.label}</span>
                  <span class="r2a-sb-caret">▾</span>
                </button>
                <div class="r2a-sb-submenu">
                  ${m.itens.map(it => `
                    <a href="${rel(it.href)}" class="r2a-sb-subitem ${active.item === it.id ? 'active' : ''}">
                      <span class="r2a-sb-subicon">${it.icon}</span>
                      <span class="r2a-sb-label">${it.label}</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </nav>

        <div class="r2a-sb-foot">
          <div class="r2a-sb-user">
            <div class="r2a-sb-avatar">${u.iniciais}</div>
            <div class="r2a-sb-user-info">
              <div class="r2a-sb-user-name">${u.nome}</div>
              <div class="r2a-sb-user-perfil">${u.perfil}</div>
            </div>
            <button class="r2a-sb-logout" id="r2a-logout" title="Sair">↗</button>
          </div>
        </div>
      `;

      // Eventos da sidebar
      document.getElementById('r2a-sb-toggle').addEventListener('click', () => {
        const next = !document.querySelector('.r2a-sidebar').classList.contains('collapsed');
        document.querySelector('.r2a-sidebar').classList.toggle('collapsed', next);
        localStorage.setItem('r2a_sidebar_collapsed', next ? '1' : '0');
      });

      document.getElementById('r2a-logout').addEventListener('click', () => R2A.logout());

      // Toggle de submenu por clique no head do módulo
      document.querySelectorAll('.r2a-sb-module-head').forEach(b => {
        b.addEventListener('click', e => {
          const mod = b.dataset.module;
          const wrap = b.parentElement;
          const opened = wrap.classList.toggle('open');
          localStorage.setItem('r2a_sb_open_' + mod, opened ? '1' : '0');
        });
      });
    }

    // TOPBAR (breadcrumb + utilitários)
    const topbar = document.querySelector('.r2a-topbar');
    if (topbar) {
      const crumbs = [];
      if (active.dashboardGeral) crumbs.push('Dashboard geral');
      else if (active.modulo) {
        const m = CFG.MODULOS.find(x => x.id === active.modulo);
        if (m) {
          crumbs.push(m.label);
          if (active.item) {
            const it = m.itens.find(x => x.id === active.item);
            if (it) crumbs.push(it.label);
          }
        }
      }
      topbar.innerHTML = `
        <div class="r2a-crumbs">
          ${crumbs.map((c, i) => `<span class="r2a-crumb ${i === crumbs.length - 1 ? 'last' : ''}">${c}</span>`).join('<span class="r2a-crumb-sep">/</span>')}
        </div>
        <div class="r2a-topbar-right">
          <span class="r2a-period-label">${R2A.fmt.periodoBR()}</span>
        </div>
      `;
    }
  };

  R2A.renderFooter = function () {
    const f = document.querySelector('.r2a-footer');
    if (f) f.innerHTML = `<span>DESENVOLVIDO POR ${CFG.COMPANY} · v${CFG.APP_VERSION}</span><span id="r2a-footer-status">Pronto</span>`;
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
