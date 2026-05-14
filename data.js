// ============================================================
// R2 Conciliador · data.js
// Abstração de persistência. Em DEV usa localStorage,
// em produção usa Firestore. API única para o resto do app.
// ============================================================

(function () {
  'use strict';

  const CFG = window.R2A_CONFIG;
  const M = window.R2A_MOCK || {};

  const LS_PREFIX = 'r2a_';
  const SEED_VERSION = '4'; // bumpe quando o mock mudar para forçar re-seed
  const R2A = window.R2A = window.R2A || {};

  // ------------------------------------------------------------
  // LOCAL STORAGE BACKEND (modo DEV)
  // ------------------------------------------------------------
  function lsKey(col) { return LS_PREFIX + col; }

  function lsLoad(col) {
    try { return JSON.parse(localStorage.getItem(lsKey(col)) || '[]'); }
    catch { return []; }
  }
  function lsSave(col, arr) {
    localStorage.setItem(lsKey(col), JSON.stringify(arr));
  }

  // Seed inicial a partir do mock, reaplicado quando SEED_VERSION muda
  function seedFromMock() {
    const seedKey = LS_PREFIX + 'seed_version';
    if (localStorage.getItem(seedKey) === SEED_VERSION) return;

    // Limpa coleções que vamos resemear
    [CFG.COLLECTIONS.CONTAS, CFG.COLLECTIONS.CATEGORIAS, CFG.COLLECTIONS.USUARIOS].forEach(c =>
      localStorage.removeItem(lsKey(c))
    );

    if (M.CONTAS) lsSave(CFG.COLLECTIONS.CONTAS, M.CONTAS.map(c => ({ ...c })));
    if (M.CATEGORIAS) lsSave(CFG.COLLECTIONS.CATEGORIAS, M.CATEGORIAS.map(c => ({ ...c, obs: c.obs || '' })));
    lsSave(CFG.COLLECTIONS.USUARIOS, [
      { id: 'u1', nome: 'Ricardo Pereira', email: 'ricardo@solucoesr2.com.br', perfil: 'admin' },
      { id: 'u2', nome: 'Operador Teste',  email: 'operador@solucoesr2.com.br', perfil: 'operador' }
    ]);

    // Contratos: merge com o existente (usuário pode ter importado contratos)
    if (M.CONTRATOS) {
      const existentes = lsLoad(CFG.COLLECTIONS.CONTRATOS);
      const idsMock = new Set(M.CONTRATOS.map(c => c.id));
      const importadosPeloUsuario = existentes.filter(c => !idsMock.has(c.id));
      const mockClone = M.CONTRATOS.map(c => JSON.parse(JSON.stringify(c)));
      lsSave(CFG.COLLECTIONS.CONTRATOS, [...mockClone, ...importadosPeloUsuario]);
    }

    // BANCO e SIA: seed preservando vínculos com contrato e status conciliado
    function seedLancamentos(colKey, mockArr) {
      if (!mockArr) return;
      const antigos = lsLoad(colKey);
      const mapAnt = new Map(antigos.map(b => [b.id, b]));
      const merged = mockArr.map(b => {
        const ant = mapAnt.get(b.id);
        if (ant) {
          // preserva campos que o usuário pode ter alterado (vínculo de contrato, status conciliado, observações)
          const presv = {};
          if (ant.vinculo_contrato) presv.vinculo_contrato = ant.vinculo_contrato;
          if (ant.status && ant.status !== 'pendente') presv.status = ant.status;
          if (ant.observacao) presv.observacao = ant.observacao;
          return { ...b, ...presv };
        }
        return { ...b };
      });
      // mantém também lançamentos extras criados pelo usuário (id não no mock)
      const idsMock = new Set(mockArr.map(b => b.id));
      const extras = antigos.filter(b => !idsMock.has(b.id));
      lsSave(colKey, [...merged, ...extras]);
    }
    seedLancamentos(CFG.COLLECTIONS.LANCAMENTOS_BANCO, M.BANCO);
    seedLancamentos(CFG.COLLECTIONS.LANCAMENTOS_SIA, M.SIA);

    localStorage.setItem(seedKey, SEED_VERSION);
    console.info('[R2A] Seed aplicado · versão ' + SEED_VERSION);
  }

  function genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ------------------------------------------------------------
  // API PÚBLICA · CRUD por coleção
  // ------------------------------------------------------------
  R2A.data = {

    init() {
      if (CFG.MODO_DEV) seedFromMock();
    },

    async list(collection, { where } = {}) {
      if (CFG.MODO_DEV) {
        let arr = lsLoad(collection);
        if (where) {
          Object.entries(where).forEach(([k, v]) => {
            arr = arr.filter(x => x[k] === v);
          });
        }
        return arr;
      }
      // Firestore
      const db = R2A.db();
      let q = db.collection(collection);
      if (where) {
        Object.entries(where).forEach(([k, v]) => { q = q.where(k, '==', v); });
      }
      const snap = await q.get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async get(collection, id) {
      if (CFG.MODO_DEV) {
        return lsLoad(collection).find(x => x.id === id) || null;
      }
      const snap = await R2A.db().collection(collection).doc(id).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },

    async add(collection, data) {
      const id = data.id || genId(collection.slice(0, 3));
      const item = { ...data, id, criado_em: new Date().toISOString() };
      if (CFG.MODO_DEV) {
        const arr = lsLoad(collection);
        arr.push(item);
        lsSave(collection, arr);
        return item;
      }
      await R2A.db().collection(collection).doc(id).set(item);
      return item;
    },

    async update(collection, id, patch) {
      if (CFG.MODO_DEV) {
        const arr = lsLoad(collection);
        const idx = arr.findIndex(x => x.id === id);
        if (idx === -1) throw new Error('Registro não encontrado');
        arr[idx] = { ...arr[idx], ...patch, atualizado_em: new Date().toISOString() };
        lsSave(collection, arr);
        return arr[idx];
      }
      await R2A.db().collection(collection).doc(id).update({ ...patch, atualizado_em: new Date().toISOString() });
      return await this.get(collection, id);
    },

    async remove(collection, id) {
      if (CFG.MODO_DEV) {
        const arr = lsLoad(collection).filter(x => x.id !== id);
        lsSave(collection, arr);
        return true;
      }
      await R2A.db().collection(collection).doc(id).delete();
      return true;
    },

    // Verifica se um registro tem vínculos em outras coleções (regra de exclusão)
    async hasVinculos(collection, id) {
      const C = CFG.COLLECTIONS;
      if (collection === C.CONTAS) {
        const bancos = await this.list(C.LANCAMENTOS_BANCO, { where: { conta: id } });
        if (bancos.length) return { tem: true, qtd: bancos.length, onde: 'lançamentos bancários' };
        const sias = await this.list(C.LANCAMENTOS_SIA, { where: { conta: id } });
        if (sias.length) return { tem: true, qtd: sias.length, onde: 'lançamentos do sistema' };
        return { tem: false };
      }
      if (collection === C.CATEGORIAS) {
        // categorias podem estar referenciadas em observações de matches; em DEV não temos isso ainda
        const matches = await this.list(C.MATCHES, { where: { categoria_id: id } });
        if (matches.length) return { tem: true, qtd: matches.length, onde: 'conciliações' };
        return { tem: false };
      }
      if (collection === C.USUARIOS) {
        // usuários podem aparecer como autor de matches/auditoria
        return { tem: true, qtd: 0, onde: 'auditoria (sempre inativa)' };
      }
      return { tem: false };
    },

    // Exclusão inteligente: tenta excluir; se houver vínculo, marca inativo
    async removeOrInactivate(collection, id) {
      const v = await this.hasVinculos(collection, id);
      if (v.tem) {
        await this.update(collection, id, { ativo: false });
        return { acao: 'inativado', vinculos: v };
      }
      await this.remove(collection, id);
      return { acao: 'excluido' };
    }
  };

})();
