// ============================================================
// R2 Audit · Configuração global
// ============================================================
window.R2A_CONFIG = {
  APP_NAME: 'R2 Audit',
  APP_VERSION: '0.17',
  COMPANY: 'R2 SOLUÇÕES EMPRESARIAIS',
  DOMAIN: 'audit.solucoesr2.com.br',

  // Firebase: placeholder temporário
  FIREBASE: {
    apiKey: "AIzaSyD-PLACEHOLDER-TROCAR-AQUI",
    authDomain: "r2-audit-temp.firebaseapp.com",
    projectId: "r2-audit-temp",
    storageBucket: "r2-audit-temp.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:placeholder"
  },

  // Coleções Firestore
  COLLECTIONS: {
    USUARIOS:          'usuarios',
    CONTAS:            'contas_bancarias',
    CATEGORIAS:        'categorias',
    LANCAMENTOS_BANCO: 'lancamentos_banco',
    LANCAMENTOS_SIA:   'lancamentos_sia',
    MATCHES:           'conciliacoes',
    PERIODOS:          'periodos',
    UPLOADS:           'uploads_log',
    AUDITORIA:         'auditoria',
    CONTRATOS:         'contratos'
  },

  // Regras de negócio do Conciliador
  REGRAS: {
    ONDA1_TOLERANCIA_DATA_DIAS: 0,
    ONDA1_TOLERANCIA_VALOR_CENTAVOS: 0,
    ONDA2_THRESHOLD_AVISO: 100,
    ONDA2_LIMITE_SOLUCOES: 50
  },

  ESTADOS: ['pendente', 'conciliado', 'ambiguo', 'ignorado', 'justificado', 'analise'],

  TIPOS_CONTA: [
    { id: 'corrente',     label: 'Conta corrente',     descricao: 'Conta de movimento padrão' },
    { id: 'garantida',    label: 'Conta garantida',    descricao: 'Linha de crédito vinculada à corrente' },
    { id: 'vinculada',    label: 'Conta vinculada',    descricao: 'Conta amarrada a outra (cauções, garantias)' },
    { id: 'investimento', label: 'Investimento',       descricao: 'Aplicações e fundos' }
  ],

  PERFIS: ['admin', 'operador'],

  // ----------------------------------------------------------
  // MÓDULOS do sistema (sidebar)
  // Cada módulo tem ícone, label, base (path) e itens de submenu
  // ----------------------------------------------------------
  MODULOS: [
    {
      id: 'conciliador',
      label: 'Conciliador',
      icon: '⇄',
      base: 'conciliador/',
      desc: 'Auditoria de conciliação bancária · banco vs sistema',
      ativo: true,
      itens: [
        { id: 'dashboard',     label: 'Dashboard',     href: 'conciliador/dashboard.html',     icon: '◐' },
        { id: 'processamento', label: 'Processamento', href: 'conciliador/processamento.html', icon: '⇪' },
        { id: 'conciliacao',   label: 'Conciliação',   href: 'conciliador/conciliacao.html',   icon: '⇄' },
        { id: 'relatorios',    label: 'Relatórios',    href: 'conciliador/relatorios.html',    icon: '≡' },
        { id: 'cadastros',     label: 'Cadastros',     href: 'conciliador/cadastros.html',     icon: '☰' }
      ]
    },
    {
      id: 'contratos',
      label: 'Análise de Contratos',
      icon: '⊟',
      base: 'contratos/',
      desc: 'Leitura de contratos · simulação de parcelas · auditoria contra extrato',
      ativo: true,
      itens: [
        { id: 'dashboard', label: 'Dashboard',         href: 'contratos/dashboard.html', icon: '◐' },
        { id: 'upload',    label: 'Importar contrato', href: 'contratos/upload.html',    icon: '⇪' },
        { id: 'contratos', label: 'Contratos',         href: 'contratos/contratos.html', icon: '⊟' },
        { id: 'simulador', label: 'Simulador',         href: 'contratos/simulador.html', icon: '∑' }
      ]
    }
    // Próximos módulos virão aqui
  ],

  MODO_DEV: true
};

if (window.R2A_CONFIG.FIREBASE.apiKey.includes('PLACEHOLDER')) {
  console.warn('[R2 Audit] Firebase não configurado · rodando em modo DEV');
}
