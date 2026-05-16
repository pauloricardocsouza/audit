# Prompt de Migração · R2 Audit (atualizado v0.27 · em curso v0.28)

> Cole este prompt no novo chat junto com o repositório (ou descompacte/clone o repo `pauloricardocsouza/audit` antes).
> Este documento substitui a versão antiga (v0.7). Reflete o estado atual após 21 versões evoluídas em sessão autônoma.

---

## CONTEXTO

Sou o Ricardo, founder da **R2 Soluções Empresariais**. O R2 Audit (`audit.solucoesr2.com.br`) é a plataforma multi-módulo de auditoria interna da R2 para uso com clientes (GPC, Filadelfia, etc.). Hoje tem **2 módulos** vivos: **Conciliador** (auditoria de conciliação bancária) e **Análise de Contratos** (leitura de PDFs de empréstimo + auditoria de pagamento contra extratos).

Repositório: `https://github.com/pauloricardocsouza/audit` · branch `main` (deploy direto). GitHub Pages como CDN, custom domain `audit.solucoesr2.com.br` (DNS pode estar pendente).

Estou trabalhando em **modo auto** (`claude --enable-auto-mode` simulado): você executa imediatamente, faz suposições razoáveis e segue. Pergunte só em ambiguidades de negócio reais. Decisões técnicas decida sozinho e justifique em 1 linha.

## ESTADO ATUAL · v0.27 deployada · v0.28 em progresso

**Último commit em produção:** `v0.27 · atalhos de navegação + filtros persistentes (rel/aud) + skeletons` (hash `b634098`).

**v0.28 em progresso (renegociação de contrato):**
- ✅ HTML do `modal-reneg` adicionado em `contratos/contrato.html` (logo após o modal de vincular parcela)
- ⏳ Falta: botão `↺ Renegociar` no `ct-page-actions` do detalhe (antes do botão Baixar PDF)
- ⏳ Falta: função `abrirModalRenegociar(c)` que abre o modal com sugestão de novo número (`{numero}-R1`, ou bump `-R{n+1}`) e data emissão de hoje
- ⏳ Falta: ao confirmar, clonar o contrato (sem id/cronograma/pdf), gravar `contrato_origem_id: c.id`, marcar o original como `estado: 'renegociado'`, auditar `contrato.renegociar`, redirecionar pro detalhe do novo
- ⏳ Falta: bump `APP_VERSION` 0.27 → 0.28 + cache-bust nos 14 HTMLs

**Próximo passo concreto após v0.28:** validar visualmente (user disse "não posso fazer testes agora", então continuamos construindo)

## STACK · não mudou desde v0.7

- **HTML multi-arquivo sem build, sem framework, sem bundler.** Decisão deliberada.
- **Persistência**: `R2A.data.list/get/add/update/remove` é a camada única. Em DEV usa `localStorage` (prefixo `r2a_`) com seed automático do mock. Em prod usa Firestore. PRECISA estar idêntica em DEV e prod.
- **Firebase Auth + Firestore** em prod · `MODO_DEV: true` em `config.js` aceita qualquer credencial e usa localStorage.
- **CDNs**: Chart.js 4.4.4, jsPDF 2.5.1 + autoTable 3.8.2, SheetJS 0.18.5, PDF.js 4.7.76 (módulo ESM), IBM Plex Sans/Mono via Google Fonts.
- **GitHub Pages**: deploy automático ao push em main. Cache-bust via `?v=X.Y` em todos os links/scripts.

## ESTRUTURA DE PASTAS

