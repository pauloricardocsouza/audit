# R2 Audit · CHANGELOG

Plataforma de auditoria interna da R2 Soluções Empresariais.

## v0.25 · filtros persistentes + documentação

- Conciliador: filtros (conta, status, período, movimento, busca banco/SIA) agora persistem entre visitas via `localStorage` com scope `r2a_filt_conciliacao`. Botão "Limpar" continua resetando para os defaults
- Lista de contratos: busca textual e filtro de estado também persistem (scope `r2a_filt_contratos_lista`)
- Helper `R2A.filtros.{save, load, clear}` em `shared.js` disponível para futuras telas
- `CHANGELOG.md` e `README.md` atualizados com histórico e arquitetura completa

## v0.24 · notificações ampliadas

- Central de notificações agora cobre 4 tipos: lançamentos ambíguos, parcelas em atraso, parcelas a vencer (30 dias), meses antigos não fechados (>90 dias) e contratos ativos sem PDF anexado
- Otimização: lista de contratos cacheada localmente no `compute()` para não ser buscada duas vezes

## v0.23 · acessibilidade auditada

- Sidebar com `role="navigation"`, `aria-label`, `aria-current="page"` no item ativo, `aria-expanded` / `aria-controls` nos módulos expansíveis
- Sino do topbar: `aria-haspopup`, `aria-expanded` sincronizado, `aria-label`
- Skip link injetado dinamicamente como primeiro filho do body, visível só com foco
- `role="main"` + `tabindex="-1"` no `.r2-content` para receber foco programático
- Focus trap nos modais via `Tab` / `Shift+Tab` que circula dentro do modal aberto
- `MutationObserver` adiciona `role="dialog"` / `aria-modal="true"` em qualquer backdrop que recebe a classe de aberto, e foca o primeiro input automaticamente
- Toast container: `role="status"` + `aria-live="polite"` + `aria-atomic="true"`
- Foco visível consistente via `:focus-visible` com box-shadow navy 30%
- Botões só-ícone (✎, 🗑, ✕) ganham `aria-label`

## v0.22 · notificações + KPIs reais + UX

- Sino do topbar funcional: `R2A.notifications.compute()` agrega ambíguos e parcelas em atraso/próximas. Cache de 30s. Dot vermelho só com itens reais
- Dropdown 360px com itens clicáveis que navegam para a tela do contexto
- Dashboard geral: KPIs calculados de dados reais (pendentes via `R2A.data`, delta vs mês anterior do histórico, taxa de conciliação, última atividade da coleção `auditoria`)
- Lista de contas mostra vínculo CC↔Garantida em mono navy abaixo do apelido
- ESC global fecha modais, sidebar mobile e dropdown de notificações

## v0.21 · transferências espelhadas (Onda 0)

- Schema da conta ganha `conta_vinculada_id` (opcional, válido quando `tipo=garantida`)
- Cadastro de conta exibe select condicional "Conta corrente vinculada" listando CCs do mesmo banco
- Nova função `runEspelhadas()` no Conciliador detecta pares CC↔Garantida com mesma data, valor absoluto idêntico e sinais opostos, marcando ambos como conciliado + gravando `vinculo_espelhado` cruzado
- Botão "▶ Onda 0 · Espelhadas" como primeiro da action bar
- Mock GPC: `bb-001-g` vinculada a `bb-001` com 2 pares de transferências reais

## v0.20 · Auditoria visualizada + virtualização Conciliação

- `R2A.auditar()` agora persiste em DEV (`localStorage`) além do `console.info`
- Nova tela `/auditoria.html` (admin-only): 4 KPIs (total, hoje, 7d, usuários distintos), filtros (data, usuário, ação, busca livre), tabela compacta com timestamp mono e pill de perfil, expansão de JSON completo ao clicar, paginação 100/página, exportação CSV com BOM UTF-8
- Link "Auditoria" na sidebar abaixo de "Dashboard geral", visível apenas para admin
- Conciliador: virtualização (windowing) por janela visível + buffer de 20 linhas, ROW_HEIGHT 42px, threshold de 200. Aguenta 10k+ lançamentos sem travar

