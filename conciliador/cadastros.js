// ============================================================
// R2 Conciliador · cadastros.js
// Sub-abas: Contas bancárias, Categorias, Usuários
// ============================================================

(function () {
  'use strict';

  const CFG = window.R2A_CONFIG;
  const C = CFG.COLLECTIONS;

  // Lista de bancos brasileiros mais comuns
  const BANCOS_BR = [
    'Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal', 'Itaú',
    'Santander', 'Sicoob', 'Sicredi', 'Banrisul', 'Inter', 'Nubank',
    'BTG Pactual', 'Safra', 'Original', 'PagBank', 'C6 Bank', 'Outro'
  ];

  const State = {
    tab: 'contas',         // contas | categorias | usuarios
    contas: [],
    categorias: [],
    usuarios: [],
    editing: null,         // { tipo, id } ou null
    search: { contas: '', categorias: '', usuarios: '' }
  };

  function userIsAdmin() {
    return R2A.session.user().perfil === 'admin';
  }

  // ------------------------------------------------------------
  // CARGA
  // ------------------------------------------------------------
  async function reload() {
    State.contas = await R2A.data.list(C.CONTAS);
    State.categorias = await R2A.data.list(C.CATEGORIAS);
    State.usuarios = await R2A.data.list(C.USUARIOS);
    updateBadges();
    renderTab();
  }

  function updateBadges() {
    document.getElementById('badge-contas').textContent = State.contas.length;
    document.getElementById('badge-categorias').textContent = State.categorias.length;
    document.getElementById('badge-usuarios').textContent = State.usuarios.length;
  }

  // ------------------------------------------------------------
  // RENDER GERAL
  // ------------------------------------------------------------
  function renderTab() {
    R2A.$$('.r2a-tab-content').forEach(t => t.classList.add('hidden'));
    R2A.$$('.r2a-subtab').forEach(t => t.classList.toggle('active', t.dataset.tab === State.tab));
    document.getElementById('tab-' + State.tab).classList.remove('hidden');

    if (State.tab === 'contas') renderContas();
    if (State.tab === 'categorias') renderCategorias();
    if (State.tab === 'usuarios') renderUsuarios();
  }

  function matchSearch(text, q) {
    if (!q) return true;
    return String(text || '').toLowerCase().includes(q.toLowerCase());
  }

  // ------------------------------------------------------------
  // ABA CONTAS
  // ------------------------------------------------------------
  function renderContas() {
    const q = State.search.contas;
    const items = State.contas.filter(c =>
      matchSearch(c.apelido, q) || matchSearch(c.banco, q) || matchSearch(c.numero, q)
    );
    const wrap = document.getElementById('list-contas');

    if (items.length === 0) {
      wrap.innerHTML = `
        <div class="r2a-data-empty">
          <div class="icon">⬢</div>
          <div class="title">Nenhuma conta cadastrada</div>
          <div class="sub">Cadastre as contas bancárias que serão conciliadas.</div>
          <button class="btn btn-primary" id="empty-new-conta">+ Nova conta</button>
        </div>`;
      const btn = document.getElementById('empty-new-conta');
      if (btn) btn.addEventListener('click', () => openContaModal());
      return;
    }

    wrap.innerHTML = `
      <div class="r2a-data-tbl">
        <table>
          <thead>
            <tr>
              <th>Apelido</th>
              <th>Tipo</th>
              <th>Banco</th>
              <th>Agência</th>
              <th>Número</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(c => {
              const tipo = CFG.TIPOS_CONTA.find(t => t.id === (c.tipo || 'corrente')) || CFG.TIPOS_CONTA[0];
              // Indicador de vínculo CC ↔ Garantida
              let vincTxt = '';
              if (c.tipo === 'garantida' && c.conta_vinculada_id) {
                const cc = State.contas.find(x => x.id === c.conta_vinculada_id);
                vincTxt = cc ? `<div class="vinc-info">↔ vinculada a ${cc.apelido}</div>` : '';
              } else if ((c.tipo || 'corrente') === 'corrente') {
                const cg = State.contas.find(x => x.conta_vinculada_id === c.id);
                if (cg) vincTxt = `<div class="vinc-info">↔ garantida: ${cg.apelido}</div>`;
              }
              return `
              <tr class="${c.ativo === false ? 'inactive' : ''}">
                <td><strong>${c.apelido || '—'}</strong>${c.ativo === false ? ' <span class="pill ignorado">inativa</span>' : ''}${vincTxt}</td>
                <td><span class="pill tipo-${tipo.id}">${tipo.label}</span></td>
                <td>${c.banco || '—'}</td>
                <td>${c.agencia || '—'}</td>
                <td>${c.numero || '—'}</td>
                <td class="right">
                  <div class="r2a-row-actions">
                    <button class="r2a-icon-btn" data-act="edit-conta" data-id="${c.id}" title="Editar" aria-label="Editar">✎</button>
                    <button class="r2a-icon-btn danger" data-act="del-conta" data-id="${c.id}" title="Excluir" aria-label="Excluir">🗑</button>
                  </div>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openContaModal(id) {
    const isEdit = !!id;
    const c = isEdit ? State.contas.find(x => x.id === id) : { banco: '', agencia: '', numero: '', apelido: '', tipo: 'corrente' };
    State.editing = { tipo: 'conta', id };

    const bancosOpts = BANCOS_BR.map(b =>
      `<option value="${b}" ${b === c.banco ? 'selected' : ''}>${b}</option>`
    ).join('');

    const tiposOpts = CFG.TIPOS_CONTA.map(t =>
      `<option value="${t.id}" ${t.id === (c.tipo || 'corrente') ? 'selected' : ''}>${t.label}</option>`
    ).join('');

    openModal({
      title: isEdit ? 'Editar conta bancária' : 'Nova conta bancária',
      body: `
        <div class="r2a-form-error" id="form-err"></div>
        <div class="r2a-form">
          <div class="row-2">
            <div class="field">
              <label>Apelido <span class="req">*</span></label>
              <input type="text" id="f-apelido" placeholder="Ex: BB · Movimento" value="${c.apelido || ''}" autofocus>
            </div>
            <div class="field">
              <label>Tipo de conta <span class="req">*</span></label>
              <select id="f-tipo">${tiposOpts}</select>
            </div>
          </div>
          <div class="field">
            <label>Banco <span class="req">*</span></label>
            <select id="f-banco"><option value="">— selecione —</option>${bancosOpts}</select>
          </div>
          <div class="row-2">
            <div class="field">
              <label>Agência <span class="req">*</span></label>
              <input type="text" id="f-agencia" placeholder="0001-2" value="${c.agencia || ''}">
            </div>
            <div class="field">
              <label>Número da conta <span class="req">*</span></label>
              <input type="text" id="f-numero" placeholder="12345-6" value="${c.numero || ''}">
            </div>
          </div>
          <div class="field" id="f-vinc-wrap" style="display: none;">
            <label>Conta corrente vinculada <span class="req">*</span></label>
            <select id="f-vinc"><option value="">— selecione —</option></select>
            <div class="r2a-form-hint" style="margin-top: 6px;">
              Transferências entre esta garantida e a conta corrente vinculada serão conciliadas automaticamente pela Onda 0.
            </div>
          </div>
          <div class="r2a-form-hint" id="tipo-hint"></div>
        </div>
      `,
      onConfirm: () => salvarConta(id)
    });

    // Repopular select da conta vinculada conforme o banco/tipo
    const updateVinc = () => {
      const tipo = document.getElementById('f-tipo').value;
      const banco = document.getElementById('f-banco').value;
      const wrap = document.getElementById('f-vinc-wrap');
      const sel = document.getElementById('f-vinc');
      if (tipo !== 'garantida') {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = '';
      // Lista CCs do mesmo banco (exceto a propria, se editando)
      const candidatas = State.contas.filter(x =>
        x.id !== id && x.tipo === 'corrente' && (banco ? x.banco === banco : true)
      );
      const atual = c.conta_vinculada_id || '';
      sel.innerHTML = '<option value="">— selecione —</option>' +
        candidatas.map(x => `<option value="${x.id}" ${x.id === atual ? 'selected' : ''}>${x.apelido} · ag. ${x.agencia} · c/c ${x.numero}</option>`).join('');
    };

    // Mostrar dica do tipo selecionado + atualizar select de vinculo
    const updateHint = () => {
      const t = CFG.TIPOS_CONTA.find(x => x.id === document.getElementById('f-tipo').value);
      document.getElementById('tipo-hint').textContent = t ? t.descricao : '';
      updateVinc();
    };
    document.getElementById('f-tipo').addEventListener('change', updateHint);
    document.getElementById('f-banco').addEventListener('change', updateVinc);
    updateHint();
  }

  async function salvarConta(id) {
    const apelido = document.getElementById('f-apelido').value.trim();
    const tipo = document.getElementById('f-tipo').value;
    const banco = document.getElementById('f-banco').value;
    const agencia = document.getElementById('f-agencia').value.trim();
    const numero = document.getElementById('f-numero').value.trim();
    const vincEl = document.getElementById('f-vinc');
    const conta_vinculada_id = (tipo === 'garantida' && vincEl) ? vincEl.value || null : null;

    if (!apelido || !tipo || !banco || !agencia || !numero) {
      return showFormError('Preencha todos os campos obrigatórios');
    }
    if (tipo === 'garantida' && !conta_vinculada_id) {
      return showFormError('Conta garantida precisa de uma conta corrente vinculada');
    }

    // Validação de duplicidade (banco + agência + número + tipo)
    // Permite mesma ag/número se o tipo for diferente (CC + Garantida)
    const dup = State.contas.find(c =>
      c.id !== id &&
      c.banco === banco &&
      c.agencia === agencia &&
      c.numero === numero &&
      (c.tipo || 'corrente') === tipo
    );
    if (dup) return showFormError('Já existe uma conta com esse banco, agência, número e tipo');

    const data = { apelido, tipo, banco, agencia, numero, ativo: true, conta_vinculada_id };

    if (id) {
      await R2A.data.update(C.CONTAS, id, data);
      R2A.auditar('cadastro_conta_editar', { id, ...data });
      R2A.toast('Conta atualizada', 'success');
    } else {
      const novo = await R2A.data.add(C.CONTAS, data);
      R2A.auditar('cadastro_conta_criar', { id: novo.id, ...data });
      R2A.toast('Conta cadastrada', 'success');
    }
    closeModal();
    await reload();
  }

  async function excluirConta(id) {
    const c = State.contas.find(x => x.id === id);
    if (!c) return;
    const ok = await R2A.confirm(`Excluir a conta "${c.apelido}"? Se houver lançamentos vinculados ela será apenas inativada.`);
    if (!ok) return;

    const r = await R2A.data.removeOrInactivate(C.CONTAS, id);
    R2A.auditar('cadastro_conta_excluir', { id, resultado: r.acao });
    if (r.acao === 'inativado') {
      R2A.toast(`Conta inativada (${r.vinculos.qtd} ${r.vinculos.onde} vinculados)`, 'warning');
    } else {
      R2A.toast('Conta excluída', 'success');
    }
    await reload();
  }

  // ------------------------------------------------------------
  // ABA CATEGORIAS
  // ------------------------------------------------------------
  function renderCategorias() {
    const q = State.search.categorias;
    const items = State.categorias.filter(c =>
      matchSearch(c.nome, q) || matchSearch(c.obs, q)
    );
    const wrap = document.getElementById('list-categorias');

    if (items.length === 0) {
      wrap.innerHTML = `
        <div class="r2a-data-empty">
          <div class="icon">◆</div>
          <div class="title">Nenhuma categoria cadastrada</div>
          <div class="sub">Cadastre as categorias usadas nas observações dos lançamentos.</div>
          <button class="btn btn-primary" id="empty-new-cat">+ Nova categoria</button>
        </div>`;
      const btn = document.getElementById('empty-new-cat');
      if (btn) btn.addEventListener('click', () => openCategoriaModal());
      return;
    }

    wrap.innerHTML = `
      <div class="r2a-data-tbl">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Observação</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(c => `
              <tr class="${c.ativo === false ? 'inactive' : ''}">
                <td><strong>${c.nome}</strong>${c.ativo === false ? ' <span class="pill ignorado">inativa</span>' : ''}</td>
                <td style="color: var(--text-2);">${c.obs || '—'}</td>
                <td class="right">
                  <div class="r2a-row-actions">
                    <button class="r2a-icon-btn" data-act="edit-cat" data-id="${c.id}" title="Editar" aria-label="Editar">✎</button>
                    <button class="r2a-icon-btn danger" data-act="del-cat" data-id="${c.id}" title="Excluir" aria-label="Excluir">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openCategoriaModal(id) {
    const isEdit = !!id;
    const c = isEdit ? State.categorias.find(x => x.id === id) : { nome: '', obs: '' };
    State.editing = { tipo: 'categoria', id };

    openModal({
      title: isEdit ? 'Editar categoria' : 'Nova categoria',
      body: `
        <div class="r2a-form-error" id="form-err"></div>
        <div class="r2a-form">
          <div class="field">
            <label>Nome <span class="req">*</span></label>
            <input type="text" id="f-nome" placeholder="Ex: Tarifa bancária" value="${c.nome || ''}">
          </div>
          <div class="field">
            <label>Observação (texto)</label>
            <textarea id="f-obs" placeholder="Descrição opcional da categoria">${c.obs || ''}</textarea>
          </div>
        </div>
      `,
      onConfirm: () => salvarCategoria(id)
    });
  }

  async function salvarCategoria(id) {
    const nome = document.getElementById('f-nome').value.trim();
    const obs = document.getElementById('f-obs').value.trim();
    if (!nome) return showFormError('Informe o nome da categoria');

    const dup = State.categorias.find(c =>
      c.id !== id && c.nome.toLowerCase() === nome.toLowerCase()
    );
    if (dup) return showFormError('Já existe uma categoria com esse nome');

    const data = { nome, obs, ativo: true };
    if (id) {
      await R2A.data.update(C.CATEGORIAS, id, data);
      R2A.auditar('cadastro_categoria_editar', { id, ...data });
      R2A.toast('Categoria atualizada', 'success');
    } else {
      const novo = await R2A.data.add(C.CATEGORIAS, data);
      R2A.auditar('cadastro_categoria_criar', { id: novo.id, ...data });
      R2A.toast('Categoria cadastrada', 'success');
    }
    closeModal();
    await reload();
  }

  async function excluirCategoria(id) {
    const c = State.categorias.find(x => x.id === id);
    if (!c) return;
    const ok = await R2A.confirm(`Excluir a categoria "${c.nome}"? Se houver lançamentos vinculados ela será apenas inativada.`);
    if (!ok) return;

    const r = await R2A.data.removeOrInactivate(C.CATEGORIAS, id);
    R2A.auditar('cadastro_categoria_excluir', { id, resultado: r.acao });
    if (r.acao === 'inativado') {
      R2A.toast(`Categoria inativada (${r.vinculos.qtd} ${r.vinculos.onde} vinculados)`, 'warning');
    } else {
      R2A.toast('Categoria excluída', 'success');
    }
    await reload();
  }

  // ------------------------------------------------------------
  // ABA USUÁRIOS (somente admin)
  // ------------------------------------------------------------
  function renderUsuarios() {
    const wrap = document.getElementById('list-usuarios');

    if (!userIsAdmin()) {
      wrap.innerHTML = `
        <div class="r2a-locked">
          <div class="icon">🔒</div>
          <div>Apenas administradores podem gerenciar usuários.</div>
        </div>`;
      const btnNew = document.getElementById('btn-new-usuario');
      if (btnNew) btnNew.style.display = 'none';
      return;
    }

    const q = State.search.usuarios;
    const items = State.usuarios.filter(u =>
      matchSearch(u.nome, q) || matchSearch(u.email, q)
    );

    if (items.length === 0) {
      wrap.innerHTML = `
        <div class="r2a-data-empty">
          <div class="icon">☰</div>
          <div class="title">Nenhum usuário cadastrado</div>
          <div class="sub">Cadastre os usuários R2 que terão acesso ao sistema.</div>
          <button class="btn btn-primary" id="empty-new-user">+ Novo usuário</button>
        </div>`;
      const btn = document.getElementById('empty-new-user');
      if (btn) btn.addEventListener('click', () => openUsuarioModal());
      return;
    }

    wrap.innerHTML = `
      <div class="r2a-data-tbl">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th class="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(u => `
              <tr class="${u.ativo === false ? 'inactive' : ''}">
                <td><strong>${u.nome}</strong>${u.ativo === false ? ' <span class="pill ignorado">inativo</span>' : ''}</td>
                <td>${u.email}</td>
                <td><span class="pill ${u.perfil}">${u.perfil}</span></td>
                <td class="right">
                  <div class="r2a-row-actions">
                    <button class="r2a-icon-btn" data-act="edit-user" data-id="${u.id}" title="Editar" aria-label="Editar">✎</button>
                    <button class="r2a-icon-btn danger" data-act="del-user" data-id="${u.id}" title="Excluir" aria-label="Excluir">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openUsuarioModal(id) {
    if (!userIsAdmin()) return;
    const isEdit = !!id;
    const u = isEdit ? State.usuarios.find(x => x.id === id) : { nome: '', email: '', perfil: 'operador' };
    State.editing = { tipo: 'usuario', id };

    openModal({
      title: isEdit ? 'Editar usuário' : 'Novo usuário',
      body: `
        <div class="r2a-form-error" id="form-err"></div>
        <div class="r2a-form">
          <div class="field">
            <label>Nome <span class="req">*</span></label>
            <input type="text" id="f-nome" placeholder="Nome completo" value="${u.nome || ''}">
          </div>
          <div class="field">
            <label>E-mail <span class="req">*</span></label>
            <input type="email" id="f-email" placeholder="usuario@solucoesr2.com.br" value="${u.email || ''}" ${isEdit ? 'readonly' : ''}>
          </div>
          <div class="row-2">
            <div class="field">
              <label>Perfil <span class="req">*</span></label>
              <select id="f-perfil">
                <option value="admin" ${u.perfil === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="operador" ${u.perfil === 'operador' ? 'selected' : ''}>Operador</option>
              </select>
            </div>
            <div class="field">
              <label>${isEdit ? 'Nova senha (opcional)' : 'Senha *'}</label>
              <input type="password" id="f-senha" placeholder="${isEdit ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}">
            </div>
          </div>
        </div>
      `,
      onConfirm: () => salvarUsuario(id)
    });
  }

  async function salvarUsuario(id) {
    const nome = document.getElementById('f-nome').value.trim();
    const email = document.getElementById('f-email').value.trim().toLowerCase();
    const perfil = document.getElementById('f-perfil').value;
    const senha = document.getElementById('f-senha').value;
    const isEdit = !!id;

    // Limpa erros anteriores
    R2A.limparErrosForm(document.getElementById('modal-body'));

    if (!nome || !email || !perfil) {
      if (!nome) R2A.marcarErro(document.getElementById('f-nome'), 'Obrigatório');
      if (!email) R2A.marcarErro(document.getElementById('f-email'), 'Obrigatório');
      if (!perfil) R2A.marcarErro(document.getElementById('f-perfil'), 'Obrigatório');
      return showFormError('Preencha todos os campos obrigatórios');
    }
    if (!R2A.validar.email(email)) {
      R2A.marcarErro(document.getElementById('f-email'), 'Formato de e-mail inválido');
      return showFormError('E-mail inválido');
    }
    if (!isEdit && (!senha || senha.length < 6)) {
      R2A.marcarErro(document.getElementById('f-senha'), 'Mínimo 6 caracteres');
      return showFormError('Senha deve ter no mínimo 6 caracteres');
    }
    if (isEdit && senha && senha.length < 6) {
      R2A.marcarErro(document.getElementById('f-senha'), 'Mínimo 6 caracteres');
      return showFormError('Nova senha deve ter no mínimo 6 caracteres');
    }

    const dup = State.usuarios.find(u => u.id !== id && u.email === email);
    if (dup) return showFormError('Já existe um usuário com esse e-mail');

    const data = { nome, email, perfil, ativo: true };

    if (id) {
      await R2A.data.update(C.USUARIOS, id, data);
      R2A.auditar('cadastro_usuario_editar', { id, nome, email, perfil });
      // Em produção: se senha mudou, atualizar via Firebase Auth Admin
      R2A.toast(senha ? 'Usuário atualizado · senha pendente em produção' : 'Usuário atualizado', 'success');
    } else {
      // Em modo DEV não criamos senha (login aceita qualquer). Em produção, criar via Auth.
      const novo = await R2A.data.add(C.USUARIOS, data);
      R2A.auditar('cadastro_usuario_criar', { id: novo.id, nome, email, perfil });
      R2A.toast(CFG.MODO_DEV ? 'Usuário criado (em prod: senha será aplicada via Firebase Auth)' : 'Usuário criado', 'success');
    }
    closeModal();
    await reload();
  }

  async function excluirUsuario(id) {
    const u = State.usuarios.find(x => x.id === id);
    if (!u) return;
    if (u.id === R2A.session.user().uid) {
      R2A.toast('Não é possível excluir o próprio usuário', 'error');
      return;
    }
    const ok = await R2A.confirm(`Excluir o usuário "${u.nome}"? Como há registros de auditoria, ele será inativado.`);
    if (!ok) return;

    const r = await R2A.data.removeOrInactivate(C.USUARIOS, id);
    R2A.auditar('cadastro_usuario_excluir', { id, resultado: r.acao });
    R2A.toast(r.acao === 'inativado' ? 'Usuário inativado' : 'Usuário excluído', 'success');
    await reload();
  }

  // ------------------------------------------------------------
  // MODAL HELPERS
  // ------------------------------------------------------------
  let modalConfirmHandler = null;

  function openModal({ title, body, onConfirm }) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal').classList.add('open');
    modalConfirmHandler = onConfirm;
    // foco no primeiro input
    setTimeout(() => {
      const first = document.querySelector('#modal-body input, #modal-body select, #modal-body textarea');
      if (first) first.focus();
    }, 50);
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('open');
    modalConfirmHandler = null;
    State.editing = null;
  }

  function showFormError(msg) {
    const el = document.getElementById('form-err');
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }

  // ------------------------------------------------------------
  // WIRING
  // ------------------------------------------------------------
  function wire() {
    // Sub-tabs
    R2A.$$('.r2a-subtab').forEach(t => {
      t.addEventListener('click', () => {
        if (t.classList.contains('locked')) return;
        State.tab = t.dataset.tab;
        renderTab();
      });
    });

    // Botões "novo"
    document.getElementById('btn-new-conta').addEventListener('click', () => openContaModal());
    document.getElementById('btn-new-categoria').addEventListener('click', () => openCategoriaModal());
    document.getElementById('btn-new-usuario').addEventListener('click', () => openUsuarioModal());

    // Search inputs
    ['contas', 'categorias', 'usuarios'].forEach(tab => {
      document.getElementById('search-' + tab).addEventListener('input', e => {
        State.search[tab] = e.target.value;
        renderTab();
      });
    });

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', () => {
      if (modalConfirmHandler) modalConfirmHandler();
    });

    // Delegação para botões editar/excluir
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      if (act === 'edit-conta') openContaModal(id);
      if (act === 'del-conta') excluirConta(id);
      if (act === 'edit-cat') openCategoriaModal(id);
      if (act === 'del-cat') excluirCategoria(id);
      if (act === 'edit-user') openUsuarioModal(id);
      if (act === 'del-user') excluirUsuario(id);
    });

    // Restringe aba usuários se não-admin
    if (!userIsAdmin()) {
      const tab = document.querySelector('[data-tab="usuarios"]');
      if (tab) tab.classList.add('locked');
      document.getElementById('btn-new-usuario').style.display = 'none';
    }
  }

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  function mostrarSkeleton() {
    // Skeleton inicial em cada uma das 3 sub-abas enquanto carrega
    const sk = ['w-30', 'w-15', 'w-20', 'w-15', 'w-15', 'w-8'];
    ['list-contas', 'list-categorias', 'list-usuarios'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = `
        <div class="r2a-data-tbl">
          <table>
            <thead><tr><th>Carregando</th><th></th><th></th><th></th><th></th><th></th></tr></thead>
            <tbody>${R2A.skeleton.rows(4, sk)}</tbody>
          </table>
        </div>`;
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!R2A.requireAuth()) return;
    R2A.renderShell({ modulo: 'conciliador', item: 'cadastros' });
    R2A.renderFooter();
    R2A.data.init();
    wire();
    mostrarSkeleton();
    await reload();
  });

})();