```
audit/
├── styles/
│   └── theme.css         ← DESIGN SYSTEM D2 (tokens IBM Plex + navy/orange + componentes)
├── shared.css            ← legado mínimo (só componentes .btn, .pill, .tbl, .seg-toggle, .empty)
├── shared.js             ← núcleo R2A.* (sessão, fmt, toast, renderShell, auditar, notifications, periodos, amortizacao, filtros, skeleton)
├── data.js               ← R2A.data (camada única DEV/prod com seed inteligente)
├── config.js             ← APP_VERSION, FIREBASE, COLLECTIONS, REGRAS, ESTADOS, TIPOS_CONTA, PERFIS, MODULOS
├── mock-data.js          ← seed em DEV: CONTAS (com Sofisa + bb-001-g vinculada), CATEGORIAS, BANCO (incluindo pares espelhados + parcelas casáveis com cnt-001), SIA, CONTRATOS (Sofisa + Safra reais anonimizados), HISTORICO_MENSAL
├── index.html            ← Dashboard geral · hero + 4 KPIs reais + cards de módulo + ATIVO/EM BREVE
├── login.html            ← Login D2 · header navy gradient + logo branca · dev-hint oculto durante teste privado
├── auditoria.html        ← Trilha de auditoria · admin only · 4 KPIs + filtros (período, usuário, ação, busca) + paginação + export CSV
├── logoR2azul.png        ← logo R2 horizontal navy (fundo claro)
├── logoR2branco.png      ← logo R2 horizontal branca (fundo escuro)
├── PROMPT-MIGRACAO.md    ← este arquivo
├── conciliador/
│   ├── dashboard.html    ← 4 KPIs + donut + barras por conta + linha 12 meses (Chart.js)
│   ├── conciliacao.html  ← filtros + ribbon 6 KPIs + action bar (Onda 0/1/2/manual/reverter) + 2 painéis virtualizados
│   ├── conciliacao.js    ← + Onda 0 espelhadas + persistirStatus + bloqueio por período fechado + windowing
│   ├── conciliacao.css
│   ├── relatorios.html   ← seletor tipo (Conciliação/Pendências) + letterhead navy + resumo 5 cols + tabela
│   ├── relatorios.js     ← filtros persistentes + export PDF (jsPDF) + Excel (SheetJS)
│   ├── relatorios.css
│   ├── cadastros.html    ← 3 sub-abas (Contas/Categorias/Usuários)
│   ├── cadastros.js      ← CRUD com modal · contas com tipo + vínculo CC↔Garantida · exclusão inteligente
│   ├── cadastros.css
│   ├── periodos.html     ← lista meses · admin fecha/reabre · guards no Conciliador e Contratos
│   └── processamento.html← placeholder (Fase 5 com Claude · aguarda OFX real do Ricardo)
└── contratos/
    ├── dashboard.html    ← 4 KPIs reais (principal/saldo/prox30/atraso) + barras indexador + donut bancos + linha 12 meses + pendências
    ├── contratos.html    ← lista com busca + filtro estado + skeleton + filtros persistentes
    ├── contrato.html     ← detalhe completo · KPIs + cronograma com vínculos + auto-vincular + modal vincular + modal renegociar (em construção v0.28)
    ├── upload.html       ← wizard 3 passos · PDF.js extrai texto + form de revisão + persist
    ├── upload.js         ← módulo ESM · PDF.js + heurística requer_ocr + R2A.amortizacao.gerarCronograma
    ├── simulador.html    ← Price/SAC standalone
    ├── contratos.js      ← R2A.contratos.{list, get, add, update, matchParcelas, vincularParcela, desvincularParcela, autoVincular, kpis, kpisDashboard, fmtTaxa, fmtSistema, fmtProduto}
    └── contratos.css
```

## DESIGN SYSTEM D2 · tokens em `styles/theme.css`