## v0.19 · revisão completa de mobile

- Sidebar overlay com backdrop blur clicável em <760px; fecha ao clicar em qualquer link
- Tabelas grandes ganham `min-width` + `overflow-x: auto` em mobile (cronograma, lista contratos, cadastros, relatórios)
- Stats ribbon do Conciliador: 6 → 3 → 2 → 1 coluna conforme a viewport aperta
- Action bar do Conciliador volta a `flex-wrap: wrap` em mobile (sem scroll-x estranho)
- Hero do dashboard geral: padding interno menor, botões empilhados full-width em <760px
- Breakpoints: 480, 760, 900, 1100

## v0.18 · fluxo de fechamento de período

- `R2A.periodos.{list, get, fechar, reabrir, estaFechado, assertAberto}` em `shared.js`
- Nova tela `Conciliador → Fechamento`: lista todos os meses com lançamentos anteriores ao corrente, status aberto/fechado, metadata de quem fechou/reabriu, ação por linha apenas para admin
- Guards no Conciliador (`applyStatus`, `reverseSelection`, `manualMatch`) e nos Contratos (`vincularParcela`, `desvincularParcela`) bloqueiam alterações em meses fechados com toast vermelho explicativo
- Auto-vincular conta separadamente os bloqueados ("X vinculadas · Y bloqueadas por mês fechado")
- Footer mostra ambiente (DEV · localStorage / PROD · Firestore) no lado direito
- Bug-fix Cadastros: 26 ocorrências de `r2c-` renomeadas para `r2a-` reativando navegação das sub-abas

## v0.17 · ajustes UX

- Footer remove "Pronto" estático
- Modal Nova conta bancária reorganizado em 2 colunas com asterisco obrigatório discreto

## v0.16 · UI Conciliação mais enxuta

- Stats ribbon, action bar e filterbar com padding/fontsize reduzidos
- Action bar com `flex-wrap: nowrap` + overflow-x para garantir 1 linha em desktop
- Letterhead dos relatórios sem logo R2

## v0.15 · Dashboard Contratos completo + Conciliador via R2A.data

- 4 KPIs reais (principal, saldo devedor estimado, próximos 30d, em atraso)
- Card "Exposição por indexador" (barras horizontais) e "Carteira por banco" (donut Chart.js)
- Linha de pagamentos projetados próximos 12 meses (área com gradient navy)
- Lista priorizada de pendências críticas (atraso + vencer ≤7d), clicáveis
- Helper `R2A.contratos.kpisDashboard(contratos, lancamentos)` agrega tudo num passe
- Conciliador migrado para `R2A.data.list`: vínculos feitos em Contratos agora refletem aqui

## v0.14 · virada visual D2

- Novo `styles/theme.css` com tokens IBM Plex Sans/Mono + paleta navy `#1A3A52` + estados
- Componentes utilitários: `.r2-card`, `.r2-kpi`, `.r2-btn`, `.r2-status`, `.r2-pill`, `.r2-table`, `.r2-filterbar`, `.r2-seg`, `.r2-tabs`, `.r2-hero`, `.r2-modal`, `.r2-toasts`
- Aliases legados `.r2a-*` mapeados para a estrutura nova
- Sidebar com brand (logo azul), pill navy de versão, item ativo com barra vertical 3px navy à esquerda, submenus
- Topbar transparente com backdrop blur, busca global, sino com dot
- Toast como pílula branca com sombra e dot colorido
- Dashboard geral com hero gradient navy + 4 KPIs com ícones + cards de módulos com badge ATIVO/EM BREVE

## v0.13 · Fase 3 (amortização) + Fase 4 (vínculo parcela↔extrato)

