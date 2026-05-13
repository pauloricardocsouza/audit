// ============================================================
// R2 Conciliador · dashboard.js
// KPIs · Donut · Barras por conta · Linha de evolução mensal
// ============================================================

(function () {
  'use strict';

  const CFG = window.R2A_CONFIG;
  const M = window.R2A_MOCK;
  const C = CFG.COLLECTIONS;

  // Paleta de cores semântica (vai herdar do realinhamento Filadelfia depois)
  const COLORS = {
    success:  '#15803d',
    successL: '#86efac',
    warning:  '#b45309',
    warningL: '#fbbf24',
    danger:   '#b91c1c',
    primary:  '#1e3a8a',
    primaryL: '#3b5bb8',
    accent:   '#0891b2',
    muted:    '#cbd5e1'
  };

  const State = {
    contas: [],
    historico: [],
    matchesPeriodo: [],   // {banco_id, sia_ids, onda, conta, valor, data, usuario, ts}
    charts: {}            // referências para destruir antes de redesenhar
  };

  // ------------------------------------------------------------
  // CARGA
  // ------------------------------------------------------------
  async function carregar() {
    State.contas = await R2A.data.list(C.CONTAS);
    // Em DEV usamos o histórico mockado direto
    State.historico = M.HISTORICO_MENSAL || [];
    // Construir matchesPeriodo a partir do mock atual (estado dos lançamentos)
    construirMatchesPeriodo();
    montarFiltroContas();
  }

  function construirMatchesPeriodo() {
    // Em DEV inferimos a partir dos lançamentos do mock que tenham status conciliado/pendente
    // Em produção: query no Firestore por período/conta
    State.matchesPeriodo = [];
    M.BANCO.forEach(b => {
      State.matchesPeriodo.push({
        side: 'banco',
        conta: b.conta,
        data: b.data,
        valor: Math.abs(b.valor),
        status: b.status || 'pendente'
      });
    });
  }

  function montarFiltroContas() {
    const sel = document.getElementById('dash-conta');
    sel.innerHTML = `<option value="all">Todas (${State.contas.length})</option>` +
      State.contas.map(c => `<option value="${c.id}">${c.apelido}</option>`).join('');
  }

  // ------------------------------------------------------------
  // FILTROS
  // ------------------------------------------------------------
  function getFiltros() {
    return {
      conta: document.getElementById('dash-conta').value,
      ini: document.getElementById('dash-ini').value,
      fim: document.getElementById('dash-fim').value
    };
  }

  function aplicarFiltros(items) {
    const f = getFiltros();
    return items.filter(x => {
      if (f.conta !== 'all' && x.conta !== f.conta) return false;
      if (f.ini && x.data < f.ini) return false;
      if (f.fim && x.data > f.fim) return false;
      return true;
    });
  }

  // ------------------------------------------------------------
  // RENDER TUDO
  // ------------------------------------------------------------
  function renderAll() {
    const itens = aplicarFiltros(State.matchesPeriodo);
    renderKPIs(itens);
    renderDonut(itens);
    renderPorConta(itens);
    renderEvolucao();
  }

  // ------------------------------------------------------------
  // KPIs
  // ------------------------------------------------------------
  function renderKPIs(itens) {
    const conc = itens.filter(x => x.status === 'conciliado');
    const pend = itens.filter(x => ['pendente', 'ambiguo'].includes(x.status));

    const total = itens.length;
    const pct = total ? (conc.length / total * 100) : 0;

    const valConc = conc.reduce((a, x) => a + x.valor, 0);
    const valPend = pend.reduce((a, x) => a + x.valor, 0);
    const valTotal = valConc + valPend;

    document.getElementById('kpi-pct').textContent = pct.toFixed(1).replace('.', ',') + '%';
    document.getElementById('kpi-pct-sub').textContent = `${conc.length} de ${total} lançamentos`;

    document.getElementById('kpi-conc-val').textContent = R2A.fmt.moeda(valConc, { sinal: false });
    document.getElementById('kpi-conc-qtd').textContent = `${conc.length} lançamento(s)`;

    document.getElementById('kpi-pend-val').textContent = R2A.fmt.moeda(valPend, { sinal: false });
    document.getElementById('kpi-pend-qtd').textContent = `${pend.length} lançamento(s)`;

    document.getElementById('kpi-total-val').textContent = R2A.fmt.moeda(valTotal, { sinal: false });
    document.getElementById('kpi-total-qtd').textContent = `${total} lançamento(s) no período`;
  }

  // ------------------------------------------------------------
  // DONUT · Conciliados vs Pendentes
  // ------------------------------------------------------------
  function renderDonut(itens) {
    if (State.charts.donut) State.charts.donut.destroy();
    const ctx = document.getElementById('chart-donut').getContext('2d');

    const conc = itens.filter(x => x.status === 'conciliado').length;
    const pend = itens.filter(x => x.status === 'pendente').length;
    const amb  = itens.filter(x => x.status === 'ambiguo').length;
    const ign  = itens.filter(x => ['ignorado', 'justificado', 'analise'].includes(x.status)).length;

    const total = conc + pend + amb + ign;
    const pct = total ? Math.round(conc / total * 100) : 0;

    document.getElementById('donut-pct').textContent = pct + '%';

    State.charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Conciliados', 'Pendentes', 'Ambíguos', 'Justif./Ignor./Análise'],
        datasets: [{
          data: [conc, pend, amb, ign],
          backgroundColor: [COLORS.success, COLORS.warningL, COLORS.warning, COLORS.muted],
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed} (${total ? Math.round(ctx.parsed/total*100) : 0}%)`
            }
          }
        }
      }
    });
  }

  // ------------------------------------------------------------
  // BARRAS HORIZONTAIS · % por conta
  // ------------------------------------------------------------
  function renderPorConta(itens) {
    if (State.charts.porConta) State.charts.porConta.destroy();
    const ctx = document.getElementById('chart-por-conta').getContext('2d');

    // Agrupa por conta
    const porConta = {};
    State.contas.forEach(c => { porConta[c.id] = { apelido: c.apelido, conc: 0, total: 0 }; });
    itens.forEach(x => {
      if (!porConta[x.conta]) return;
      porConta[x.conta].total++;
      if (x.status === 'conciliado') porConta[x.conta].conc++;
    });

    const entries = Object.values(porConta).filter(c => c.total > 0);
    const labels = entries.map(c => c.apelido);
    const pcts = entries.map(c => c.total ? +(c.conc / c.total * 100).toFixed(1) : 0);
    const counts = entries.map(c => `${c.conc}/${c.total}`);

    State.charts.porConta = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '% Conciliado',
          data: pcts,
          backgroundColor: pcts.map(p => p >= 80 ? COLORS.success : p >= 50 ? COLORS.warningL : COLORS.danger),
          borderRadius: 4,
          barThickness: 22
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: { color: '#e5e7eb' },
            ticks: { callback: v => v + '%', font: { size: 10 } }
          },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.x}% conciliado (${counts[ctx.dataIndex]})`
            }
          }
        }
      }
    });
  }

  // ------------------------------------------------------------
  // LINHA · Evolução mensal (últimos 12 meses)
  // ------------------------------------------------------------
  function renderEvolucao() {
    if (State.charts.evolucao) State.charts.evolucao.destroy();
    const ctx = document.getElementById('chart-evolucao').getContext('2d');

    const hist = State.historico;
    const labels = hist.map(h => {
      const [y, m] = h.mes.split('-');
      const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
    });

    const pcts = hist.map(h => {
      const total = h.conciliados_qtd + h.pendentes_qtd;
      return total ? +(h.conciliados_qtd / total * 100).toFixed(1) : 0;
    });

    const conc = hist.map(h => h.conciliados_qtd);
    const pend = hist.map(h => h.pendentes_qtd);

    State.charts.evolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Conciliados',
            data: conc,
            borderColor: COLORS.success,
            backgroundColor: COLORS.success + '20',
            tension: 0.3,
            fill: true,
            yAxisID: 'y',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Pendentes',
            data: pend,
            borderColor: COLORS.warning,
            backgroundColor: COLORS.warning + '15',
            tension: 0.3,
            fill: true,
            yAxisID: 'y',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: '% Conciliação',
            data: pcts,
            borderColor: COLORS.primary,
            backgroundColor: 'transparent',
            tension: 0.3,
            borderDash: [4, 4],
            yAxisID: 'y1',
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Lançamentos', font: { size: 11 } },
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 10 } }
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            max: 100,
            title: { display: true, text: '% conciliação', font: { size: 11 } },
            grid: { display: false },
            ticks: { callback: v => v + '%', font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y;
                if (ctx.dataset.label === '% Conciliação') return `% Conciliação: ${v}%`;
                return `${ctx.dataset.label}: ${v}`;
              }
            }
          }
        }
      }
    });
  }

  // ------------------------------------------------------------
  // WIRING
  // ------------------------------------------------------------
  function wire() {
    ['dash-conta', 'dash-ini', 'dash-fim'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderAll);
    });

    document.getElementById('btn-dash-limpar').addEventListener('click', () => {
      document.getElementById('dash-conta').value = 'all';
      document.getElementById('dash-ini').value = '2026-05-01';
      document.getElementById('dash-fim').value = '2026-05-31';
      renderAll();
    });

    // Quick ranges
    document.querySelectorAll('[data-range]').forEach(b => {
      b.addEventListener('click', () => {
        const range = b.dataset.range;
        const hoje = new Date('2026-05-12'); // referência fixa em DEV (Brasília)
        const fim = new Date(hoje);
        let ini = new Date(hoje);
        if (range === 'mes-atual') {
          ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        } else if (range === 'mes-anterior') {
          ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
          fim.setFullYear(hoje.getFullYear()); fim.setMonth(hoje.getMonth(), 0);
        } else if (range === '30d') {
          ini.setDate(ini.getDate() - 30);
        } else if (range === '90d') {
          ini.setDate(ini.getDate() - 90);
        }
        document.getElementById('dash-ini').value = ini.toISOString().slice(0, 10);
        document.getElementById('dash-fim').value = fim.toISOString().slice(0, 10);
        renderAll();
      });
    });
  }

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    if (!R2A.requireAuth()) return;
    R2A.renderShell({ modulo: 'conciliador', item: 'dashboard' });
    R2A.renderFooter();
    R2A.data.init();
    wire();
    await carregar();
    renderAll();
  });

})();