- **Navy**: `--navy: #1A3A52` · `--navy-2: #244B68` · `--navy-deep: #0F2433` · `--navy-soft: #EEF2F6` · `--navy-tint: #F5F8FB`
- **Estados** (cada um com `--*-soft`): `--ok: #16A34A` · `--warn: #D97706` · `--err: #DC2626` · `--info: #0891B2` · `--ambig: #A855F7`
- **Surfaces**: `--bg: #F4F6F9` · `--surface: #FFFFFF` · `--line: #E2E8F0` · `--line-2: #EEF2F6`
- **Ink** (texto): `--ink-1 #0F172A` (títulos) · `--ink-2 #1E293B` (corpo) · `--ink-3 #475569` · `--ink-4 #64748B` · `--ink-5 #94A3B8`
- **Tipografia**: IBM Plex Sans (UI) + IBM Plex Mono (números, labels, datas, footer, hint)
- **Raios**: `--r-sm 6px` (form, status) · `--r-md 8px` (botão, input) · `--r-lg 10px` (card) · `--r-xl 12px` (hero, modal)
- **Sombras**: `--shadow-card` (dupla, sutil) + `--shadow-pop` (popovers/modais)
- **Aliases legados** (`.r2a-shell`, `.r2a-sidebar`, `.r2a-topbar`, etc.) mapeados para `.r2-app`, `.r2-side`, `.r2-top` no theme.css

**Convenção:** sem em-dashes em prosa nova (use ` · ` ou ` - `). Footer "R2 SOLUÇÕES EMPRESARIAIS · vX.Y" em mono uppercase letter-spacing 0.12em. Logo azul horizontal em fundo claro (sidebar), logo branca horizontal em fundo escuro (login, letterhead de relatórios). Gradientes decorativos restantes são em **cinza**, cores semânticas só em estado (success/warn/err/info/ambig).

## API GLOBAL R2A.* (atualizada · v0.27)

### Sessão e Auth
- `R2A.session.{get, set, clear, isLoggedIn, user}` · `R2A.requireAuth(redirectTo?)` · `R2A.login(email, senha)` · `R2A.logout()` · `R2A.iniciais(nome)`

### Formatters
- `R2A.fmt.moeda(v, {sinal})` · `R2A.fmt.data(d)` · `R2A.fmt.dataCurta(d)` · `R2A.fmt.dataHora(iso)` · `R2A.fmt.periodoBR(d)`

### UI feedback
- `R2A.toast(msg, type, timeout)` · `R2A.confirm(msg)` · `R2A.renderShell({dashboardGeral, auditoria, modulo, item})` · `R2A.renderFooter()`

### Auditoria · Bloco 2 (só trilha, sem alçada)
- `R2A.auditar(acao, detalhes)` · em DEV grava no localStorage `auditoria`; em prod escreve na coleção Firestore

### Períodos (Bloco 7 · fechamento)
- `R2A.periodos.list()` (cache 5s) · `R2A.periodos.get(mes)` · `R2A.periodos.estaFechado(dataISO)` · `R2A.periodos.assertAberto(dataISO, contexto)` (lança erro `code: 'PERIODO_FECHADO'`) · `R2A.periodos.fechar(mes, obs)` · `R2A.periodos.reabrir(mes, obs)` · admin-only

### Amortização (Fase 3)
- `R2A.amortizacao.price(p, taxa, prazo, carencia)` · `R2A.amortizacao.sac(...)` · `R2A.amortizacao.addMeses(iso, n)` · `R2A.amortizacao.gerarCronograma({sistema, principal, taxaMensal, prazo, carencia, dataInicio})`

### Subset-sum
- `R2A.subsetSum(valuesC, targetC, maxSols)` em centavos inteiros (Onda 2 do Conciliador)

### Hash de lançamento
- `R2A.hashLancamento({data, valor, descricao})` para dedupe em re-uploads

### Contratos (v0.13+)
- `R2A.contratos.list/get/add/update` · `matchParcelas(c, lancamentos)` retorna parcelas com candidatos · `vincularParcela(contratoId, parcelaN, lancId)` · `desvincularParcela(lancId)` · `autoVincular(contratoId)` retorna `{vinculados, ambiguos, bloqueados}` · `kpis(list)` simples · `kpisDashboard(contratos, lancamentos)` agrega tudo

### Notificações (Bloco 22+24)
- `R2A.notifications.compute()` cache 30s · agrega 4 tipos: ambíguos, atraso, próximas 30d, meses antigos não fechados, contratos sem PDF
- Sino do topbar abre dropdown com itens clicáveis · dot vermelho dinâmico