- `R2A.amortizacao.{price, sac, addMeses, gerarCronograma}` em `shared.js`
- Mock: nova conta `sofisa-001` + 5 lançamentos casáveis com parcelas do contrato Sofisa (incluindo cenários de pago exato, D-1 e pago a menor)
- `matchParcelas` reescrito: prioriza vínculo manual gravado, ordena candidatos por proximidade combinada (data + valor), retorna candidatos no objeto da parcela
- `R2A.contratos.vincularParcela`, `desvincularParcela`, `autoVincular` novas
- UI no detalhe do contrato: coluna Ação com botões vincular/desvincular, botão "⟳ Auto-vincular", modal de seleção mostrando candidatos dentro da tolerância e outros débitos disponíveis ordenados por similaridade
- Badges M (manual) e ~ (sugestão automática) por parcela

## v0.12 · Fase 2 (upload PDF)

- Wizard de 3 passos em `upload.html`: drag-drop → texto extraído → revisão
- PDF.js 4.7.76 via CDN extrai texto local (PDF nunca sai do cliente)
- Heurística `requer_ocr` quando arquivo > 1 MB e texto < 100 chars
- Form de revisão cobre schema v2 completo (identificação, valores, datas, estrutura, taxa multi-cenário, conta débito, garantias, cronograma CSV)
- Botão "Gerar Price simples" preenche cronograma a partir dos parâmetros
- Persistência via `R2A.contratos.add` (localStorage em DEV, Firestore em prod)

## v0.11 · gradientes em escala de cinza + download PDF

- Gradientes decorativos do layout convertidos para cinza (logo sidebar, avatar, hero do login, ícone de módulo, letterhead relatórios, glow dos KPIs)
- Glows semânticos (verde sucesso, vermelho danger) preservados
- Campo `pdf_original` no schema do contrato (3 estados: download disponível, desabilitado com nome do arquivo, ausente)

## v0.10 · módulo Análise de Contratos · esqueleto

- Nova entrada na sidebar com Dashboard, Importar contrato, Contratos, Simulador
- Schema v2 detalhado (banco/produto/tomador/valores/datas/estrutura/taxa multi-cenário/conta débito/garantias/cronograma/instrumentos relacionados/qualidade extração)
- Mock realista: Sofisa PII56430-6 (R$ 2,3M, 24 parcelas crescentes price-flutuante CDI) e Safra Middle (R$ 1,1M, 6m carência + 30 parcelas iguais)
- Simulador Price/SAC funcional inline
- Helpers `R2A.contratos.{list, get, matchParcelas, kpis, fmtTaxa, fmtSistema, fmtProduto}`

## v0.9 · logos R2 (azul e branca)

- Logo oficial em PNG da R2 aplicada na sidebar (azul para fundo claro), login (branca para gradient navy) e letterhead de relatórios

## v0.8 · padrão visual GPC Comercial

- Realinhamento visual ao Filadelfia/GPC: Archivo + JetBrains Mono, paleta navy `#2E476F` + laranja `#F58634`
- Tokens, componentes, sombras duplas, raios padronizados em `shared.css`

## v0.7 e anteriores

- Login com Firebase Auth (placeholder em DEV)
- Dashboard geral
- Módulo Conciliador completo: Dashboard, Conciliação (Ondas 1 e 2 + manual + reversão), Relatórios (PDF + Excel), Cadastros (contas, categorias, usuários)
- Camada `R2A.data` (localStorage em DEV, Firestore em prod) com `list/get/add/update/remove/hasVinculos/removeOrInactivate`

---

**Convenções fixas durante toda a evolução**: sem em-dashes em texto novo, cache-bust `?v=X.Y` em todos os scripts/styles ao mudar, bump `APP_VERSION` em `config.js` em mudança visível, footer "R2 SOLUÇÕES EMPRESARIAIS · vX.Y" em mono uppercase, datas DD/MM/AAAA, moeda R$ 1.234,56, UTC-3.
