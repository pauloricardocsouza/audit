// ============================================================
// R2 Conciliador · mock-data.js
// Dados de exemplo para modo DEV. Em produção, virão do Firestore.
// ============================================================

window.R2A_MOCK = {

  CONTAS: [
    { id: 'bb-001',       banco: 'Banco do Brasil', agencia: '0001-2', numero: '12345-6',   apelido: 'BB · Movimento',          tipo: 'corrente' },
    { id: 'bb-001-g',     banco: 'Banco do Brasil', agencia: '0001-2', numero: '12345-6/G', apelido: 'BB · Garantida',          tipo: 'garantida' },
    { id: 'itau-001',     banco: 'Itaú',            agencia: '4520',   numero: '98765-4',   apelido: 'Itaú · Operacional',      tipo: 'corrente' },
    { id: 'bradesco-001', banco: 'Bradesco',        agencia: '1234',   numero: '55555-5',   apelido: 'Bradesco · Folha',        tipo: 'corrente' },
    { id: 'sofisa-001',   banco: 'Banco Sofisa',    agencia: '00132',  numero: '000000915-5', apelido: 'Sofisa · Capital Giro', tipo: 'corrente' }
  ],

  CATEGORIAS: [
    { id: 'cat-1', nome: 'Tarifa bancária', tipo: 'despesa' },
    { id: 'cat-2', nome: 'Diferença de taxa', tipo: 'ajuste' },
    { id: 'cat-3', nome: 'Estorno', tipo: 'ajuste' },
    { id: 'cat-4', nome: 'Duplicidade', tipo: 'ajuste' },
    { id: 'cat-5', nome: 'A investigar', tipo: 'pendente' },
    { id: 'cat-6', nome: 'Folha de pagamento', tipo: 'despesa' },
    { id: 'cat-7', nome: 'Impostos', tipo: 'despesa' }
  ],

  BANCO: [
    { id: 'b1',  conta: 'bb-001',       data: '2026-05-02', hist: 'TED Recebida · ATACADO XYZ LTDA',     valor: 12500.00, tipo: 'C', status: 'pendente' },
    { id: 'b2',  conta: 'bb-001',       data: '2026-05-03', hist: 'Boleto Pago · FORNECEDOR ABC',        valor: -3450.00, tipo: 'D', status: 'pendente' },
    { id: 'b3',  conta: 'bb-001',       data: '2026-05-05', hist: 'TED Enviada · LOTE FORNECEDORES',     valor: -8750.00, tipo: 'D', status: 'pendente' },
    { id: 'b4',  conta: 'itau-001',     data: '2026-05-06', hist: 'PIX Recebido · CLIENTE',              valor: 1500.00,  tipo: 'C', status: 'pendente' },
    { id: 'b5',  conta: 'itau-001',     data: '2026-05-07', hist: 'Débito automático · ENEL',            valor: -890.50,  tipo: 'D', status: 'pendente' },
    { id: 'b6',  conta: 'itau-001',     data: '2026-05-08', hist: 'Crédito · DEVOLUÇÃO ICMS',            valor: 4320.75,  tipo: 'C', status: 'pendente' },
    { id: 'b7',  conta: 'bradesco-001', data: '2026-05-09', hist: 'TED Enviada · FOLHA',                 valor: -15600.00, tipo: 'D', status: 'pendente' },
    { id: 'b8',  conta: 'bradesco-001', data: '2026-05-10', hist: 'Boleto Recebido · CLIENTE PREMIUM',   valor: 22000.00, tipo: 'C', status: 'pendente' },
    { id: 'b9',  conta: 'bradesco-001', data: '2026-05-12', hist: 'Tarifa · TED',                        valor: -8.50,    tipo: 'D', status: 'pendente' },
    { id: 'b10', conta: 'bb-001',       data: '2026-05-13', hist: 'IOF · Operação 4423',                 valor: -42.30,   tipo: 'D', status: 'pendente' },
    { id: 'b11', conta: 'bb-001',       data: '2026-05-15', hist: 'PIX Enviado · ALUGUEL MAI',           valor: -6500.00, tipo: 'D', status: 'pendente' },
    { id: 'b12', conta: 'itau-001',     data: '2026-05-16', hist: 'TED Recebida · CLIENTE PJ',           valor: 8900.00,  tipo: 'C', status: 'pendente' },

    // Lançamentos casáveis com as primeiras parcelas do contrato Sofisa PII56430-6 (cnt-001)
    { id: 'b-cnt1-p1', conta: 'sofisa-001', data: '2025-12-26', hist: 'Débito automático · CCB Sofisa PII56430-6 parcela 01', valor: -88446.73, tipo: 'D', status: 'pendente' },
    { id: 'b-cnt1-p2', conta: 'sofisa-001', data: '2026-01-26', hist: 'Débito automático · CCB Sofisa PII56430-6 parcela 02', valor: -89057.02, tipo: 'D', status: 'pendente' },
    { id: 'b-cnt1-p3', conta: 'sofisa-001', data: '2026-02-26', hist: 'Débito automático · CCB Sofisa PII56430-6 parcela 03', valor: -89671.51, tipo: 'D', status: 'pendente' },
    // Parcela 04: pago em data próxima (D-1) e valor levemente diferente (para mostrar status 'pago' aprox)
    { id: 'b-cnt1-p4', conta: 'sofisa-001', data: '2026-03-25', hist: 'Débito automático · CCB Sofisa PII56430-6 parcela 04', valor: -90290.21, tipo: 'D', status: 'pendente' },
    // Parcela 05: pago a menor (para mostrar status 'pago_menor')
    { id: 'b-cnt1-p5', conta: 'sofisa-001', data: '2026-04-26', hist: 'Débito automático · CCB Sofisa PII56430-6 parcela 05',  valor: -89500.00, tipo: 'D', status: 'pendente' }
  ],

  SIA: [
    { id: 's1',  conta: 'bb-001',       data: '2026-05-02', desc: 'Recebimento Atacado XYZ - NF 4521', valor: 12500.00, tipo: 'C', status: 'pendente' },
    { id: 's2',  conta: 'bb-001',       data: '2026-05-03', desc: 'Pgto Fornecedor ABC - Boleto 0098', valor: -3450.00, tipo: 'D', status: 'pendente' },

    // três títulos que somam 8.750 (1:N do b3)
    { id: 's3',  conta: 'bb-001',       data: '2026-05-05', desc: 'Pgto Fornecedor X - Boleto 101',    valor: -2500.00, tipo: 'D', status: 'pendente' },
    { id: 's4',  conta: 'bb-001',       data: '2026-05-05', desc: 'Pgto Fornecedor Y - Boleto 102',    valor: -3000.00, tipo: 'D', status: 'pendente' },
    { id: 's5',  conta: 'bb-001',       data: '2026-05-05', desc: 'Pgto Fornecedor Z - Boleto 103',    valor: -3250.00, tipo: 'D', status: 'pendente' },
    // combinação alternativa (também soma 8.750)
    { id: 's6',  conta: 'bb-001',       data: '2026-05-05', desc: 'Pgto Fornecedor W - Boleto 104',    valor: -1750.00, tipo: 'D', status: 'pendente' },
    { id: 's7',  conta: 'bb-001',       data: '2026-05-05', desc: 'Pgto Fornecedor V - Boleto 105',    valor: -7000.00, tipo: 'D', status: 'pendente' },

    // dois candidatos para b4 (ambiguidade na Onda 1)
    { id: 's8',  conta: 'itau-001',     data: '2026-05-06', desc: 'Cliente A - Recebimento parcial',   valor: 1500.00,  tipo: 'C', status: 'pendente' },
    { id: 's9',  conta: 'itau-001',     data: '2026-05-06', desc: 'Cliente B - Adiantamento',          valor: 1500.00,  tipo: 'C', status: 'pendente' },

    { id: 's10', conta: 'itau-001',     data: '2026-05-07', desc: 'Conta de luz - Enel Mai/26',        valor: -890.50,  tipo: 'D', status: 'pendente' },
    { id: 's11', conta: 'itau-001',     data: '2026-05-08', desc: 'Devolução ICMS competência abr',     valor: 4320.75,  tipo: 'C', status: 'pendente' },

    // b7 = 15.600 -> 4 títulos
    { id: 's12', conta: 'bradesco-001', data: '2026-05-09', desc: 'Folha · Salário João',              valor: -4500.00, tipo: 'D', status: 'pendente' },
    { id: 's13', conta: 'bradesco-001', data: '2026-05-09', desc: 'Folha · Salário Maria',             valor: -3800.00, tipo: 'D', status: 'pendente' },
    { id: 's14', conta: 'bradesco-001', data: '2026-05-09', desc: 'Folha · Salário Pedro',             valor: -3500.00, tipo: 'D', status: 'pendente' },
    { id: 's15', conta: 'bradesco-001', data: '2026-05-09', desc: 'Folha · Salário Ana',               valor: -3800.00, tipo: 'D', status: 'pendente' },

    { id: 's16', conta: 'bradesco-001', data: '2026-05-10', desc: 'Cliente Premium - NF 8821',         valor: 22000.00, tipo: 'C', status: 'pendente' },

    { id: 's17', conta: 'bb-001',       data: '2026-05-14', desc: 'Recebimento esperado X',            valor: 5000.00,  tipo: 'C', status: 'pendente' },
    { id: 's18', conta: 'bb-001',       data: '2026-05-14', desc: 'Pgto previsto Y',                   valor: -2000.00, tipo: 'D', status: 'pendente' },

    { id: 's19', conta: 'bb-001',       data: '2026-05-15', desc: 'Aluguel Mai/26 - Imobiliária Z',    valor: -6500.00, tipo: 'D', status: 'pendente' },
    { id: 's20', conta: 'itau-001',     data: '2026-05-16', desc: 'Cliente PJ Beta - NF 4502',         valor: 8900.00,  tipo: 'C', status: 'pendente' },

    { id: 's21', conta: 'itau-001',     data: '2026-05-20', desc: 'Cliente Gamma - prev. receb.',      valor: 3300.00,  tipo: 'C', status: 'pendente' },
    { id: 's22', conta: 'bradesco-001', data: '2026-05-22', desc: 'INSS Mai/26',                       valor: -2150.00, tipo: 'D', status: 'pendente' }
  ],

  // ============================================================
  // CONTRATOS · módulo Análise de Contratos
  // Schemas reais (Sofisa e Safra) anonimizados para DEV
  // Em produção virão da coleção `contratos` no Firestore
  // ============================================================
  CONTRATOS: (function () {
    // Helper para gerar cronograma price-flutuante (parcelas crescentes Sofisa)
    function cronoSofisa() {
      const datas = [
        '2025-12-26','2026-01-26','2026-02-26','2026-03-26','2026-04-26','2026-05-26',
        '2026-06-26','2026-07-26','2026-08-26','2026-09-26','2026-10-26','2026-11-26',
        '2026-12-26','2027-01-26','2027-02-26','2027-03-26','2027-04-26','2027-05-26',
        '2027-06-26','2027-07-26','2027-08-26','2027-09-26','2027-10-26','2027-11-26'
      ];
      const valoresExt = [88446.73, 89057.02, 89671.51];
      const valoresFim = [102186.84, 102891.93, 103601.88];
      const out = [];
      for (let i = 0; i < 24; i++) {
        let v;
        if (i < 3) v = valoresExt[i];
        else if (i >= 21) v = valoresFim[i - 21];
        else v = +(89671.51 + (102186.84 - 89671.51) * ((i - 2) / 19)).toFixed(2);
        out.push({ n: i + 1, vencimento: datas[i], valor: v, tipo: 'amortizacao' });
      }
      return out;
    }
    // Helper para Safra com 6 meses de carência + 30 parcelas Price
    function cronoSafra() {
      const out = [];
      const baseDate = new Date(2026, 2, 9); // 2026-03-09 (mês index 2 = março)
      for (let i = 0; i < 36; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        // ajuste de dia útil (mantém dia 9 ou próximo)
        const vencimento = d.toISOString().slice(0, 10);
        if (i < 6) {
          out.push({ n: i + 1, vencimento, valor: 0, tipo: 'carencia' });
        } else if (i === 35) {
          out.push({ n: i + 1, vencimento, valor: 36686.00, tipo: 'ajuste_final' });
        } else {
          out.push({ n: i + 1, vencimento, valor: 36666.00, tipo: 'amortizacao' });
        }
      }
      return out;
    }

    return [
      {
        id: 'cnt-001',
        banco: 'Banco Sofisa',
        banco_codigo_bacen: '637',
        produto: 'CCB',
        numero_contrato: 'PII56430-6',
        tomador: { razao_social: 'EMPRESA EXEMPLO LTDA', cnpj: '00.000.000/0001-00' },
        avalistas: [{ nome: 'Avalista Pessoa Física', cpf_cnpj: '000.000.000-00' }],
        valores: {
          principal: 2300000.00, iof: 97981.10, tarifas: 15000.00, seguros: 0,
          outros_custos: 0, liquido_liberado: 2187018.90,
          composicao_principal_inclui: ['iof', 'tarifas']
        },
        datas: {
          emissao: '2025-11-26', limite_desembolso: null,
          primeira_parcela: '2025-12-26', ultima_parcela: '2027-11-26',
          dia_vencimento_padrao: 26
        },
        estrutura: {
          prazo_meses: 24, qtd_parcelas: 24,
          carencia: { meses: 0, fonte: 'nenhuma' },
          sistema_amortizacao_declarado: 'price',
          sistema_amortizacao_detectado: 'price_flutuante'
        },
        taxa_juros: {
          regime: 'flutuante_indexado',
          componente_fixo_am: 0.0069, componente_fixo_aa: 0.086015,
          indexador: 'CDI', indexador_percentual: 100,
          cenarios_alternativos: [],
          cet_aa: 0.116175
        },
        conta_debito: { banco: 'Sofisa', agencia: '00132', numero: '000000915-5', tipo: 'corrente' },
        garantias: [
          { tipo: 'aval', descricao: 'Avalista pessoa física', percentual: null },
          { tipo: 'cessao_fiduciaria', descricao: 'Duplicatas eletrônicas', percentual: 70 },
          { tipo: 'fundo_garantidor', descricao: 'FGI PEAC II', percentual: null }
        ],
        cronograma_parcelas: cronoSofisa(),
        instrumentos_relacionados: [
          { tipo: 'cessao_fiduciaria', numero: 'PII56430-6-DUP', ref_pdf: 'duplicatas.pdf' }
        ],
        qualidade_extracao: {
          pdf_escaneado: false, ocr_aplicado: false, cronograma_extraido: true,
          checkbox_amortizacao_marcado: true, cet_informado: true, campos_faltantes: []
        },
        pdf_original: {
          nome: 'PII56430-6_CCB_Sofisa.pdf',
          url: null,
          tamanho_kb: 2287,
          upload_em: '2025-11-26T10:00:00Z'
        },
        estado: 'ativo', contrato_origem_id: null
      },
      {
        id: 'cnt-002',
        banco: 'Banco Safra',
        banco_codigo_bacen: '422',
        produto: 'CCB',
        numero_contrato: '003516147',
        tomador: { razao_social: 'EMPRESA EXEMPLO LTDA', cnpj: '00.000.000/0001-00' },
        avalistas: [{ nome: 'Avalista Pessoa Física', cpf_cnpj: '000.000.000-00' }],
        valores: {
          principal: 1100000.00, iof: 35787.13, tarifas: 6000.00, seguros: 0,
          outros_custos: 0, liquido_liberado: 1058212.87,
          composicao_principal_inclui: ['iof']
        },
        datas: {
          emissao: '2026-02-09', limite_desembolso: null,
          primeira_parcela: '2026-03-09', ultima_parcela: '2029-02-09',
          dia_vencimento_padrao: 9
        },
        estrutura: {
          prazo_meses: 36, qtd_parcelas: 36,
          carencia: { meses: 6, fonte: 'parcelas_zeradas' },
          sistema_amortizacao_declarado: 'price',
          sistema_amortizacao_detectado: 'price'
        },
        taxa_juros: {
          regime: 'flutuante_indexado',
          componente_fixo_am: 0.0055, componente_fixo_aa: 0.068034,
          indexador: 'CDI', indexador_percentual: 100,
          cenarios_alternativos: [
            { descricao: 'Outros meios de pagamento (não débito c/c Safra)', am: 0.00825, aa: 0.103618 }
          ],
          cet_aa: null
        },
        conta_debito: { banco: 'Safra', agencia: '15800', numero: '5838109', tipo: 'corrente' },
        garantias: [
          { tipo: 'aval', descricao: 'Avalista pessoa física', percentual: null },
          { tipo: 'cessao_fiduciaria', descricao: 'Duplicatas', percentual: null }
        ],
        cronograma_parcelas: cronoSafra(),
        instrumentos_relacionados: [],
        qualidade_extracao: {
          pdf_escaneado: false, ocr_aplicado: false, cronograma_extraido: true,
          checkbox_amortizacao_marcado: true, cet_informado: false, campos_faltantes: ['cet_aa']
        },
        pdf_original: {
          nome: '15800_3516147_Middle_Safra.pdf',
          url: null,
          tamanho_kb: 2370,
          upload_em: '2026-02-09T14:30:00Z'
        },
        estado: 'ativo', contrato_origem_id: null
      }
    ];
  })(),

  // Histórico mensal de conciliação (últimos 12 meses, para o Dashboard)
  // Em produção isso virá agregado do Firestore via query no período
  HISTORICO_MENSAL: [
    { mes: '2025-06', conciliados_qtd: 78,  pendentes_qtd: 12, conciliados_val: 412500.00, pendentes_val:  28400.00 },
    { mes: '2025-07', conciliados_qtd: 82,  pendentes_qtd: 8,  conciliados_val: 445800.00, pendentes_val:  19200.00 },
    { mes: '2025-08', conciliados_qtd: 91,  pendentes_qtd: 14, conciliados_val: 468300.00, pendentes_val:  34100.00 },
    { mes: '2025-09', conciliados_qtd: 85,  pendentes_qtd: 11, conciliados_val: 451200.00, pendentes_val:  25600.00 },
    { mes: '2025-10', conciliados_qtd: 88,  pendentes_qtd: 9,  conciliados_val: 472800.00, pendentes_val:  21300.00 },
    { mes: '2025-11', conciliados_qtd: 95,  pendentes_qtd: 13, conciliados_val: 498500.00, pendentes_val:  30700.00 },
    { mes: '2025-12', conciliados_qtd: 102, pendentes_qtd: 18, conciliados_val: 562300.00, pendentes_val:  41200.00 },
    { mes: '2026-01', conciliados_qtd: 87,  pendentes_qtd: 10, conciliados_val: 458900.00, pendentes_val:  22800.00 },
    { mes: '2026-02', conciliados_qtd: 84,  pendentes_qtd: 9,  conciliados_val: 445600.00, pendentes_val:  19800.00 },
    { mes: '2026-03', conciliados_qtd: 89,  pendentes_qtd: 12, conciliados_val: 475200.00, pendentes_val:  28100.00 },
    { mes: '2026-04', conciliados_qtd: 93,  pendentes_qtd: 11, conciliados_val: 489700.00, pendentes_val:  24500.00 },
    { mes: '2026-05', conciliados_qtd: 76,  pendentes_qtd: 16, conciliados_val: 398200.00, pendentes_val:  42300.00 }  // mês corrente, ainda incompleto
  ]
};