### Filtros persistentes (v0.25)
- `R2A.filtros.save(scope, obj)` · `R2A.filtros.load(scope, default)` · `R2A.filtros.clear(scope)` · localStorage prefix `r2a_filt_{scope}`
- Aplicado em: Conciliação, Cadastros sub-aba, Relatórios, Auditoria, Contratos lista

### Skeleton (v0.27)
- `R2A.skeleton.rows(count, cols)` retorna HTML pronto para `<tbody>` · `R2A.skeleton.line(width, height)`
- Aplicado em contratos.html e auditoria.html

### Atalhos teclado (v0.27)
- `/` foca busca global · `?` abre modal de ajuda
- **Sequência `g + letra` (1.5s)**: h Dashboard · d Conciliador dash · x Conciliação · r Relatórios · p Períodos · k Cadastros · c Contratos · u Upload contrato · s Simulador · a Auditoria
- ESC fecha modais, sidebar mobile e dropdown de notificações
- Focus trap nos modais (Tab/Shift+Tab circula)

### Utils DOM
- `R2A.$ / R2A.$$` · `R2A.rel(href)` (resolve subpasta)

## DECISÕES DE NEGÓCIO ATIVAS (não me pergunte de novo)

1. **Multi-tenant** (Bloco 1): um projeto Firebase por cliente. Domínio por cliente. Decisão sua quando entrar o 2º cliente além da R2.
2. **Controles** (Bloco 2): **só trilha, sem alçada**. R2A.auditar grava tudo, mas nada bloqueia por threshold de valor.
3. **Contábil** (Bloco 3): conciliador de fluxo puro. **NÃO** implementar plano de contas, partida dobrada nem exportação contábil.
4. **CFO indicadores** (Bloco 4): nada agora. O Dashboard de Contratos atual cobre.
5. **Processamento** (Bloco 5): bloqueia totalmente saldo divergente · começa pelo OFX (formato universal). Trava aguardando OFX real seu.
6. **Engenharia** (Bloco 6): só virtualização foi priorizada. Sentry, CI/CD, loading states (skeletons feitos), a11y (feito).
7. **Conciliação** segue regra dura: Onda 1 tolerância zero (mesma conta + data exata + centavos) · Onda 2 subset-sum mesma data sem limite combinatório mas alerta acima de 100 pendentes · Onda 0 NOVA: transferências espelhadas CC ↔ Garantida vinculada (v0.21).
8. **Tolerância parcela vinculada × extrato**: data ±5d, valor ±5%.
9. **OCR de PDF escaneado**: Claude Vision via mesma Firebase Function (depende Fase 5).
10. **PDF original** dos contratos: campo `pdf_original.url` previsto no schema mas Storage entra na Fase 5. Hoje é placeholder.

## ESTADO POR MÓDULO

### Conciliador ✅ completo (núcleo)
- ✅ Dashboard (Chart.js)
- ✅ Conciliação (Onda 0 espelhadas, Onda 1 1:1, Onda 2 1:N, manual, ambiguidade, reversão, virtualização windowing para 10k+ linhas)
- ✅ Relatórios (preview + PDF jsPDF + Excel SheetJS + filtros persistentes)
- ✅ Cadastros (3 sub-abas funcionais, modais D2, exclusão inteligente, vínculo CC↔Garantida visualizável)
- ✅ Fechamento de período (admin fecha/reabre, guards no Conciliador e Contratos)
- ⏳ Processamento (placeholder, aguarda OFX real)

### Análise de Contratos ✅ funcional (faltam refinos)
- ✅ Dashboard (KPIs reais via kpisDashboard + exposição por indexador em barras + carteira por banco em donut + 12 meses projeção em linha + pendências críticas)
- ✅ Contratos · lista com busca + filtros persistentes + skeleton
- ✅ Detalhe · cronograma + vincular parcela + auto-vincular + KPI cumprimento real
- ⏳ Renegociar contrato (v0.28 em curso · modal já no HTML, falta botão + JS)
- ✅ Importar contrato (PDF.js extrai texto local, wizard 3 passos, form de revisão completo do schema v2)
- ✅ Simulador (Price/SAC standalone)

