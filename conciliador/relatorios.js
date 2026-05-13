// ============================================================
// R2 Conciliador · relatorios.js
// Relatório de Conciliação e Relatório de Pendências
// Pré-visualização em tela · exportação PDF e Excel
// ============================================================

(function () {
  'use strict';

  const CFG = window.R2A_CONFIG;
  const M = window.R2A_MOCK;
  const C = CFG.COLLECTIONS;

  const State = {
    tipo: 'conciliacao',  // 'conciliacao' | 'pendencias'
    contas: [],
    categorias: []
  };

  // ------------------------------------------------------------
  // CARGA
  // ------------------------------------------------------------
  async function carregar() {
    State.contas = await R2A.data.list(C.CONTAS);
    State.categorias = await R2A.data.list(C.CATEGORIAS);
    montarFiltros();
  }

  function montarFiltros() {
    const sel = document.getElementById('rel-conta');
    sel.innerHTML = `<option value="all">Todas (${State.contas.length})</option>` +
      State.contas.map(c => `<option value="${c.id}">${c.apelido}</option>`).join('');
  }

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  function diasUteis(ini, fim) {
    if (!ini || !fim) return 0;
    const d1 = new Date(ini + 'T00:00');
    const d2 = new Date(fim + 'T00:00');
    if (d2 < d1) return 0;
    let n = 0;
    for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
      const w = d.getDay();
      if (w !== 0 && w !== 6) n++;
    }
    return n;
  }

  // ------------------------------------------------------------
  // DATA SOURCE - constrói linhas do relatório a partir do mock
  // Em produção: substituir por query no Firestore
  // ------------------------------------------------------------
  function getDadosRelatorio() {
    const filtros = getFiltros();
    const linhas = [];

    // Coleta de todos os lançamentos do banco (a fonte principal de cada relatório)
    M.BANCO.forEach(b => {
      // Filtro de conta
      if (filtros.conta !== 'all' && b.conta !== filtros.conta) return;
      // Filtro de período
      if (filtros.ini && b.data < filtros.ini) return;
      if (filtros.fim && b.data > filtros.fim) return;

      // Status efetivo (em DEV, considera apenas o status registrado no item)
      const status = b.status || 'pendente';

      // Filtro de status
      if (filtros.status !== 'all' && status !== filtros.status) return;

      // Para o relatório de pendências, exclui já conciliados
      if (State.tipo === 'pendencias' && status === 'conciliado') return;

      const conta = State.contas.find(c => c.id === b.conta);
      linhas.push({
        data: b.data,
        conta_apelido: conta ? conta.apelido : b.conta,
        conta_id: b.conta,
        descricao: b.hist,
        valor: b.valor,
        tipo: b.tipo,         // C ou D
        status: status,
        origem: 'banco'
      });
    });

    return linhas.sort((a, b) => a.data.localeCompare(b.data) || a.conta_apelido.localeCompare(b.conta_apelido));
  }

  function getResumo(linhas) {
    const sum = (arr) => arr.reduce((acc, x) => acc + Math.abs(x.valor), 0);
    const total = linhas.length;
    const conc = linhas.filter(x => x.status === 'conciliado');
    const pend = linhas.filter(x => x.status === 'pendente');
    const out = linhas.filter(x => !['conciliado', 'pendente'].includes(x.status));
    return {
      total,
      total_valor: sum(linhas),
      conc_qtd: conc.length,
      conc_valor: sum(conc),
      pend_qtd: pend.length,
      pend_valor: sum(pend),
      outros_qtd: out.length,
      outros_valor: sum(out)
    };
  }

  // ------------------------------------------------------------
  // FILTROS
  // ------------------------------------------------------------
  function getFiltros() {
    return {
      conta: document.getElementById('rel-conta').value,
      ini: document.getElementById('rel-ini').value,
      fim: document.getElementById('rel-fim').value,
      status: document.getElementById('rel-status').value
    };
  }

  // ------------------------------------------------------------
  // RENDER PREVIEW
  // ------------------------------------------------------------
  function renderPreview() {
    const linhas = getDadosRelatorio();
    const resumo = getResumo(linhas);
    const filtros = getFiltros();
    const u = R2A.session.user();
    const agora = new Date();

    // Cabeçalho
    const titulo = State.tipo === 'conciliacao' ? 'Relatório de Conciliação' : 'Relatório de Pendências';
    document.getElementById('rel-titulo').textContent = titulo;

    const periodo = `${R2A.fmt.data(filtros.ini)} a ${R2A.fmt.data(filtros.fim)}`;
    const contaLabel = filtros.conta === 'all'
      ? 'Todas as contas'
      : (State.contas.find(c => c.id === filtros.conta)?.apelido || '—');
    document.getElementById('rel-meta-periodo').textContent = periodo;
    document.getElementById('rel-meta-conta').textContent = contaLabel;
    document.getElementById('rel-meta-gerado').textContent =
      `Gerado em ${agora.toLocaleString('pt-BR')} por ${u.nome}`;

    // Resumo
    document.getElementById('rel-r-total-qtd').textContent = resumo.total;
    document.getElementById('rel-r-total-val').textContent = R2A.fmt.moeda(resumo.total_valor, { sinal: false });
    document.getElementById('rel-r-conc-qtd').textContent = resumo.conc_qtd;
    document.getElementById('rel-r-conc-val').textContent = R2A.fmt.moeda(resumo.conc_valor, { sinal: false });
    document.getElementById('rel-r-pend-qtd').textContent = resumo.pend_qtd;
    document.getElementById('rel-r-pend-val').textContent = R2A.fmt.moeda(resumo.pend_valor, { sinal: false });

    // Dias úteis do período
    document.getElementById('rel-r-periodo-dias').textContent = diasUteis(filtros.ini, filtros.fim);

    // Contas únicas no relatório
    const contasUnicas = new Set(linhas.map(l => l.conta_id)).size;
    document.getElementById('rel-r-contas').textContent = contasUnicas;

    // Tabela
    const tbody = document.getElementById('rel-tbody');
    if (linhas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: var(--muted);">Nenhum lançamento no filtro</td></tr>`;
      document.getElementById('rel-info').textContent = '0 linha(s)';
      return;
    }

    tbody.innerHTML = linhas.map(l => {
      const valCls = l.tipo === 'C' ? 'credito' : 'debito';
      return `
        <tr>
          <td>${R2A.fmt.data(l.data)}</td>
          <td>${l.conta_apelido}</td>
          <td>${l.descricao}</td>
          <td class="num ${valCls}">${R2A.fmt.moeda(l.valor)}</td>
          <td class="center">${l.tipo === 'C' ? 'Crédito' : 'Débito'}</td>
          <td class="center"><span class="pill pill-dot ${l.status}">${l.status}</span></td>
        </tr>
      `;
    }).join('');

    document.getElementById('rel-info').textContent = `${linhas.length} linha(s)`;
  }

  // ------------------------------------------------------------
  // EXPORTAÇÃO PDF (jsPDF + autoTable)
  // ------------------------------------------------------------
  function exportarPDF() {
    if (typeof window.jspdf === 'undefined') {
      R2A.toast('Biblioteca PDF ainda carregando...', 'warning');
      return;
    }
    const { jsPDF } = window.jspdf;
    const linhas = getDadosRelatorio();
    const resumo = getResumo(linhas);
    const filtros = getFiltros();
    const u = R2A.session.user();
    const agora = new Date();
    const titulo = State.tipo === 'conciliacao' ? 'Relatório de Conciliação' : 'Relatório de Pendências';
    const periodo = `${R2A.fmt.data(filtros.ini)} a ${R2A.fmt.data(filtros.fim)}`;
    const contaLabel = filtros.conta === 'all'
      ? 'Todas as contas'
      : (State.contas.find(c => c.id === filtros.conta)?.apelido || '—');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // CABEÇALHO INSTITUCIONAL
    doc.setFillColor(30, 58, 138); // primary
    doc.rect(0, 0, pageW, 28, 'F');

    // Logo R2 (caixa colorida)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 7, 14, 14, 2, 2, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('R²', 17, 16, { align: 'center' });

    // Brand
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('R2 SOLUÇÕES EMPRESARIAIS', 28, 12);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('R2 Conciliador', 28, 18);

    // Meta lado direito
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${agora.toLocaleString('pt-BR')}`, pageW - 10, 11, { align: 'right' });
    doc.text(`Por: ${u.nome}`, pageW - 10, 16, { align: 'right' });
    doc.text(`v${CFG.APP_VERSION}`, pageW - 10, 21, { align: 'right' });

    // TÍTULO DO RELATÓRIO
    doc.setTextColor(26, 35, 50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 10, 40);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 85, 104);
    doc.text(`Período: ${periodo}  »  Conta: ${contaLabel}`, 10, 46);

    // RESUMO
    let y = 54;
    doc.setFillColor(245, 246, 248);
    doc.roundedRect(10, y, pageW - 20, 16, 2, 2, 'F');
    doc.setTextColor(74, 85, 104);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    const blocos = [
      { label: 'TOTAL DE LANÇAMENTOS', val: resumo.total, sub: R2A.fmt.moeda(resumo.total_valor, { sinal: false }) },
      { label: 'CONCILIADOS', val: resumo.conc_qtd, sub: R2A.fmt.moeda(resumo.conc_valor, { sinal: false }) },
      { label: 'PENDENTES', val: resumo.pend_qtd, sub: R2A.fmt.moeda(resumo.pend_valor, { sinal: false }) },
      { label: 'OUTROS STATUS', val: resumo.outros_qtd, sub: R2A.fmt.moeda(resumo.outros_valor, { sinal: false }) }
    ];

    const colW = (pageW - 20) / blocos.length;
    blocos.forEach((b, i) => {
      const x = 14 + i * colW;
      doc.setFontSize(7);
      doc.setTextColor(138, 148, 166);
      doc.setFont('helvetica', 'bold');
      doc.text(b.label, x, y + 5);
      doc.setFontSize(11);
      doc.setTextColor(26, 35, 50);
      doc.text(String(b.val), x, y + 11);
      doc.setFontSize(8);
      doc.setTextColor(74, 85, 104);
      doc.setFont('helvetica', 'normal');
      doc.text(b.sub, x, y + 14.5);
    });

    y += 22;

    // TABELA
    const tableHead = [['Data', 'Conta', 'Descrição', 'Valor', 'Tipo', 'Status']];
    const tableBody = linhas.map(l => [
      R2A.fmt.data(l.data),
      l.conta_apelido,
      l.descricao,
      R2A.fmt.moeda(l.valor),
      l.tipo === 'C' ? 'Crédito' : 'Débito',
      l.status
    ]);

    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: y,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 26, halign: 'center' }
      },
      didParseCell: function (data) {
        // Colorir status na coluna 5
        if (data.section === 'body' && data.column.index === 5) {
          const s = String(data.cell.raw).toLowerCase();
          const cores = {
            conciliado: [21, 128, 61],
            pendente: [180, 83, 9],
            ambiguo: [180, 83, 9],
            ignorado: [107, 114, 128],
            justificado: [29, 78, 216],
            analise: [109, 40, 217]
          };
          if (cores[s]) data.cell.styles.textColor = cores[s];
          data.cell.styles.fontStyle = 'bold';
        }
        // Colorir valor (crédito/débito)
        if (data.section === 'body' && data.column.index === 3) {
          const tipo = data.row.raw[4];
          if (tipo === 'Crédito') data.cell.styles.textColor = [21, 128, 61];
          else data.cell.styles.textColor = [185, 28, 28];
        }
      },
      didDrawPage: function (data) {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        const page = data.pageNumber;
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(138, 148, 166);
        doc.setFont('helvetica', 'normal');
        doc.text(`DESENVOLVIDO POR R2 SOLUÇÕES EMPRESARIAIS · v${CFG.APP_VERSION}`, 10, ph - 5);
        doc.text(`Página ${page} de ${pageCount}`, pageW - 10, ph - 5, { align: 'right' });
      },
      margin: { left: 10, right: 10, bottom: 12 }
    });

    const nomeArquivo = `${State.tipo === 'conciliacao' ? 'conciliacao' : 'pendencias'}_${filtros.ini}_${filtros.fim}.pdf`;
    doc.save(nomeArquivo);

    R2A.auditar('relatorio_pdf', { tipo: State.tipo, filtros, qtd: linhas.length });
    R2A.toast('PDF gerado', 'success');
  }

  // ------------------------------------------------------------
  // EXPORTAÇÃO EXCEL (SheetJS)
  // ------------------------------------------------------------
  function exportarExcel() {
    if (typeof window.XLSX === 'undefined') {
      R2A.toast('Biblioteca Excel ainda carregando...', 'warning');
      return;
    }
    const linhas = getDadosRelatorio();
    const resumo = getResumo(linhas);
    const filtros = getFiltros();
    const u = R2A.session.user();
    const agora = new Date();
    const titulo = State.tipo === 'conciliacao' ? 'Relatório de Conciliação' : 'Relatório de Pendências';
    const periodo = `${R2A.fmt.data(filtros.ini)} a ${R2A.fmt.data(filtros.fim)}`;
    const contaLabel = filtros.conta === 'all'
      ? 'Todas as contas'
      : (State.contas.find(c => c.id === filtros.conta)?.apelido || '—');

    const wb = XLSX.utils.book_new();

    // === Aba 1: Resumo ===
    const resumoData = [
      ['R2 Conciliador'],
      [titulo],
      [],
      ['Período', periodo],
      ['Conta', contaLabel],
      ['Gerado em', agora.toLocaleString('pt-BR')],
      ['Gerado por', u.nome],
      ['Versão', `v${CFG.APP_VERSION}`],
      [],
      ['Resumo do período'],
      ['Total de lançamentos', resumo.total],
      ['Valor total', resumo.total_valor],
      ['Conciliados (qtd)', resumo.conc_qtd],
      ['Conciliados (valor)', resumo.conc_valor],
      ['Pendentes (qtd)', resumo.pend_qtd],
      ['Pendentes (valor)', resumo.pend_valor],
      ['Outros status (qtd)', resumo.outros_qtd],
      ['Outros status (valor)', resumo.outros_valor]
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 26 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // === Aba 2: Detalhamento ===
    const detData = [
      ['Data', 'Conta', 'Descrição', 'Valor', 'Tipo', 'Status']
    ];
    linhas.forEach(l => {
      detData.push([
        l.data,
        l.conta_apelido,
        l.descricao,
        l.valor,
        l.tipo === 'C' ? 'Crédito' : 'Débito',
        l.status
      ]);
    });
    const wsDet = XLSX.utils.aoa_to_sheet(detData);
    wsDet['!cols'] = [
      { wch: 12 }, { wch: 26 }, { wch: 42 }, { wch: 14 }, { wch: 10 }, { wch: 14 }
    ];
    // Formato monetário na coluna D
    for (let i = 2; i <= linhas.length + 1; i++) {
      const cell = wsDet[`D${i}`];
      if (cell) cell.z = 'R$ #,##0.00;-R$ #,##0.00';
    }
    XLSX.utils.book_append_sheet(wb, wsDet, 'Detalhamento');

    const nomeArquivo = `${State.tipo === 'conciliacao' ? 'conciliacao' : 'pendencias'}_${filtros.ini}_${filtros.fim}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);

    R2A.auditar('relatorio_excel', { tipo: State.tipo, filtros, qtd: linhas.length });
    R2A.toast('Excel gerado', 'success');
  }

  // ------------------------------------------------------------
  // WIRING
  // ------------------------------------------------------------
  function wire() {
    // Seletor de tipo
    document.querySelectorAll('.r2c-rel-type').forEach(el => {
      el.addEventListener('click', () => {
        State.tipo = el.dataset.tipo;
        document.querySelectorAll('.r2c-rel-type').forEach(x => x.classList.toggle('active', x === el));
        // Para o relatório de Pendências, forçar status != conciliado
        if (State.tipo === 'pendencias') {
          document.getElementById('rel-status').value = 'all';
        }
        renderPreview();
      });
    });

    // Filtros
    ['rel-conta', 'rel-ini', 'rel-fim', 'rel-status'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderPreview);
    });

    // Exportações
    document.getElementById('btn-pdf').addEventListener('click', exportarPDF);
    document.getElementById('btn-excel').addEventListener('click', exportarExcel);

    // Quick ranges
    document.querySelectorAll('[data-range]').forEach(b => {
      b.addEventListener('click', () => {
        const range = b.dataset.range;
        const hoje = new Date('2026-05-12'); // referência em DEV
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
        document.getElementById('rel-ini').value = ini.toISOString().slice(0, 10);
        document.getElementById('rel-fim').value = fim.toISOString().slice(0, 10);
        renderPreview();
      });
    });
  }

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    if (!R2A.requireAuth()) return;
    R2A.renderShell({ modulo: 'conciliador', item: 'relatorios' });
    R2A.renderFooter();
    R2A.data.init();
    wire();
    await carregar();
    renderPreview();
  });

})();
