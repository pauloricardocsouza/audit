// ============================================================
// Módulo Análise de Contratos · upload.js (Fase 2)
// Wizard: upload PDF -> extração de texto -> form de revisão -> salvar
// PDF.js carregado via <script type="module"> no HTML
// ============================================================

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';

// Aguarda shared.js + auth
if (!R2A.requireAuth()) {
  // já redirecionou
} else {
  R2A.renderShell({ modulo: 'contratos', item: 'upload' });
  R2A.renderFooter();
  R2A.data.init();

  // ----------------------------------------------------------
  // ESTADO DO WIZARD
  // ----------------------------------------------------------
  const state = {
    arquivo: null,
    textoExtraido: '',
    paginas: 0,
    requerOcr: false
  };

  // ----------------------------------------------------------
  // NAVEGAÇÃO ENTRE PASSOS
  // ----------------------------------------------------------
  function irPara(n) {
    [1, 2, 3].forEach(i => {
      document.getElementById('panel-' + i).classList.toggle('active', i === n);
      const step = document.getElementById('step-' + i);
      step.classList.toggle('active', i === n);
      step.classList.toggle('done', i < n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ----------------------------------------------------------
  // PASSO 1 · UPLOAD E EXTRAÇÃO
  // ----------------------------------------------------------
  const dz = document.getElementById('dropzone');
  const fi = document.getElementById('file-input');

  ['dragenter', 'dragover'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); })
  );
  dz.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  dz.addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => {
    if (fi.files[0]) handleFile(fi.files[0]);
  });

  async function handleFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      R2A.toast('Arquivo precisa ser PDF', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      R2A.toast('PDF maior que 25 MB · reduza ou divida', 'warning');
      return;
    }

    state.arquivo = file;
    R2A.toast('Extraindo texto do PDF…', 'info', 2500);

    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      state.paginas = pdf.numPages;

      let texto = '';
      const maxPag = Math.min(pdf.numPages, 30); // limite de segurança
      for (let i = 1; i <= maxPag; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        const linha = tc.items.map(it => ('str' in it) ? it.str : '').join(' ');
        texto += `\n=== Página ${i} ===\n${linha}\n`;
      }

      state.textoExtraido = texto.trim();

      // Heurística requer_ocr: arquivo > 1 MB e texto < 100 chars
      state.requerOcr = file.size > 1024 * 1024 && state.textoExtraido.length < 100;

      renderResumo();
      irPara(2);
    } catch (e) {
      console.error(e);
      R2A.toast('Falha ao ler o PDF: ' + (e.message || 'erro desconhecido'), 'error', 6000);
    }
  }

  function renderResumo() {
    const f = state.arquivo;
    const tamMB = (f.size / 1024 / 1024).toFixed(2);
    const chars = state.textoExtraido.length;

    document.getElementById('upload-summary').innerHTML = `
      <div class="item">
        <div class="lbl">Arquivo</div>
        <div class="val">${f.name}</div>
      </div>
      <div class="item">
        <div class="lbl">Tamanho</div>
        <div class="val">${tamMB} MB</div>
      </div>
      <div class="item">
        <div class="lbl">Páginas lidas</div>
        <div class="val">${state.paginas}</div>
      </div>
      <div class="item">
        <div class="lbl">Texto extraído</div>
        <div class="val">${chars.toLocaleString('pt-BR')} chars</div>
      </div>
    `;

    document.getElementById('extract-meta').textContent =
      `${state.paginas} página(s) · ${chars.toLocaleString('pt-BR')} caracteres`;

    const flagsEl = document.getElementById('extract-flags');
    flagsEl.innerHTML = state.requerOcr
      ? '<span class="tag dnd">requer OCR · Fase 5</span>'
      : '<span class="tag grn">texto extraível</span>';

    document.getElementById('pdf-preview').textContent =
      chars > 0 ? state.textoExtraido : '(nenhum texto extraível · PDF provavelmente escaneado)';
  }

  // ----------------------------------------------------------
  // BOTÕES DE NAVEGAÇÃO
  // ----------------------------------------------------------
  document.getElementById('btn-voltar-1').addEventListener('click', () => {
    state.arquivo = null;
    state.textoExtraido = '';
    irPara(1);
  });

  document.getElementById('btn-ir-3').addEventListener('click', () => {
    if (state.requerOcr) {
      R2A.toast('PDF parece escaneado. Preencha os campos manualmente.', 'warning', 5000);
    }
    irPara(3);
  });

  document.getElementById('btn-voltar-2').addEventListener('click', () => irPara(2));

  // ----------------------------------------------------------
  // GERAR CRONOGRAMA PRICE SIMPLES (preenche textarea a partir dos campos)
  // ----------------------------------------------------------
  document.getElementById('btn-gerar-cronograma').addEventListener('click', () => {
    const principal = parseFloat(document.getElementById('f-principal').value) || 0;
    const prazo = parseInt(document.getElementById('f-prazo').value) || 0;
    const carencia = parseInt(document.getElementById('f-carencia').value) || 0;
    const dataIni = document.getElementById('f-1parcela').value;
    const taxa = parseFloat(document.getElementById('f-taxa-am').value) || 0;

    if (!principal || !prazo || !dataIni || !taxa) {
      R2A.toast('Preencha principal, prazo, 1ª parcela e spread a.m. antes', 'warning');
      return;
    }

    // Usa R2A.amortizacao (Fase 3)
    const cronograma = R2A.amortizacao.gerarCronograma({
      sistema: 'price', principal, taxaMensal: taxa, prazo, carencia, dataInicio: dataIni
    });
    const linhas = cronograma.map(p =>
      `${p.vencimento};${p.tipo === 'carencia' ? '0' : p.valor.toFixed(2)};${p.tipo}`
    );

    document.getElementById('f-cronograma').value = linhas.join('\n');
    R2A.toast('Cronograma Price gerado · revise antes de salvar', 'success');
  });

  // ----------------------------------------------------------
  // SALVAR CONTRATO
  // ----------------------------------------------------------
  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const v = id => document.getElementById(id).value.trim();
    const vN = id => parseFloat(document.getElementById(id).value) || null;
    const vI = id => parseInt(document.getElementById(id).value) || null;

    const obrigatorios = [
      ['f-banco', 'Banco'],
      ['f-numero', 'Número do contrato'],
      ['f-tomador-nome', 'Razão social do tomador'],
      ['f-principal', 'Principal'],
      ['f-emissao', 'Data de emissão'],
      ['f-1parcela', 'Data da 1ª parcela'],
      ['f-prazo', 'Prazo']
    ];
    for (const [id, label] of obrigatorios) {
      if (!v(id)) {
        R2A.toast(`Campo obrigatório: ${label}`, 'error', 4000);
        document.getElementById(id).focus();
        return;
      }
    }

    // Compor objeto seguindo schema v2
    const principal = vN('f-principal');
    const iof = vN('f-iof') || 0;
    const tarifas = vN('f-tarifas') || 0;
    const seguros = vN('f-seguros') || 0;
    const liquido = vN('f-liquido') || (principal - iof - tarifas - seguros);

    // Garantias: parse linha a linha (tipo:descricao:percentual)
    const garantias = (document.getElementById('f-garantias').value || '')
      .split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      .map(l => {
        const [tipo, descricao, percentual] = l.split(':').map(p => (p || '').trim());
        return {
          tipo: tipo || 'outros',
          descricao: descricao || '',
          percentual: percentual ? parseFloat(percentual) : null,
          instrumento_relacionado_id: null
        };
      });

    // Cronograma: parse CSV (data;valor;tipo)
    const cronograma = (document.getElementById('f-cronograma').value || '')
      .split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      .map((l, i) => {
        const [data, valor, tipo] = l.split(';').map(p => (p || '').trim());
        return {
          n: i + 1,
          vencimento: data,
          valor: parseFloat(valor) || 0,
          tipo: tipo || 'amortizacao'
        };
      });

    // Composição do principal (heurística simples baseada em diff principal vs líquido)
    const composicao = [];
    if (iof > 0 && Math.abs((principal - iof) - liquido) < 100) composicao.push('iof');
    else if (iof > 0 && liquido < principal - 100) composicao.push('iof');
    if (tarifas > 0) composicao.push('tarifas');
    if (seguros > 0) composicao.push('seguros');

    const contrato = {
      banco: v('f-banco'),
      banco_codigo_bacen: v('f-banco-codigo') || null,
      produto: v('f-produto'),
      numero_contrato: v('f-numero'),
      tomador: {
        razao_social: v('f-tomador-nome'),
        cnpj: v('f-tomador-cnpj') || null
      },
      avalistas: [],
      valores: {
        principal,
        iof,
        tarifas,
        seguros,
        outros_custos: 0,
        liquido_liberado: liquido,
        composicao_principal_inclui: composicao
      },
      datas: {
        emissao: v('f-emissao'),
        limite_desembolso: null,
        primeira_parcela: v('f-1parcela'),
        ultima_parcela: cronograma.length ? cronograma[cronograma.length - 1].vencimento : null,
        dia_vencimento_padrao: vI('f-dia-venc')
      },
      estrutura: {
        prazo_meses: vI('f-prazo'),
        qtd_parcelas: cronograma.length || vI('f-prazo'),
        carencia: {
          meses: vI('f-carencia') || 0,
          fonte: v('f-carencia-fonte') || 'nenhuma'
        },
        sistema_amortizacao_declarado: v('f-sist-declarado') || 'nao_informado',
        sistema_amortizacao_detectado: v('f-sist-detectado') || 'price'
      },
      taxa_juros: {
        regime: v('f-taxa-regime') || 'pre_fixado',
        componente_fixo_am: vN('f-taxa-am'),
        componente_fixo_aa: vN('f-taxa-aa'),
        indexador: v('f-taxa-indexador') || null,
        indexador_percentual: vN('f-taxa-indexador-pct'),
        cenarios_alternativos: [],
        cet_aa: vN('f-taxa-cet')
      },
      conta_debito: {
        banco: v('f-cc-banco') || null,
        agencia: v('f-cc-ag') || null,
        numero: v('f-cc-num') || null,
        tipo: 'corrente'
      },
      garantias,
      cronograma_parcelas: cronograma,
      instrumentos_relacionados: [],
      qualidade_extracao: {
        pdf_escaneado: state.requerOcr,
        ocr_aplicado: false,
        cronograma_extraido: cronograma.length > 0,
        checkbox_amortizacao_marcado: v('f-sist-declarado') !== 'nao_informado',
        cet_informado: !!vN('f-taxa-cet'),
        campos_faltantes: []
      },
      pdf_original: state.arquivo ? {
        nome: state.arquivo.name,
        url: null,                                    // Storage entra na Fase 5
        tamanho_kb: Math.round(state.arquivo.size / 1024),
        upload_em: new Date().toISOString()
      } : null,
      estado: 'ativo',
      contrato_origem_id: null
    };

    try {
      const salvo = await R2A.contratos.add(contrato);
      R2A.auditar('contrato.criar', { id: salvo.id, banco: salvo.banco, numero: salvo.numero_contrato });
      R2A.toast('Contrato salvo · abrindo detalhe…', 'success', 1800);
      setTimeout(() => {
        window.location.href = `contrato.html?id=${salvo.id}`;
      }, 800);
    } catch (e) {
      console.error(e);
      R2A.toast('Erro ao salvar: ' + (e.message || 'desconhecido'), 'error', 6000);
    }
  });
}