### Auditoria ✅ (Bloco 2)
- ✅ Trilha visualizável admin-only · filtros persistentes · paginação · export CSV

### Dashboard Geral ✅ v0.22
- ✅ Hero saudação · 4 KPIs reais com deltas do histórico · cards de módulo · última atividade da auditoria

## PENDÊNCIAS INTERNAS (autônomas · sem você)

1. **Terminar v0.28** · botão Renegociar + função no contrato.html · ~30 linhas
2. **Skeletons** em mais telas (Conciliação, Dashboard Contratos)
3. **Empty states com CTA** · quando lista vazia oferecer ação
4. **Validação inline** (CNPJ, datas) · em vez de toast
5. **README.md + CHANGELOG.md** atualizados
6. **Page transition** · fade-in suave no `.r2-content` ao carregar
7. **Notification center · mais tipos** · contratos vencendo no mês corrente
8. **PDF do detalhe do contrato** · gerar cronograma + KPIs como PDF (jsPDF)

## PENDÊNCIAS BLOQUEADAS (dependem do Ricardo)

- **PR fin**: branch `claude/hopeful-sinoussi-44d6bb` pushada em `pauloricardocsouza/fin`. Criar via https://github.com/pauloricardocsouza/fin/pull/new/claude/hopeful-sinoussi-44d6bb
- **DNS** `audit.solucoesr2.com.br` → CNAME `pauloricardocsouza.github.io`
- **GitHub Pages** ativo · Settings → Pages → branch main, root
- **OFX real** de exemplo (qualquer banco) para calibrar parser do Processamento
- **Firebase Blaze + chave Anthropic** (Fase 5 LLM Claude)
- **2º cliente** (multi-tenant)

## CONVENÇÕES R2 (IMPORTANTÍSSIMAS)

- **Sem em-dashes** em texto novo · use ` · ` ou ` - `
- **Cache-bust** `?v=X.Y` em todos `<script src>` e `<link href>` ao mudar
- **Bump `APP_VERSION`** em `config.js` em toda mudança visível · cache-bust em paralelo nos 14 HTMLs
- **Comunicação** em pt-BR · direto · contexto curto
- **Itera visualmente** com screenshots quando peço pra corrigir layout
- **Mocks em arquivo separado** (`mock-data.js`)
- **Datas DD/MM/AAAA · moeda R$ 1.234,56 · UTC-3 Brasília**
- **Push direto pra main** do repo audit (deploy automático)
- **Sem tests automatizados** (não priorizado no Bloco 6)
- **Sem CI/CD** (idem)
- **Sem em-dashes** nem em prosa nem em código gerado por você

## INFORMAÇÕES DE CONTEXTO

- **R2 Soluções Empresariais** é a empresa do Ricardo (audit.solucoesr2.com.br)
- **Filadelfia** (Filadelfiainfo Comercial Ltda) é o cliente piloto · sistema antigo em fc.solucoesr2.com.br · usa o SIA como ERP
- **GPC** (Grupo Pinto Cerqueira, supermercado regional 4 lojas) é cliente âncora · usa conta garantida vinculada à CC (caso modelado na Onda 0)
- Contratos reais analisados para calibrar o schema v2: Sofisa CCB PII56430-6 R$ 2.3M (CDI flutuante), Safra Middle 003516147 R$ 1.1M (6m carência), Caixa CCB, BB CCB (escaneado · precisa OCR), Safra Prioridade, Safra Retrô · todos com tomador Filadelfiainfo
- Stack paralela do Ricardo: WinThor BI, Filadelfia (Realtime DB single-file), Comercial GPC (Firestore multi-arquivo), Biblo PWA familiar

## COMO QUERO QUE VOCÊ TRABALHE

