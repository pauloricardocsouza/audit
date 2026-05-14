// ============================================================
// Módulo Análise de Contratos · helpers
// Fase 1: leitura do mock, formatação e match básico contra
// lancamentos_banco (BANCO mock). Fase 5 substituirá esses
// helpers por chamadas reais ao Firestore.
// ============================================================
(function () {
  'use strict';

  const R2A = window.R2A = window.R2A || {};
  R2A.contratos = R2A.contratos || {};

  // ----------------------------------------------------------
  // Acesso aos contratos · sempre via R2A.data (DEV: localStorage com
  // seed do mock + importados pelo upload; PROD: Firestore)
  // ----------------------------------------------------------
  R2A.contratos.list = async function () {
    return await R2A.data.list(R2A_CONFIG.COLLECTIONS.CONTRATOS);
  };

  R2A.contratos.get = async function (id) {
    return await R2A.data.get(R2A_CONFIG.COLLECTIONS.CONTRATOS, id);
  };

  R2A.contratos.add = async function (contrato) {
    return await R2A.data.add(R2A_CONFIG.COLLECTIONS.CONTRATOS, contrato);
  };

  R2A.contratos.update = async function (id, patch) {
    return await R2A.data.update(R2A_CONFIG.COLLECTIONS.CONTRATOS, id, patch);
  };

  // ----------------------------------------------------------
  // Match com lancamentos_banco · Fase 4 (versão inicial)
  // Tolerância: data ±5d, valor ±5% sobre a parcela esperada
  // ----------------------------------------------------------
  R2A.contratos.matchParcelas = function (contrato, lancamentosBanco) {
    const TOL_DIAS = 5;
    const TOL_VALOR_PCT = 0.05;
    const hoje = new Date().toISOString().slice(0, 10);

    return contrato.cronograma_parcelas.map(parc => {
      if (parc.tipo === 'carencia' || parc.valor === 0) {
        return { ...parc, status: 'carencia', pago: null };
      }

      // procura lançamento bancário compatível
      const vencDate = new Date(parc.vencimento);
      const valorEsperado = Math.abs(parc.valor);
      const candidatos = (lancamentosBanco || []).filter(b => {
        if (b.tipo !== 'D') return false;
        const dt = new Date(b.data);
        const diasDiff = Math.abs((dt - vencDate) / (1000 * 60 * 60 * 24));
        if (diasDiff > TOL_DIAS) return false;
        const valorBanco = Math.abs(b.valor);
        const diffPct = Math.abs(valorBanco - valorEsperado) / valorEsperado;
        return diffPct <= TOL_VALOR_PCT;
      });

      if (candidatos.length === 0) {
        const status = parc.vencimento < hoje ? 'atraso' : 'aberta';
        return { ...parc, status, pago: null };
      }

      // pega o mais próximo em data
      const escolhido = candidatos.sort((a, b) => {
        const da = Math.abs(new Date(a.data) - vencDate);
        const db = Math.abs(new Date(b.data) - vencDate);
        return da - db;
      })[0];

      const valorBanco = Math.abs(escolhido.valor);
      const diff = valorBanco - valorEsperado;
      let status = 'pago';
      if (Math.abs(diff) / valorEsperado > 0.001) {
        status = diff > 0 ? 'pago_maior' : 'pago_menor';
      }

      return {
        ...parc,
        status,
        pago: {
          data: escolhido.data,
          valor: valorBanco,
          diferenca: +diff.toFixed(2),
          ref: escolhido.id
        }
      };
    });
  };

  // ----------------------------------------------------------
  // KPIs agregados (todos os contratos)
  // ----------------------------------------------------------
  R2A.contratos.kpis = function (contratos) {
    const total = contratos.length;
    const ativos = contratos.filter(c => c.estado === 'ativo').length;
    const principalTotal = contratos.reduce((s, c) => s + (c.valores.principal || 0), 0);
    const liquidoTotal = contratos.reduce((s, c) => s + (c.valores.liquido_liberado || 0), 0);

    let parcelasPrevistas = 0, parcelasAbertas = 0, parcelasPagas = 0;
    let valorPrevisto = 0, valorPago = 0;

    contratos.forEach(c => {
      (c.cronograma_parcelas || []).forEach(p => {
        if (p.tipo === 'carencia' || p.valor === 0) return;
        parcelasPrevistas++;
        valorPrevisto += p.valor;
      });
    });

    return {
      total, ativos,
      principalTotal, liquidoTotal,
      parcelasPrevistas, parcelasAbertas, parcelasPagas,
      valorPrevisto, valorPago
    };
  };

  // ----------------------------------------------------------
  // Formatadores
  // ----------------------------------------------------------
  R2A.contratos.fmtTaxa = function (taxa) {
    if (!taxa) return '—';
    const partes = [];
    if (taxa.indexador) {
      partes.push(`${taxa.indexador_percentual || 100}% ${taxa.indexador}`);
    }
    if (taxa.componente_fixo_am) {
      partes.push(`+ ${(taxa.componente_fixo_am * 100).toFixed(4)}% a.m.`);
    } else if (taxa.componente_fixo_aa) {
      partes.push(`+ ${(taxa.componente_fixo_aa * 100).toFixed(4)}% a.a.`);
    }
    return partes.join(' ');
  };

  R2A.contratos.fmtSistema = function (sis) {
    const labels = {
      'price': 'Price',
      'sac': 'SAC',
      'bullet': 'Bullet',
      'price_flutuante': 'Price flutuante (CDI)',
      'principal_flat_juros_separados': 'Principal flat',
      'nao_informado': 'Não informado',
      'misto': 'Misto'
    };
    return labels[sis] || sis;
  };

  R2A.contratos.fmtProduto = function (p) {
    const labels = {
      'CCB': 'CCB',
      'CapitalGiro': 'Capital de giro',
      'ContaGarantida': 'Conta garantida',
      'AntecipacaoDuplicatas': 'Antecipação de duplicatas',
      'FCO': 'FCO',
      'Outros': 'Outros'
    };
    return labels[p] || p;
  };

})();
