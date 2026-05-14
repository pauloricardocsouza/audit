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
  // Match parcelas × lançamentos · Fase 4
  // Prioridade: vinculo_contrato gravado > match auto por data/valor
  // Tolerância automática: data ±5d, valor ±5%
  // ----------------------------------------------------------
  const TOL_DIAS = 5;
  const TOL_VALOR_PCT = 0.05;

  function statusPagoPorDiferenca(valorEsperado, valorBanco) {
    const diff = valorBanco - valorEsperado;
    if (Math.abs(diff) / valorEsperado <= 0.001) return 'pago';
    return diff > 0 ? 'pago_maior' : 'pago_menor';
  }

  R2A.contratos.matchParcelas = function (contrato, lancamentosBanco) {
    const hoje = new Date().toISOString().slice(0, 10);
    const lancs = lancamentosBanco || [];

    // 1) índice de vínculos manuais existentes (lançamentos já gravados como dessa parcela)
    const vinculosPorParcela = new Map();
    lancs.forEach(b => {
      if (b.vinculo_contrato && b.vinculo_contrato.contratoId === contrato.id) {
        vinculosPorParcela.set(b.vinculo_contrato.parcelaN, b);
      }
    });

    // 2) ids já vinculados (não devem virar candidatos de outras parcelas)
    const idsVinculados = new Set();
    lancs.forEach(b => {
      if (b.vinculo_contrato) idsVinculados.add(b.id);
    });

    return contrato.cronograma_parcelas.map(parc => {
      if (parc.tipo === 'carencia' || parc.valor === 0) {
        return { ...parc, status: 'carencia', pago: null, candidatos: [] };
      }

      const vencDate = new Date(parc.vencimento);
      const valorEsperado = Math.abs(parc.valor);

      // Vínculo manual tem prioridade
      const vincManual = vinculosPorParcela.get(parc.n);
      if (vincManual) {
        const valorBanco = Math.abs(vincManual.valor);
        return {
          ...parc,
          status: statusPagoPorDiferenca(valorEsperado, valorBanco),
          pago: {
            data: vincManual.data,
            valor: valorBanco,
            diferenca: +(valorBanco - valorEsperado).toFixed(2),
            ref: vincManual.id,
            hist: vincManual.hist || '',
            vinculoManual: true
          },
          candidatos: []
        };
      }

      // Match automático entre lançamentos ainda não vinculados
      const candidatos = lancs.filter(b => {
        if (idsVinculados.has(b.id)) return false;
        if (b.tipo !== 'D') return false;
        const dt = new Date(b.data);
        const diasDiff = Math.abs((dt - vencDate) / (1000 * 60 * 60 * 24));
        if (diasDiff > TOL_DIAS) return false;
        const valorBanco = Math.abs(b.valor);
        const diffPct = Math.abs(valorBanco - valorEsperado) / valorEsperado;
        return diffPct <= TOL_VALOR_PCT;
      }).map(b => ({
        ...b,
        _diasDiff: Math.abs((new Date(b.data) - vencDate) / (1000 * 60 * 60 * 24)),
        _diffPct: Math.abs(Math.abs(b.valor) - valorEsperado) / valorEsperado
      })).sort((a, b) => (a._diasDiff + a._diffPct) - (b._diasDiff + b._diffPct));

      if (candidatos.length === 0) {
        const status = parc.vencimento < hoje ? 'atraso' : 'aberta';
        return { ...parc, status, pago: null, candidatos: [] };
      }

      // Match único e seguro → sugere como "pago automático"
      const escolhido = candidatos[0];
      const valorBanco = Math.abs(escolhido.valor);
      return {
        ...parc,
        status: statusPagoPorDiferenca(valorEsperado, valorBanco),
        pago: {
          data: escolhido.data,
          valor: valorBanco,
          diferenca: +(valorBanco - valorEsperado).toFixed(2),
          ref: escolhido.id,
          hist: escolhido.hist || '',
          vinculoManual: false,
          ambiguidade: candidatos.length > 1
        },
        candidatos: candidatos.slice(0, 10)
      };
    });
  };

  // Vincula um lançamento bancário a uma parcela específica
  R2A.contratos.vincularParcela = async function (contratoId, parcelaN, lancamentoBancoId) {
    const lanc = await R2A.data.get(R2A_CONFIG.COLLECTIONS.LANCAMENTOS_BANCO, lancamentoBancoId);
    if (lanc && R2A.periodos && R2A.periodos.assertAberto) {
      await R2A.periodos.assertAberto(lanc.data, 'vincular parcela');
    }
    const patch = {
      vinculo_contrato: { contratoId, parcelaN, vinculadoEm: new Date().toISOString() },
      status: 'conciliado'
    };
    await R2A.data.update(R2A_CONFIG.COLLECTIONS.LANCAMENTOS_BANCO, lancamentoBancoId, patch);
    R2A.auditar('contrato.parcela.vincular', { contratoId, parcelaN, lancamentoBancoId });
    return true;
  };

  R2A.contratos.desvincularParcela = async function (lancamentoBancoId) {
    const lanc = await R2A.data.get(R2A_CONFIG.COLLECTIONS.LANCAMENTOS_BANCO, lancamentoBancoId);
    if (!lanc) return false;
    if (R2A.periodos && R2A.periodos.assertAberto) {
      await R2A.periodos.assertAberto(lanc.data, 'desvincular parcela');
    }
    const vinculoAnterior = lanc.vinculo_contrato;
    await R2A.data.update(R2A_CONFIG.COLLECTIONS.LANCAMENTOS_BANCO, lancamentoBancoId, {
      vinculo_contrato: null,
      status: 'pendente'
    });
    R2A.auditar('contrato.parcela.desvincular', { lancamentoBancoId, anterior: vinculoAnterior });
    return true;
  };

  // Auto-vincula parcelas que têm UM ÚNICO candidato dentro da tolerância
  R2A.contratos.autoVincular = async function (contratoId) {
    const contrato = await R2A.contratos.get(contratoId);
    if (!contrato) return { vinculados: 0, ambiguos: 0, bloqueados: 0 };
    const lancs = await R2A.data.list(R2A_CONFIG.COLLECTIONS.LANCAMENTOS_BANCO);
    const matches = R2A.contratos.matchParcelas(contrato, lancs);

    let vinculados = 0, ambiguos = 0, bloqueados = 0;
    for (const m of matches) {
      if (m.tipo === 'carencia') continue;
      if (m.pago && m.pago.vinculoManual) continue;
      if (m.candidatos && m.candidatos.length === 1 && m.pago) {
        try {
          await R2A.contratos.vincularParcela(contratoId, m.n, m.pago.ref);
          vinculados++;
        } catch (e) {
          if (e.code === 'PERIODO_FECHADO') bloqueados++;
          else throw e;
        }
      } else if (m.candidatos && m.candidatos.length > 1) {
        ambiguos++;
      }
    }
    return { vinculados, ambiguos, bloqueados };
  };

  // ----------------------------------------------------------
  // KPIs do Dashboard · Fase 6
  // Recebe contratos + lancamentos e retorna um pacote consolidado:
  //  - totais (principal, líquido, saldo devedor estimado)
  //  - parcelas (previstas, pagas, em atraso, próximas 30d)
  //  - composições (por banco, por indexador)
  //  - pagamentos projetados nos próximos 12 meses
  //  - lista priorizada de pendências (atraso + vencimento ≤ 7d)
  // ----------------------------------------------------------
  R2A.contratos.kpisDashboard = function (contratos, lancamentos) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite30 = new Date(hoje); limite30.setDate(limite30.getDate() + 30);
    const limite7  = new Date(hoje); limite7.setDate(limite7.getDate() + 7);

    let totalPrincipal = 0;
    let totalLiquido = 0;
    let totalPago = 0;
    let totalProx30 = 0;
    let totalAtraso = 0;
    let qtdAtraso = 0;
    let qtdProx30 = 0;

    const porBanco = new Map();        // banco -> { qtd, principal }
    const porIndex = new Map();        // 'CDI' / 'pré-fixado' / etc -> principal
    const mesesProj = new Map();       // 'YYYY-MM' -> valor projetado
    const pendencias = [];             // parcelas em atraso / próximas 7d

    contratos.forEach(c => {
      totalPrincipal += c.valores.principal || 0;
      totalLiquido   += c.valores.liquido_liberado || 0;

      // Composição por banco
      const bkey = c.banco;
      if (!porBanco.has(bkey)) porBanco.set(bkey, { qtd: 0, principal: 0 });
      const bb = porBanco.get(bkey);
      bb.qtd++; bb.principal += c.valores.principal || 0;

      // Composição por indexador
      const ikey = (c.taxa_juros && c.taxa_juros.indexador) ? c.taxa_juros.indexador : 'Pré-fixado';
      porIndex.set(ikey, (porIndex.get(ikey) || 0) + (c.valores.principal || 0));

      // Match das parcelas
      const parcelas = R2A.contratos.matchParcelas(c, lancamentos);
      parcelas.forEach(p => {
        if (p.tipo === 'carencia' || p.valor === 0) return;
        const venc = new Date(p.vencimento + 'T00:00:00');

        // Pago: soma do que foi efetivamente debitado
        if (p.pago) totalPago += p.pago.valor;

        // Em atraso: vencimento < hoje e não pago
        if (!p.pago && venc < hoje) {
          totalAtraso += p.valor;
          qtdAtraso++;
          pendencias.push({ tipo: 'atraso', parcela: p, contrato: c, diasAtraso: Math.ceil((hoje - venc) / 86400000) });
        }
        // Próximos 30 dias: vencimento entre hoje e +30, não pago
        else if (!p.pago && venc >= hoje && venc <= limite30) {
          totalProx30 += p.valor;
          qtdProx30++;
          if (venc <= limite7) {
            pendencias.push({ tipo: 'proxima', parcela: p, contrato: c, diasParaVencer: Math.ceil((venc - hoje) / 86400000) });
          }
        }

        // Projeção mensal · 12 meses à frente, soma do valor previsto (independente de pago)
        const mesKey = p.vencimento.slice(0, 7);
        mesesProj.set(mesKey, (mesesProj.get(mesKey) || 0) + p.valor);
      });
    });

    // Próximos 12 meses ordenados
    const mesesArr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const k = d.toISOString().slice(0, 7);
      mesesArr.push({ mes: k, valor: mesesProj.get(k) || 0 });
    }

    // Ordenação das pendências: atrasos primeiro (mais antigos), depois próximas
    pendencias.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'atraso' ? -1 : 1;
      if (a.tipo === 'atraso') return (b.diasAtraso || 0) - (a.diasAtraso || 0);
      return (a.diasParaVencer || 0) - (b.diasParaVencer || 0);
    });

    return {
      totalPrincipal,
      totalLiquido,
      totalPago,
      saldoDevedor: Math.max(0, totalPrincipal - totalPago),
      totalProx30,
      qtdProx30,
      totalAtraso,
      qtdAtraso,
      porBanco: Array.from(porBanco.entries()).map(([banco, v]) => ({ banco, ...v })).sort((a, b) => b.principal - a.principal),
      porIndex: Array.from(porIndex.entries()).map(([indexador, valor]) => ({ indexador, valor })).sort((a, b) => b.valor - a.valor),
      mesesProj: mesesArr,
      pendencias: pendencias.slice(0, 12),
      qtdContratos: contratos.length,
      qtdAtivos: contratos.filter(c => c.estado === 'ativo').length
    };
  };

  // ----------------------------------------------------------
  // KPIs simples (já existente, mantido)
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