1. **Auto mode ativo**: executa, não pergunta. Pergunte só em ambiguidade de negócio real.
2. **Decisão técnica é sua**: justifique em 1 linha no commit.
3. **Push direto em main do audit**: deploy é automático no GitHub Pages.
4. **Sempre bump + cache-bust** em mudança visível.
5. **Sem em-dashes** nem em prosa.
6. **Iteração**: uma feature por commit, com mensagem detalhada. Reporta no chat o que entregou.
7. **Sem skip de hooks** nem `--no-verify` nem `--no-gpg-sign`.

## OBSERVAÇÕES DA MEMÓRIA · aprendizados de quem trabalhou aqui

Anotações práticas pra outro Claude pegar o ritmo sem repetir erros. Trate isto como conhecimento institucional sobre o Ricardo e sobre o projeto.

### Sobre o Ricardo (estilo de trabalho)

- **Comunicação extremamente direta.** Mensagens típicas: "continue", "pode sim", "tem algo para adiantarmos?". Não enrole em explicação se não for pedido. Resposta dele é geralmente 5-30 palavras.
- **Auto mode é o default agora.** Ele liga uma vez ("continue autonomamente") e quer ver entrega, não perguntas. Pergunte SÓ quando há real ambiguidade de negócio — decisão técnica decide você sozinho e justifica em 1 linha no commit.
- **Aprova quando você organiza em blocos.** Análise crítica em 7 blocos de perguntas estruturadas (`AskUserQuestion` com 2-4 alternativas) destravou decisões importantes. Use esse padrão quando precisar mesmo perguntar.
- **Quer ver entrega visual a cada turno.** Resumo no final de cada commit listando o que mudou + como testar. Ele valida com print/screenshot ou descrição de bug.
- **Corrige rota com print/desenho.** Quando algo está visualmente errado, manda screenshot anotado com círculos vermelhos. Não discute, mostra. Confie no que ele indica.
- **Bump de versão é ritual.** Toda mudança visível bumpa `APP_VERSION` no `config.js` + cache-bust `?v=X.Y` em **todos os 14 HTMLs** + footer hardcoded no `login.html`. Esquecer disso = bug de cache no dia seguinte.

### Decisões já cravadas (NÃO REPERGUNTAR)

| Tema | Decisão | Resposta dele |
|---|---|---|
| Multi-tenant | 1 projeto Firebase por cliente | Bloco 1 |
| Controles internos | Só trilha, sem alçada/aprovação | Bloco 2 |
| Contábil | Conciliador de fluxo puro, ZERO partida dobrada | Bloco 3 |
| Indicadores CFO | Nada agora | Bloco 4 |
| Processamento | Bloqueia total saldo divergente · começa por OFX | Bloco 5 |
| Engenharia | Só virtualização priorizada (rejeitou Sentry/CI/CD/loading-states inicialmente) | Bloco 6 |
| LLM | Claude (Anthropic), não GPT | resp. anterior |
| Proxy LLM | Firebase Functions, não Cloudflare Worker | resp. anterior |
| Calibração schema | Genérico inicial, sem mandar PDF de exemplo | resp. anterior |
| Tolerância parcela × extrato | ±5d, ±5% | resp. anterior |
| OCR scanned | Claude Vision na mesma Function | resp. anterior |

### Pegadinhas técnicas descobertas (não cair de novo)

