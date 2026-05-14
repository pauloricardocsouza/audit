# R2 Audit

Plataforma de auditoria interna da **R2 Soluções Empresariais**, hospedada em [audit.solucoesr2.com.br](https://audit.solucoesr2.com.br).

Multi-módulo, multi-usuário (admin / operador), Firebase Firestore + Auth em produção, **GitHub Pages** como CDN. HTML estático sem build.

## Módulos ativos

### Conciliador
Auditoria de conciliação bancária comparando extratos com lançamentos do sistema do cliente (SIA, ERP, etc).

- **Dashboard** · KPIs (taxa, valor conciliado, pendente, volume) + donut + barras por conta + linha 12 meses
- **Processamento** · upload de extratos (parser OFX em construção; PDF/CSV planejados)
- **Conciliação** · Ondas progressivas:
  - **Onda 0** · transferências espelhadas entre CC e Garantida vinculada
  - **Onda 1** · 1:1, mesma data + valor centavo a centavo
  - **Onda 2** · 1:N, subset-sum em centavos, restrito à mesma data
  - **Manual** · seleção dos dois lados com validação de soma
- **Relatórios** · 2 tipos (Conciliação completa, Pendências) com PDF (jsPDF) e Excel (SheetJS)
- **Fechamento** · admin fecha/reabre meses; lançamentos em mês fechado ficam bloqueados
- **Cadastros** · contas (com vínculo CC↔Garantida), categorias, usuários

### Análise de Contratos
Leitura de contratos de empréstimo + simulação de parcelas + cruzamento com extrato bancário.

- **Dashboard** · 4 KPIs (principal, saldo devedor, próximos 30d, atrasos) + barras de exposição por indexador + donut de carteira por banco + linha de pagamentos projetados 12 meses + lista priorizada de pendências críticas
- **Importar contrato** · wizard 3 passos (drag-drop + PDF.js extrai texto local + revisão manual)
- **Contratos** · lista filtrável da carteira
- **Detalhe** · KPIs do contrato + cronograma com match parcela↔extrato (manual e auto-vincular) + condições financeiras com taxa multi-cenário
- **Simulador** · sandbox Price/SAC para pré-fixados

### Auditoria (admin-only)
Trilha imutável de toda ação relevante (cada vínculo de parcela, status alterado, criação de contrato, fechamento de período, login). Filtros por período/usuário/ação/busca livre + exportação CSV.

## Stack

- **HTML/CSS/JS estático** · sem build, sem framework, sem bundler
- **Firebase Firestore** · persistência em produção
- **Firebase Auth** · email/senha em produção
- **PDF.js 4.7** · extração de texto de PDFs no browser (via CDN)
- **Chart.js 4.4** · gráficos (via CDN)
- **jsPDF 2.5 + autoTable 3.8** · exportação PDF (via CDN)
- **SheetJS 0.18** · exportação Excel (via CDN)
- **IBM Plex Sans + Mono** · tipografia (Google Fonts)

## Estrutura

```
audit/
├── index.html              · Dashboard geral
├── login.html
├── auditoria.html          · trilha de auditoria (admin)
├── config.js               · config + módulos da sidebar + tokens de coleções
├── shared.js               · núcleo (auth, R2A.data, R2A.contratos, R2A.periodos,
│                              R2A.notifications, R2A.filtros, R2A.amortizacao,
│                              shell, toast, fmt, ícones SVG, focus trap, ESC global)
├── shared.css              · CSS legado minimal (botões, pills, tabelas)
├── styles/theme.css        · design system D2 (tokens IBM Plex + componentes utilitários)
├── data.js                 · camada R2A.data (localStorage em DEV, Firestore em prod)
├── mock-data.js
├── logoR2azul.png          · fundo claro
├── logoR2branco.png        · fundo escuro
├── CNAME                   · audit.solucoesr2.com.br
├── conciliador/
│   ├── dashboard.html
│   ├── processamento.html  · placeholder, parser OFX em construção
│   ├── conciliacao.html    · Ondas 0/1/2 + manual + reversão + virtualização
│   ├── relatorios.html     · preview + PDF + Excel
│   ├── periodos.html       · fechamento mensal
│   ├── cadastros.html      · 3 sub-abas
│   └── *.css / *.js
└── contratos/
    ├── dashboard.html      · KPIs, charts, pendências críticas
    ├── upload.html         · wizard 3 passos com PDF.js
    ├── contratos.html      · lista
    ├── contrato.html       · detalhe com cronograma + vínculo manual/auto
    ├── simulador.html      · Price/SAC standalone
    └── *.css / *.js
```

## API global · `R2A.*`

Disponível em todas as páginas após carregar `shared.js`:

- `R2A.session.{get, set, clear, isLoggedIn, user}`
- `R2A.login(email, senha)`, `R2A.logout()`, `R2A.requireAuth()`
- `R2A.fmt.{moeda, data, dataCurta, dataHora, periodoBR}`
- `R2A.toast(msg, type, timeout)` · success/error/warning/info
- `R2A.confirm(msg)` · Promise<boolean>
- `R2A.renderShell({ dashboardGeral?, auditoria?, modulo?, item? })`
- `R2A.renderFooter()`
- `R2A.auditar(acao, detalhes)` · persiste em coleção `auditoria`
- `R2A.hashLancamento({ data, valor, descricao })` · dedupe em re-uploads
- `R2A.subsetSum(valuesC, targetC, maxSols)` · centavos inteiros (zero erro de float)
- `R2A.amortizacao.{price, sac, addMeses, gerarCronograma}` · Price/SAC determinísticos
- `R2A.rel(href)` · resolve path relativo de subpasta
- `R2A.$` / `R2A.$$` · atalhos de `querySelector(All)`
- `R2A.data.{init, list, get, add, update, remove, hasVinculos, removeOrInactivate}`
- `R2A.contratos.{list, get, add, update, matchParcelas, vincularParcela, desvincularParcela, autoVincular, kpis, kpisDashboard, fmtTaxa, fmtSistema, fmtProduto}`
- `R2A.periodos.{list, get, fechar, reabrir, estaFechado, assertAberto}`
- `R2A.notifications.{compute, invalidate}`
- `R2A.filtros.{save, load, clear}` · scopes por tela

## Modo DEV vs Produção

`config.js`:

```js
window.R2A_CONFIG = {
  APP_NAME: 'R2 Audit',
  APP_VERSION: '0.25',
  MODO_DEV: true,
  FIREBASE: { /* placeholder em DEV */ }
};
```

- **DEV (`MODO_DEV: true`)**: login aceita qualquer credencial, `R2A.data` usa `localStorage` com prefixo `r2a_`, seed automático do `mock-data.js` quando `SEED_VERSION` muda, auditoria também vai pro console
- **Produção (`MODO_DEV: false`)**: precisa Firebase configurado (apiKey real), Email/Password Auth ativo, Firestore com regras de segurança

A migração DEV→PROD é só mudar `MODO_DEV` e a config do Firebase. O código de cada tela não muda.

## Deploy

GitHub Pages publica direto do branch `main` do repo `pauloricardocsouza/audit`.

- Arquivo `CNAME` aponta para `audit.solucoesr2.com.br`
- `.nojekyll` desativa processamento Jekyll
- `.gitignore` mantém `.claude/`, logs e backups fora do repo

Cada commit em `main` vira deploy automático em 30-60 segundos via Pages.

## Convenções

- **Sem em-dashes** em texto novo (use ` · ` ou ` - `)
- **Cache-bust** `?v=X.Y` em todos os `<script>` e `<link>` ao alterar
- **Bump `APP_VERSION`** em mudança visível
- **Footer** `R2 SOLUÇÕES EMPRESARIAIS · vX.Y` em mono uppercase
- **Datas** DD/MM/AAAA
- **Moeda** R$ 1.234,56
- **Timezone** Brasília UTC-3

## Histórico

Veja [CHANGELOG.md](CHANGELOG.md) para o registro detalhado de versões da v0.7 até a atual.

## Licença

Uso interno R2 Soluções Empresariais. Não distribuir.
