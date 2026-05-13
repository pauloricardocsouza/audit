# R2 Audit · v0.7

Plataforma de auditoria da R2 Soluções Empresariais.
Domínio: `audit.solucoesr2.com.br`

## Mudança estrutural v0.7

O antigo "R2 Conciliador" foi renomeado para **R2 Audit** e reorganizado como plataforma multi-módulo:

- O **Conciliador** virou o primeiro módulo dentro do sistema
- Nova **sidebar lateral** com módulos expansíveis (colapsável)
- Novo **dashboard geral** ao logar (visão consolidada + cards dos módulos)
- Subpasta `conciliador/` para isolar o módulo
- Namespace global trocado: `R2C` → `R2A`
- Classes CSS: `r2c-*` → `r2a-*`

## Estrutura

```
audit/
├── index.html              ← Dashboard geral (entrada após login)
├── login.html
├── config.js               ← config + lista de MODULOS
├── shared.js               ← núcleo (auth, formatters, renderShell)
├── shared.css              ← shell sidebar + tópicos globais
├── data.js                 ← persistência (LS em DEV, Firestore em prod)
├── mock-data.js
├── LEIA-ME.md
│
└── conciliador/            ← MÓDULO Conciliador
    ├── dashboard.html      · KPIs, gráficos
    ├── processamento.html  · upload (placeholder)
    ├── conciliacao.html    · ondas, match manual
    ├── relatorios.html     · PDF + Excel
    ├── cadastros.html      · contas, categorias, usuários
    └── *.css / *.js
```

## Sidebar

- **Dashboard geral** (raiz)
- **Módulos** (seção)
  - **Conciliador** (expansível)
    - Dashboard / Processamento / Conciliação / Relatórios / Cadastros

A sidebar é colapsável (botão `‹` no topo). Estado salvo em localStorage.
Cada módulo no menu lembra se foi expandido (`r2a_sb_open_<moduloId>`).

## Como adicionar novo módulo

1. Em `config.js`, adicionar ao array `MODULOS`:
   ```javascript
   {
     id: 'novo-modulo',
     label: 'Novo Módulo',
     icon: '◆',
     base: 'novo-modulo/',
     desc: 'Descrição curta',
     ativo: true,
     itens: [
       { id: 'dashboard', label: 'Dashboard', href: 'novo-modulo/dashboard.html', icon: '◐' }
     ]
   }
   ```
2. Criar pasta `novo-modulo/` com os HTMLs
3. Em cada HTML usar o shell:
   ```html
   <div class="r2a-shell">
     <aside class="r2a-sidebar"></aside>
     <div class="r2a-main">
       <header class="r2a-topbar"></header>
       <div class="r2a-content"> ... </div>
       <footer class="r2a-footer"></footer>
     </div>
   </div>
   ```
4. No init JS:
   ```javascript
   R2A.renderShell({ modulo: 'novo-modulo', item: 'dashboard' });
   R2A.renderFooter();
   ```

## API global

- `R2A.session` · `R2A.login(email, senha)` · `R2A.logout()`
- `R2A.fmt.moeda/data/dataCurta/dataHora/periodoBR`
- `R2A.toast(msg, type)` · `R2A.confirm(msg)`
- `R2A.renderShell({ dashboardGeral, modulo, item })`
- `R2A.renderFooter()`
- `R2A.auditar(acao, detalhes)`
- `R2A.hashLancamento({ data, valor, descricao })`
- `R2A.subsetSum(valuesC, targetC, maxSols)`
- `R2A.data.list/get/add/update/remove/removeOrInactivate`
- `R2A.rel(href)` — corrige paths quando em subpasta

## Modo DEV vs Produção

`config.js → MODO_DEV: true`:
- Login aceita qualquer credencial
- Dados em `localStorage` (prefixo `r2a_`)
- Auditoria no console

Para resetar o storage: console do navegador →
```javascript
Object.keys(localStorage).filter(k => k.startsWith('r2a_')).forEach(k => localStorage.removeItem(k));
```

## Pendências

1. **Realinhar visual ao Filadelfia** (aguardando arquivos)
2. Tela de **Processamento** com parsers reais (aguardando exemplos de extrato e SIA)
3. Migrar Conciliação para usar `R2A.data` (Firestore-ready)
4. Fluxo de fechamento de período
5. Conectar Dashboard ao agregado real (Firestore) em vez de mock