- **`node --check` não está disponível** neste ambiente do Windows. Você não consegue validar sintaxe JS antes de commitar. Confie em revisão visual e teste após push.
- **`gh` CLI também não disponível**. Se precisar criar PR, retorne URL para clique manual: `https://github.com/{owner}/{repo}/pull/new/{branch}`.
- **Bug silencioso clássico**: o `cadastros.js` usava selectors `.r2c-*` quando o HTML migrou pra `.r2a-*` na virada D2 (v0.14). Quebrou navegação entre sub-abas sem erro nenhum no console. Foi fix da v0.17. Quando renomear classes, **busque em TODOS os JS**.
- **`R2A.fmt.moeda(v, {sinal: false})`** suprime sinal. Use quando o valor já é absoluto na linha (KPI, total).
- **PDF.js no `upload.js`**: é `<script type="module">` que importa via `import` ESM. `R2A.*` é window global. Funciona por timing (módulo defere). Não tente carregar PDF.js também via `<script src>` no HTML — duplica.
- **`MutationObserver` nos modais** (focus trap): captura mudança de classe `is-open`/`open`. Cuidado com `setTimeout(50)` antes de mover foco, senão tenta focar elemento ainda invisível.
- **`R2A.data.list` em arrays grandes pode ser lento** se persistir muito no localStorage. Use `Promise.all` para updates em batch (vide `applyStatus`, `autoVincular`).
- **CRLF/LF warning do Git no Windows** aparece em todo commit. Não é erro. `core.autocrlf` está em true. Ignora.
- **`localStorage` tem quota** (~5-10 MB). Se a coleção `auditoria` crescer demais em DEV, R2A.data.add pode falhar silenciosamente. Coloquei try/catch no R2A.auditar exatamente por isso.
- **SEED_VERSION em `data.js`** força re-seed quando o mock muda. Sempre bumpe quando mexer em `mock-data.js` estrutural — mas o seed preserva campos do usuário (vínculos manuais, status conciliado).

### Convenções implícitas (aprendidas no caminho)

- **Sem em-dashes** (`—`) em prosa nova. Use ` · ` ou ` - ` ou ` -- `. Vale para texto, código, comentário. Crítico no commit.
- **Tabular nums em TODA célula de dinheiro/quantidade**: classe `.num` ou inline `font-variant-numeric: tabular-nums`. Sem isso, valores não alinham.
- **Datas em listas/tabelas**: `var(--font-mono)` 11.5px cor `var(--ink-4)`. Padrão D2.
- **Cores semânticas só onde semântica.** Verde/vermelho/âmbar reservados para estado. Decorativo é cinza (Bloco 6 cinza nos gradientes). Laranja só em badges de alerta.
- **Logo azul horizontal em fundo claro** (sidebar). **Logo branca horizontal em fundo escuro** (login, letterhead). Não usar em letterhead de relatório (ele removeu uma vez).
- **Não inflar altura desnecessariamente.** Ele reclamou da action bar do Conciliador com 200px de altura por causa de `flex-wrap: wrap`. Force `flex-wrap: nowrap` + `overflow-x: auto` em barras de ação desktop.
- **Footer**: mono uppercase letter-spacing 0.12em. "R2 SOLUÇÕES EMPRESARIAIS · vX.Y" à esquerda, ambiente (DEV/PROD) à direita.

### O que NÃO fazer (regras duras)

1. **Não introduza React/Vue/Tailwind/Vite/bundler.** Decisão firme do prompt original. HTML puro + R2A namespace global.
2. **Não use `--no-verify`, `--no-gpg-sign`, `--amend`.** Sempre commit novo.
3. **Não force push** em main do audit.
4. **Não esqueça do cache-bust** nos 14 HTMLs em mudança visível. Comando rápido:
   ```bash
   find . -name "*.html" -not -path "./.claude/*" -not -path "./.git/*" -exec sed -i 's|?v=X.X|?v=Y.Y|g' {} \;
   sed -i 's|· v0\.X|· v0.Y|g' login.html
   ```
5. **Não crie arquivos `.md` que ele não pediu.** README/CHANGELOG não foi priorizado. PROMPT-MIGRACAO foi pedido explicitamente.
6. **Não toque em `shared.css`** sem cuidado — é um stub minimal por design. O design system vive em `styles/theme.css`.
7. **Não delete dados** (resetar localStorage, drop coleção) sem confirmação explícita.

### Contexto dos clientes / da operação

