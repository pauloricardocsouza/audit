// ============================================================
// R2 Conciliador · conciliacao.js
// Tela de conciliação · ondas, match manual, reversão
// ============================================================

(function () {
  'use strict';

  const CFG = window.R2A_CONFIG;
  const M = window.R2A_MOCK;

  // -------- ESTADO LOCAL --------
  const State = {
    banco: [],     // referência aos arrays mockados
    sia: [],
    matches: [],
    matchSeq: 1,
    sel: { banco: new Set(), sia: new Set() },
    movimento: 'todos',
    modalCtx: null
  };

  // Carrega via R2A.data (DEV: localStorage seedado; PROD: Firestore)
  // Mantém vínculos feitos no módulo Análise de Contratos refletidos aqui.
  async function carregarDados() {
    R2A.data.init();
    const C = CFG.COLLECTIONS;
    State.banco = await R2A.data.list(C.LANCAMENTOS_BANCO);
    State.sia   = await R2A.data.list(C.LANCAMENTOS_SIA);
    const contas = await R2A.data.list(C.CONTAS);
    const sel = document.getElementById('filter-conta');
    sel.innerHTML = `<option value="all">Todas (${contas.length})</option>` +
      contas.map(c => `<option value="${c.id}">${c.apelido}</option>`).join('');
  }

  // -------- HELPERS LOCAIS --------
  const fmt = R2A.fmt;

  function getMatch(item, side) {
    return State.matches.find(m =>
      side === 'banco' ? m.banco_id === item.id : m.sia_ids.includes(item.id)
    );
  }

  function statusOf(item, side) {
    if (item.status && !['pendente', 'conciliado'].includes(item.status)) return item.status;
    if (getMatch(item, side)) return 'conciliado';
    if (item._ambiguo) return 'ambiguo';
    return 'pendente';
  }

  function getFiltered() {
    const conta = document.getElementById('filter-conta').value;
    const statusF = document.getElementById('filter-status').value;
    const ini = document.getElementById('filter-ini').value;
    const fim = document.getElementById('filter-fim').value;
    const qBanco = (document.getElementById('search-banco').value || '').toLowerCase().trim();
    const qSia = (document.getElementById('search-sia').value || '').toLowerCase().trim();

    const passConta = x => conta === 'all' || x.conta === conta;
    const passPer = x => x.data >= ini && x.data <= fim;
    const passMov = x => State.movimento === 'todos' ||
                        (State.movimento === 'credito' && x.tipo === 'C') ||
                        (State.movimento === 'debito' && x.tipo === 'D');

    const banco = State.banco.filter(x => passConta(x) && passPer(x) && passMov(x) &&
      (qBanco === '' || x.hist.toLowerCase().includes(qBanco)) &&
      (statusF === 'all' || statusOf(x, 'banco') === statusF));

    const sia = State.sia.filter(x => passConta(x) && passPer(x) && passMov(x) &&
      (qSia === '' || x.desc.toLowerCase().includes(qSia)) &&
      (statusF === 'all' || statusOf(x, 'sia') === statusF));

    return { banco, sia };
  }

  // -------- RENDER · VIRTUALIZAÇÃO --------
  // Render por janela (windowing): só renderiza ~50 linhas visíveis + buffer
  // Permite escalar para 10k+ lançamentos sem travar o browser.
  // Mantém scroll natural via spacers de altura calculada nos extremos.
  const ROW_HEIGHT = 42;          // altura média de uma <tr> com padding D2
  const VIRT_BUFFER = 20;         // linhas extras renderizadas antes/depois da viewport
  const VIRT_THRESHOLD = 200;     // lista menor que isso renderiza inteira (mais simples)
  const VState = {
    banco: { lista: [], _rafPending: false },
    sia:   { lista: [], _rafPending: false }
  };

  function renderTbodyVirtual(side, list) {
    VState[side].lista = list;
    const tbody = document.getElementById('tbody-' + side);
    if (!tbody) return;
    const scroller = tbody.closest('.r2a-panel-body');
    if (!scroller) {
      tbody.innerHTML = list.map(r => rowHTML(r, side)).join('');
      return;
    }

    if (list.length === 0) {
      const icon = side === 'banco' ? '⬢' : '◆';
      const txt = side === 'banco' ? 'bancário' : 'do SIA';
      tbody.innerHTML = `<tr><td colspan="5" class="empty"><div class="empty-icon">${icon}</div>Nenhum lançamento ${txt} no filtro</td></tr>`;
      return;
    }

    // Pequenas listas: renderiza tudo (zero overhead de scroll)
    if (list.length <= VIRT_THRESHOLD) {
      tbody.innerHTML = list.map(r => rowHTML(r, side)).join('');
      return;
    }

    // Windowing
    const scrollTop = scroller.scrollTop;
    const viewportH = scroller.clientHeight || 480;
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VIRT_BUFFER);
    const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + (VIRT_BUFFER * 2);
    const endIdx = Math.min(list.length, startIdx + visibleCount);

    const topPad = startIdx * ROW_HEIGHT;
    const bottomPad = (list.length - endIdx) * ROW_HEIGHT;

    let html = '';
    if (topPad > 0) html += `<tr class="r2a-virt-spacer" aria-hidden="true" style="height:${topPad}px"><td colspan="5" style="padding:0;border:0;"></td></tr>`;
    for (let i = startIdx; i < endIdx; i++) html += rowHTML(list[i], side);
    if (bottomPad > 0) html += `<tr class="r2a-virt-spacer" aria-hidden="true" style="height:${bottomPad}px"><td colspan="5" style="padding:0;border:0;"></td></tr>`;

    tbody.innerHTML = html;
  }

  function bindVirtualScroll() {
    document.querySelectorAll('.r2a-panel-body').forEach(panel => {
      panel.addEventListener('scroll', () => {
        const tbody = panel.querySelector('tbody');
        if (!tbody || !tbody.id || !tbody.id.startsWith('tbody-')) return;
        const side = tbody.id.replace('tbody-', '');
        if (!VState[side]) return;
        const lista = VState[side].lista;
        if (lista.length <= VIRT_THRESHOLD) return; // não há janela ativa

        if (VState[side]._rafPending) return;
        VState[side]._rafPending = true;
        requestAnimationFrame(() => {
          VState[side]._rafPending = false;
          renderTbodyVirtual(side, lista);
        });
      }, { passive: true });
    });
  }

  function renderAll() {
    const { banco, sia } = getFiltered();

    document.getElementById('badge-banco').textContent = `${banco.length} lançamentos`;
    document.getElementById('badge-sia').textContent = `${sia.length} lançamentos`;

    renderTbodyVirtual('banco', banco);
    renderTbodyVirtual('sia', sia);

    renderStats(banco, sia);
    renderSelectionInfo();
  }

  function rowHTML(item, side) {
    const st = statusOf(item, side);
    const isSel = State.sel[side].has(item.id);
    const m = getMatch(item, side);
    const tag = m ? `M${m.id_match}` : null;
    const desc = side === 'banco' ? item.hist : item.desc;

    const classes = ['clickable'];
    if (st === 'conciliado') classes.push('conciliated');
    if (st === 'ignorado') classes.push('ignored');
    if (st === 'ambiguo') classes.push('ambiguous');
    if (isSel) classes.push('selected');

    const checked = isSel ? 'checked' : '';
    const valCls = item.tipo === 'C' ? 'credito' : 'debito';

    return `
      <tr class="${classes.join(' ')}" data-side="${side}" data-id="${item.id}">
        <td class="row-check"><input type="checkbox" ${checked} data-side="${side}" data-id="${item.id}"></td>
        <td>${fmt.dataCurta(item.data)}</td>
        <td><div class="descricao" title="${desc}">${desc}</div>${tag ? ` <span class="match-tag">${tag}</span>` : ''}</td>
        <td class="num ${valCls}">${fmt.moeda(item.valor)}</td>
        <td class="center"><span class="pill pill-dot ${st}">${st}</span></td>
      </tr>
    `;
  }

  function renderStats(banco, sia) {
    const sumAbs = a => a.reduce((acc, x) => acc + Math.abs(x.valor), 0);
    const concBanco = banco.filter(x => statusOf(x, 'banco') === 'conciliado');
    const pendBanco = banco.filter(x => statusOf(x, 'banco') === 'pendente');
    const ambBanco = banco.filter(x => statusOf(x, 'banco') === 'ambiguo');

    document.getElementById('stat-banco-qtd').textContent = banco.length;
    document.getElementById('stat-banco-val').textContent = fmt.moeda(sumAbs(banco), { sinal: false });
    document.getElementById('stat-sia-qtd').textContent = sia.length;
    document.getElementById('stat-sia-val').textContent = fmt.moeda(sumAbs(sia), { sinal: false });
    document.getElementById('stat-conc-qtd').textContent = concBanco.length;
    document.getElementById('stat-conc-pct').textContent = banco.length
      ? `${Math.round(concBanco.length / banco.length * 100)}% conciliação` : '0%';
    document.getElementById('stat-pend-qtd').textContent = pendBanco.length;
    document.getElementById('stat-pend-val').textContent = fmt.moeda(sumAbs(pendBanco), { sinal: false });
    document.getElementById('stat-amb-qtd').textContent = ambBanco.length;
    document.getElementById('stat-diff').textContent = fmt.moeda(sumAbs(banco) - sumAbs(sia));
  }

  function renderSelectionInfo() {
    const sb = State.sel.banco.size, ss = State.sel.sia.size;
    const info = document.getElementById('selection-info');
    const btn = document.getElementById('btn-match-manual');

    if (sb === 0 && ss === 0) {
      info.className = 'r2c-selection-info empty';
      info.textContent = 'Nenhuma seleção';
      btn.disabled = true;
      return;
    }
    info.className = 'r2c-selection-info';
    const vB = [...State.sel.banco].map(id => State.banco.find(x => x.id === id)?.valor || 0).reduce((a, b) => a + b, 0);
    const vS = [...State.sel.sia].map(id => State.sia.find(x => x.id === id)?.valor || 0).reduce((a, b) => a + b, 0);
    const diff = Math.abs(vB - vS);
    info.innerHTML = `<strong>${sb} banco</strong> · <strong>${ss} sistema</strong> · Δ ${fmt.moeda(diff, { sinal: false })}`;
    btn.disabled = !(sb >= 1 && ss >= 1 && diff < 0.005);
  }

  // -------- SELEÇÃO --------
  function toggleRow(side, id) {
    const item = (side === 'banco' ? State.banco : State.sia).find(x => x.id === id);
    if (!item) return;
    if (statusOf(item, side) === 'conciliado') {
      R2A.toast('Lançamento já conciliado · use Reverter primeiro', 'warning');
      return;
    }
    if (State.sel[side].has(id)) State.sel[side].delete(id);
    else State.sel[side].add(id);
    renderAll();
  }

  function toggleAll(side, checked) {
    const arr = side === 'banco' ? getFiltered().banco : getFiltered().sia;
    arr.forEach(x => {
      if (statusOf(x, side) === 'conciliado') return;
      if (checked) State.sel[side].add(x.id); else State.sel[side].delete(x.id);
    });
    renderAll();
  }

  // -------- ONDA 0: TRANSFERÊNCIAS ESPELHADAS CC ↔ GARANTIDA --------
  // Para cada conta tipo 'garantida' com conta_vinculada_id, procura
  // pares (CC ↔ CG) onde valor absoluto bate, data igual e sinais opostos,
  // ambos pendentes. Marca ambos como conciliado em um passe.
  async function runEspelhadas() {
    const contas = await R2A.data.list(CFG.COLLECTIONS.CONTAS);
    const garantidas = contas.filter(c => c.tipo === 'garantida' && c.conta_vinculada_id);
    if (garantidas.length === 0) {
      R2A.toast('Nenhuma conta garantida com CC vinculada · cadastre o vínculo em Cadastros', 'info', 5000);
      return;
    }

    let totalPares = 0;
    const pend = [];

    for (const cg of garantidas) {
      const ccId = cg.conta_vinculada_id;
      const lancCG = State.banco.filter(b =>
        b.conta === cg.id &&
        statusOf(b, 'banco') === 'pendente'
      );
      const lancCC = State.banco.filter(b =>
        b.conta === ccId &&
        statusOf(b, 'banco') === 'pendente'
      );

      // Para cada lançamento da garantida, procura par espelhado na CC
      const usadosCC = new Set();
      for (const lcg of lancCG) {
        const par = lancCC.find(lcc =>
          !usadosCC.has(lcc.id) &&
          lcc.data === lcg.data &&
          Math.abs(lcc.valor) === Math.abs(lcg.valor) &&
          ((lcc.valor > 0) !== (lcg.valor > 0))
        );
        if (par) {
          usadosCC.add(par.id);
          lcg.status = 'conciliado';
          par.status = 'conciliado';
          lcg.vinculo_espelhado = par.id;
          par.vinculo_espelhado = lcg.id;
          pend.push(R2A.data.update(CFG.COLLECTIONS.LANCAMENTOS_BANCO, lcg.id, {
            status: 'conciliado',
            vinculo_espelhado: par.id
          }));
          pend.push(R2A.data.update(CFG.COLLECTIONS.LANCAMENTOS_BANCO, par.id, {
            status: 'conciliado',
            vinculo_espelhado: lcg.id
          }));
          totalPares++;
        }
      }
    }

    await Promise.all(pend);

    if (totalPares === 0) {
      R2A.toast('Nenhuma transferência espelhada encontrada nesta janela', 'warning');
    } else {
      R2A.toast(`${totalPares} par(es) espelhado(s) conciliado(s) automaticamente`, 'success');
      R2A.auditar('onda0_espelhadas', { qtd_pares: totalPares });
    }
    renderAll();
  }

  // -------- ONDA 1: 1:1 --------
  async function runWave1() {
    State.banco.forEach(x => delete x._ambiguo);
    State.sia.forEach(x => delete x._ambiguo);

    const used = new Set(State.matches.flatMap(m => [m.banco_id, ...m.sia_ids]));
    const banco = State.banco.filter(x => !used.has(x.id) && statusOf(x, 'banco') === 'pendente');
    const sia = State.sia.filter(x => !used.has(x.id) && statusOf(x, 'sia') === 'pendente');

    let matched = 0, ambiguous = 0;

    banco.forEach(b => {
      const cands = sia.filter(s =>
        s.conta === b.conta &&
        s.data === b.data &&
        Math.abs(s.valor - b.valor) < 0.005 &&
        !used.has(s.id)
      );
      if (cands.length === 1) {
        const id = State.matchSeq++;
        State.matches.push({
          id_match: id, banco_id: b.id, sia_ids: [cands[0].id], onda: 1,
          usuario: R2A.session.user().nome, ts: new Date().toISOString()
        });
        R2A.auditar('match_onda1', { id_match: id, banco_id: b.id, sia_ids: [cands[0].id] });
        used.add(b.id); used.add(cands[0].id); matched++;
      } else if (cands.length > 1) {
        b._ambiguo = true;
        cands.forEach(c => c._ambiguo = true);
        ambiguous++;
      }
    });

    const msg = `Onda 1 concluída · ${matched} conciliado(s)` + (ambiguous ? ` · ${ambiguous} ambíguo(s) requer revisão` : '');
    R2A.toast(msg, ambiguous ? 'warning' : 'success');
    renderAll();
  }

  // -------- ONDA 2: 1:N --------
  async function runWave2() {
    const used = new Set(State.matches.flatMap(m => [m.banco_id, ...m.sia_ids]));
    const bancoPend = State.banco.filter(x => !used.has(x.id) &&
      !['conciliado', 'ignorado'].includes(statusOf(x, 'banco')));
    const siaPend = State.sia.filter(x => !used.has(x.id) &&
      !['conciliado', 'ignorado'].includes(statusOf(x, 'sia')));

    if (siaPend.length > CFG.REGRAS.ONDA2_THRESHOLD_AVISO) {
      const ok = await R2A.confirm(`Existem ${siaPend.length} lançamentos pendentes no sistema. A Onda 2 pode demorar. Continuar?`);
      if (!ok) return;
    }

    let matched = 0;
    const allSolutions = [];

    bancoPend.forEach(b => {
      if (b._ambiguo) return;
      const cands = siaPend.filter(s =>
        s.conta === b.conta && s.data === b.data &&
        Math.sign(s.valor) === Math.sign(b.valor) && !used.has(s.id)
      );
      if (cands.length < 2) return;

      const target = Math.round(b.valor * 100);
      const values = cands.map(c => Math.round(c.valor * 100));
      const solutions = R2A.subsetSum(values, target, CFG.REGRAS.ONDA2_LIMITE_SOLUCOES);

      if (solutions.length === 1) {
        const ids = solutions[0].map(i => cands[i].id);
        const id = State.matchSeq++;
        State.matches.push({
          id_match: id, banco_id: b.id, sia_ids: ids, onda: 2,
          usuario: R2A.session.user().nome, ts: new Date().toISOString()
        });
        R2A.auditar('match_onda2', { id_match: id, banco_id: b.id, sia_ids: ids });
        ids.forEach(i => used.add(i));
        used.add(b.id);
        matched++;
      } else if (solutions.length > 1) {
        allSolutions.push({ banco: b, cands, solutions });
      }
    });

    if (allSolutions.length > 0) openSolutionsModal(allSolutions);

    const msg = `Onda 2 concluída · ${matched} conciliado(s)` +
      (allSolutions.length ? ` · ${allSolutions.length} caso(s) com múltiplas combinações` : '');
    R2A.toast(msg, allSolutions.length ? 'warning' : 'success');
    renderAll();
  }

  // -------- MODAL DE COMBINAÇÕES --------
  function openSolutionsModal(cases) {
    State.modalCtx = { type: 'wave2', cases, idx: 0 };
    renderModal();
    document.getElementById('modal').classList.add('open');
  }

  function renderModal() {
    if (!State.modalCtx) return;
    const c = State.modalCtx.cases[State.modalCtx.idx];
    document.getElementById('modal-title').textContent =
      `Múltiplas combinações · caso ${State.modalCtx.idx + 1}/${State.modalCtx.cases.length}`;

    let html = `
      <div style="padding: 12px; background: var(--info-bg); border-radius: 6px; margin-bottom: 16px;">
        <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em;">Lançamento banco</div>
        <div style="margin-top: 4px;"><strong>${fmt.dataCurta(c.banco.data)}</strong> · ${c.banco.hist} · <strong class="${c.banco.tipo === 'C' ? 'credito' : 'debito'}">${fmt.moeda(c.banco.valor)}</strong></div>
      </div>
      <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; font-weight: 600;">Escolha a combinação correta:</div>
    `;

    c.solutions.forEach((sol, i) => {
      const items = sol.map(idx => c.cands[idx]);
      const total = items.reduce((a, x) => a + x.valor, 0);
      html += `
        <label style="display: block; padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; cursor: pointer;">
          <input type="radio" name="sol" value="${i}" ${i === 0 ? 'checked' : ''} style="margin-right: 8px;">
          <strong>Opção ${i + 1}</strong> · ${items.length} título(s) · total <strong>${fmt.moeda(total)}</strong>
          <div style="margin-top: 6px; padding-left: 22px; font-size: 11px; color: var(--text-2);">
            ${items.map(it => `• ${it.desc} <span style="color: var(--muted);">${fmt.moeda(it.valor)}</span>`).join('<br>')}
          </div>
        </label>
      `;
    });

    document.getElementById('modal-body').innerHTML = html;
  }

  function confirmModal() {
    if (!State.modalCtx) return;
    const c = State.modalCtx.cases[State.modalCtx.idx];
    const choice = parseInt(document.querySelector('input[name="sol"]:checked').value);
    const sol = c.solutions[choice];
    const ids = sol.map(i => c.cands[i].id);
    const id = State.matchSeq++;
    State.matches.push({
      id_match: id, banco_id: c.banco.id, sia_ids: ids, onda: 2,
      usuario: R2A.session.user().nome, ts: new Date().toISOString()
    });
    R2A.auditar('match_onda2_manual', { id_match: id, banco_id: c.banco.id, sia_ids: ids });

    State.modalCtx.idx++;
    if (State.modalCtx.idx >= State.modalCtx.cases.length) {
      closeModal();
      R2A.toast('Todas as combinações foram resolvidas', 'success');
    } else renderModal();
    renderAll();
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('open');
    State.modalCtx = null;
  }

  // -------- MATCH MANUAL --------
  async function manualMatch() {
    if (State.sel.banco.size === 0 || State.sel.sia.size === 0) return;

    const banco = [...State.sel.banco].map(id => State.banco.find(x => x.id === id));
    const sia = [...State.sel.sia].map(id => State.sia.find(x => x.id === id));

    // Bloqueio por período fechado
    const datas = new Set();
    [...banco, ...sia].forEach(it => { if (it && it.data) datas.add(String(it.data).slice(0, 7)); });
    for (const mes of datas) {
      if (await R2A.periodos.estaFechado(mes + '-01')) {
        R2A.toast(`Mês ${mes} está fechado · solicite reabertura ao admin`, 'error', 5000);
        return;
      }
    }

    const sumB = banco.reduce((a, x) => a + x.valor, 0);
    const sumS = sia.reduce((a, x) => a + x.valor, 0);
    if (Math.abs(sumB - sumS) > 0.005) {
      R2A.toast('Valores não batem · diferença ' + fmt.moeda(Math.abs(sumB - sumS), { sinal: false }), 'error');
      return;
    }

    if (banco.length > 1 && sia.length > 1) {
      R2A.toast('Conciliação manual permite apenas 1:N · selecione 1 banco com vários sistema', 'error');
      return;
    }

    if (banco.length === 1) {
      const idM = State.matchSeq++;
      State.matches.push({
        id_match: idM, banco_id: banco[0].id, sia_ids: sia.map(s => s.id), onda: 'manual',
        usuario: R2A.session.user().nome, ts: new Date().toISOString()
      });
      R2A.auditar('match_manual', { id_match: idM, banco_id: banco[0].id, sia_ids: sia.map(s => s.id) });
    } else {
      R2A.toast('Caso N:1 (vários banco x 1 sia) ainda não implementado', 'warning');
      return;
    }

    State.sel.banco.clear(); State.sel.sia.clear();
    R2A.toast('Conciliação manual registrada', 'success');
    renderAll();
  }

  // Helper: persiste mudança de status em R2A.data (DEV: localStorage; PROD: Firestore)
  async function persistirStatus(side, id, status) {
    const col = side === 'banco' ? CFG.COLLECTIONS.LANCAMENTOS_BANCO : CFG.COLLECTIONS.LANCAMENTOS_SIA;
    try { await R2A.data.update(col, id, { status }); } catch (e) { console.warn('persistirStatus falhou', e); }
  }

  // Verifica se alguma das datas selecionadas cai em mês fechado
  async function bloqueadoPorPeriodo(ids, lista) {
    const datas = new Set();
    ids.forEach(id => { const it = lista.find(x => x.id === id); if (it && it.data) datas.add(String(it.data).slice(0, 7)); });
    for (const mes of datas) {
      if (await R2A.periodos.estaFechado(mes + '-01')) return mes;
    }
    return null;
  }

  // -------- AÇÕES DE STATUS --------
  async function applyStatus(status) {
    const idsBanco = [...State.sel.banco];
    const idsSia = [...State.sel.sia];
    const bloqB = await bloqueadoPorPeriodo(idsBanco, State.banco);
    const bloqS = await bloqueadoPorPeriodo(idsSia, State.sia);
    if (bloqB || bloqS) {
      R2A.toast(`Mês ${bloqB || bloqS} está fechado · solicite reabertura ao admin`, 'error', 5000);
      return;
    }
    let n = 0;
    const pend = [];
    idsBanco.forEach(id => {
      const it = State.banco.find(x => x.id === id);
      if (it) { it.status = status; n++; pend.push(persistirStatus('banco', id, status)); }
    });
    idsSia.forEach(id => {
      const it = State.sia.find(x => x.id === id);
      if (it) { it.status = status; n++; pend.push(persistirStatus('sia', id, status)); }
    });
    State.sel.banco.clear(); State.sel.sia.clear();
    await Promise.all(pend);
    R2A.auditar('aplicar_status', { status, qtd: n });
    R2A.toast(`${n} lançamento(s) marcado(s) como ${status}`, 'success');
    renderAll();
  }

  // -------- REVERSÃO --------
  // Reverte transferência espelhada: limpa o par (banco + banco do mesmo
  // mock) removendo vinculo_espelhado em ambos e voltando status a pendente
  async function reverterEspelhada(id, pend) {
    const it = State.banco.find(x => x.id === id);
    if (!it || !it.vinculo_espelhado) return 0;
    const parId = it.vinculo_espelhado;
    const par = State.banco.find(x => x.id === parId);
    delete it.vinculo_espelhado;
    it.status = 'pendente';
    pend.push(R2A.data.update(CFG.COLLECTIONS.LANCAMENTOS_BANCO, it.id, { vinculo_espelhado: null, status: 'pendente' }));
    if (par) {
      delete par.vinculo_espelhado;
      par.status = 'pendente';
      pend.push(R2A.data.update(CFG.COLLECTIONS.LANCAMENTOS_BANCO, par.id, { vinculo_espelhado: null, status: 'pendente' }));
    }
    return par ? 2 : 1;
  }

  async function reverseSelection() {
    const ids = [...State.sel.banco, ...State.sel.sia];
    if (ids.length === 0) { R2A.toast('Nenhuma seleção', 'warning'); return; }
    const before = State.matches.length;
    State.matches = State.matches.filter(m =>
      !ids.includes(m.banco_id) && !m.sia_ids.some(s => ids.includes(s))
    );
    const pend = [];
    let espelhadasRev = 0;
    const idsEspelhadasJaTratados = new Set();
    for (const id of State.sel.banco) {
      const it = State.banco.find(x => x.id === id);
      // Espelhada: reverte par inteiro
      if (it && it.vinculo_espelhado && !idsEspelhadasJaTratados.has(id)) {
        const parId = it.vinculo_espelhado;
        idsEspelhadasJaTratados.add(id);
        idsEspelhadasJaTratados.add(parId);
        espelhadasRev += await reverterEspelhada(id, pend);
        continue;
      }
      if (it && ['ignorado', 'justificado', 'analise', 'conciliado'].includes(it.status)) {
        it.status = 'pendente';
        pend.push(persistirStatus('banco', id, 'pendente'));
      }
    }
    [...State.sel.sia].forEach(id => {
      const it = State.sia.find(x => x.id === id);
      if (it && ['ignorado', 'justificado', 'analise'].includes(it.status)) {
        it.status = 'pendente';
        pend.push(persistirStatus('sia', id, 'pendente'));
      }
    });
    State.sel.banco.clear(); State.sel.sia.clear();
    const n = before - State.matches.length;
    await Promise.all(pend);
    R2A.auditar('reverter_selecao', { qtd_matches: n, ids, espelhadas_revertidas: espelhadasRev });
    const extra = espelhadasRev > 0 ? ` · ${espelhadasRev} lançamento(s) espelhado(s)` : '';
    R2A.toast(`${n} conciliação(ões) revertida(s)${extra}`, 'success');
    renderAll();
  }

  async function reverseAll() {
    const ok = await R2A.confirm('Reverter TODAS as conciliações do período (inclui transferências espelhadas)? Esta ação não pode ser desfeita.');
    if (!ok) return;
    const n = State.matches.length;
    State.matches = [];
    const pend = [];
    let espelhadasRev = 0;
    State.banco.forEach(x => {
      if (x.vinculo_espelhado) {
        delete x.vinculo_espelhado;
        x.status = 'pendente';
        pend.push(R2A.data.update(CFG.COLLECTIONS.LANCAMENTOS_BANCO, x.id, { vinculo_espelhado: null, status: 'pendente' }));
        espelhadasRev++;
      } else if (['ignorado', 'justificado', 'analise', 'conciliado'].includes(x.status)) {
        x.status = 'pendente';
        pend.push(persistirStatus('banco', x.id, 'pendente'));
      }
      delete x._ambiguo;
    });
    State.sia.forEach(x => {
      if (['ignorado', 'justificado', 'analise'].includes(x.status)) {
        x.status = 'pendente';
        pend.push(persistirStatus('sia', x.id, 'pendente'));
      }
      delete x._ambiguo;
    });
    await Promise.all(pend);
    R2A.auditar('reverter_tudo', { qtd_matches: n, espelhadas_revertidas: espelhadasRev });
    const extra = espelhadasRev > 0 ? ` · ${espelhadasRev} espelhada(s)` : '';
    R2A.toast(`${n} conciliação(ões) e status manuais revertidos${extra}`, 'success');
    renderAll();
  }

  // -------- PERSISTÊNCIA DE FILTROS --------
  const FILTROS_SCOPE = 'conciliacao';
  const FILTROS_DEFAULTS = {
    conta: 'all', status: 'all',
    ini: '2026-05-01', fim: '2026-05-31',
    qBanco: '', qSia: '', movimento: 'todos'
  };

  function snapshotFiltros() {
    return {
      conta:     document.getElementById('filter-conta').value,
      status:    document.getElementById('filter-status').value,
      ini:       document.getElementById('filter-ini').value,
      fim:       document.getElementById('filter-fim').value,
      qBanco:    document.getElementById('search-banco').value,
      qSia:      document.getElementById('search-sia').value,
      movimento: State.movimento
    };
  }

  function aplicarFiltros(f) {
    document.getElementById('filter-conta').value  = f.conta  || FILTROS_DEFAULTS.conta;
    document.getElementById('filter-status').value = f.status || FILTROS_DEFAULTS.status;
    document.getElementById('filter-ini').value    = f.ini    || FILTROS_DEFAULTS.ini;
    document.getElementById('filter-fim').value    = f.fim    || FILTROS_DEFAULTS.fim;
    document.getElementById('search-banco').value  = f.qBanco || '';
    document.getElementById('search-sia').value    = f.qSia   || '';
    State.movimento = f.movimento || FILTROS_DEFAULTS.movimento;
    document.querySelectorAll('#movimento-toggle button').forEach(b =>
      b.classList.toggle('active', b.dataset.mov === State.movimento)
    );
  }

  function salvarFiltros() {
    R2A.filtros.save(FILTROS_SCOPE, snapshotFiltros());
  }

  function restaurarFiltros() {
    const f = R2A.filtros.load(FILTROS_SCOPE, FILTROS_DEFAULTS);
    aplicarFiltros(f);
  }

  // Wrapper · sempre que render acontece, persiste o estado dos filtros
  function renderAllPersist() { salvarFiltros(); renderAll(); }

  // -------- LIMPAR FILTROS --------
  function limparFiltros() {
    aplicarFiltros(FILTROS_DEFAULTS);
    R2A.filtros.clear(FILTROS_SCOPE);
    renderAll();
  }

  // -------- WIRING --------
  function wire() {
    document.querySelectorAll('#movimento-toggle button').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#movimento-toggle button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        State.movimento = b.dataset.mov;
        renderAllPersist();
      });
    });

    ['filter-conta', 'filter-status', 'filter-ini', 'filter-fim'].forEach(id =>
      document.getElementById(id).addEventListener('change', renderAllPersist)
    );
    ['search-banco', 'search-sia'].forEach(id =>
      document.getElementById(id).addEventListener('input', renderAllPersist)
    );

    // delegação de cliques em linhas
    ['tbody-banco', 'tbody-sia'].forEach(tbId => {
      document.getElementById(tbId).addEventListener('click', e => {
        const tr = e.target.closest('tr[data-side]');
        if (!tr) return;
        toggleRow(tr.dataset.side, tr.dataset.id);
      });
    });

    document.getElementById('check-all-banco').addEventListener('change', e => toggleAll('banco', e.target.checked));
    document.getElementById('check-all-sia').addEventListener('change', e => toggleAll('sia', e.target.checked));

    // botões
    const btnEsp = document.getElementById('btn-espelhadas');
    if (btnEsp) btnEsp.addEventListener('click', runEspelhadas);
    document.getElementById('btn-wave1').addEventListener('click', runWave1);
    document.getElementById('btn-wave2').addEventListener('click', runWave2);
    document.getElementById('btn-match-manual').addEventListener('click', manualMatch);
    document.getElementById('btn-ignorar').addEventListener('click', () => applyStatus('ignorado'));
    document.getElementById('btn-justificar').addEventListener('click', () => applyStatus('justificado'));
    document.getElementById('btn-analise').addEventListener('click', () => applyStatus('analise'));
    document.getElementById('btn-reverter-sel').addEventListener('click', reverseSelection);
    document.getElementById('btn-reverter-tudo').addEventListener('click', reverseAll);
    document.getElementById('btn-limpar').addEventListener('click', limparFiltros);

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', confirmModal);
  }

  // -------- INIT --------
  document.addEventListener('DOMContentLoaded', async () => {
    if (!R2A.requireAuth()) return;
    R2A.renderShell({ modulo: 'conciliador', item: 'conciliacao' });
    R2A.renderFooter();
    // Skeleton inicial nas duas tabelas enquanto carrega
    try {
      const sk = ['w-8', 'w-10', 'w-30', 'w-15', 'w-20'];
      const tbB = document.getElementById('tbody-banco');
      const tbS = document.getElementById('tbody-sia');
      if (tbB) tbB.innerHTML = R2A.skeleton.rows(6, sk);
      if (tbS) tbS.innerHTML = R2A.skeleton.rows(8, sk);
    } catch {}
    await carregarDados();
    restaurarFiltros();
    wire();
    bindVirtualScroll();
    renderAll();
  });

})();