- **R2** = empresa do Ricardo. Cliente da própria ferramenta. Opera os dados dos clientes finais.
- **Filadelfia** (Filadelfiainfo Comercial Ltda, CNPJ 96.787.858/0001-17) = cliente piloto. Tem ERP próprio chamado **SIA**. Os contratos reais usados pra calibrar o schema v2 são dela (Sofisa PII56430-6, Safra 003516147, BB CCB escaneado, Caixa, etc.). Sistema antigo dela é o Filadelfia em `fc.solucoesr2.com.br` (Firebase Realtime DB single-file).
- **GPC** (Grupo Pinto Cerqueira) = cliente âncora. Supermercado regional, 4 lojas. Caso de uso da **conta garantida vinculada à CC** (Onda 0). Sistema dele paralelo é o Comercial GPC (Firestore multi-arquivo).
- **Stack pessoal do Ricardo**: WinThor BI (Oracle SQL), Filadelfia, Comercial GPC, Biblo (PWA familiar). Todos seguem padrão "APP_VERSION + cache-bust + footer R2".

### Padrão visual que ele aprova

- Cards `.r2-card` com `__head` + `__body` (padding 14px / 20px).
- KPI grid 4 colunas no topo do dashboard, virando 2x2 em <1100px e 1 coluna em <480px.
- Ribbon de stats horizontal em card único com `border-right` separando colunas.
- Filtros sempre em filterbar no topo, persistentes via `R2A.filtros`.
- Tabela com header navy-tint mono uppercase letter-spacing 0.08em.
- Modal com header navy-tint, body 20px, footer alinhado direita.
- Toast em pílula branca borda navy com dot colorido (não fundo cheio).

### Onde ainda tenho perguntas em aberto

- Quando entra o 2º cliente em produção? (destrava multi-tenant)
- Quando você ativa Blaze + chave Anthropic? (destrava Fase 5 LLM)
- O **cliente final** (GPC, Filadelfia) loga direto na ferramenta, ou só o operador R2? (impacta UX, permissões, multi-tenant)
- O Processamento do Conciliador precisa de OFX real seu — você prometeu mandar mas não enviou ainda.
- O PR no repo `pauloricardocsouza/fin` (branch `claude/hopeful-sinoussi-44d6bb`) está pushada e aguardando seu clique no link de criação.

---

## PRÓXIMO PASSO CONCRETO (quando retomar)

**Terminar a v0.28 · botão Renegociar:**

No `contratos/contrato.html`, dentro do `render()` que monta o `wrap.innerHTML` do detalhe, adicione no `<div class="ct-page-actions">` (logo após "← Voltar", antes do botão Baixar PDF):

```html
${c.estado === 'ativo' ? `<button class="btn" id="btn-renegociar" title="Criar contrato de renegociação">↺ Renegociar</button>` : ''}
```

E adicione uma função `abrirModalRenegociar(c)` que:
1. Sugere `numero_contrato + '-R1'` (ou bump `-R{n+1}` se já tiver sufixo)
2. Default `data emissao` = hoje
3. Ao confirmar: clona `c` (sem id, cronograma_parcelas=[], pdf_original=null, datas resetadas), grava `contrato_origem_id: c.id`, marca o antigo `estado: 'renegociado'`, audita, redireciona `contrato.html?id={novo.id}`

Bump 0.27 → 0.28, cache-bust nos 14 HTMLs, commit, push.

Depois, escolher livre da lista de pendências internas. Não me pergunta, vai.

---

**Histórico de versões (resumo)**: 0.7 base → 0.8-0.10 visual D2 inicial + Análise de Contratos esqueleto → 0.11 download PDF placeholder → 0.12 upload PDF.js → 0.13 amortização + vínculo parcela → 0.14 D2 SaaS moderno (IBM Plex, navy, redesenho completo) → 0.15 dashboard contratos completo + conciliacao via R2A.data → 0.16 mobile compactado → 0.17 cadastros bug-fix + footer · 0.18 fechamento de período → 0.19 revisão mobile geral → 0.20 auditoria + virtualização → 0.21 Onda 0 espelhadas → 0.22 notificações + KPIs reais dashboard geral · vínculo visual cadastros · ESC global → 0.23 a11y (aria, focus trap, skip link) → 0.24 notificações ampliadas → 0.25 filtros persistentes Conciliação/Cadastros → 0.26 atalhos `/` e `?` → 0.27 atalhos `g <letra>` + filtros persistentes Relatórios/Auditoria + skeletons → **0.28 renegociação contrato (em curso)**.
