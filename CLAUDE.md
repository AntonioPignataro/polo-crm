# CLAUDE.md — Sistema Polo

## Sobre o Projeto

Sistema Polo é um SaaS web multi-tenant para gestão de clubes infantis/juvenis educacionais. O sistema gerencia sócios (crianças/adolescentes), seus pais, preceptores (monitores), e todas as atividades do clube incluindo presença, sistema de pontuação (polares), biblioteca, atendimentos, atividades extracurriculares, formação de pais e horas de estudo.

## Domínio do Negócio

### Entidades Principais
- **Clubes**: Cada clube é um tenant independente (ex: "Polo São Paulo", "Polo Curitiba")
- **Sócios**: Crianças/adolescentes divididos em grupos (G1: 10–12 anos, G2: 13–14, G3: 15–17) e módulos (Quinta, Sexta, Sábado) via tabela junction `member_modules`
- **Pais/Responsáveis**: Responsáveis dos sócios (pai, mãe, responsável adicional), com portal próprio para registrar horas de estudo e inscrever filhos em atividades. Parent ≠ User: pais se auto-registram como User e são vinculados ao Parent record por e-mail (bi-direcional)
- **Preceptores**: Monitores responsáveis por um grupo de sócios (preceptorados). Atribuição manual via UI na página de preceptores
- **Polares**: Sistema de pontuação/gamificação com 11 categorias (Presença, Pontualidade, Amigo, Esporte, Encargo, Multa, Exercício, Boletim, Resumo, Livro, Outros Pontos). Outros Pontos aceita valores livres

### Regras de Negócio
- Polares por livro: gerados automaticamente ao registrar devolução
- Polares — regras de participação por grupo:
  - **G1**: sempre participa (sem restrições)
  - **G2**: opt-in. Ao editar um sócio e selecionar G2, dialog pergunta "Manter participação nos polares?" — se sim, `polaresUntil` é setado para 31/12 do ano corrente; se não, excluído
  - **G3**: sempre excluído, sem exceções
  - Helper `excludeFromPolaresFilter()` em `lib/constants.ts` centraliza a lógica (inclui G1, inclui G2 com polaresUntil válido, exclui G3). Alias deprecated `excludeG3Filter` mantido para compatibilidade
  - Reset anual: cron `/api/cron/reset-polares` (31/12 às 12h UTC) limpa todos os `polaresUntil`
- Assinatura eletrônica separada: edição de sócio (MONITOR+) é separada da e-signature dos pais. Pais veem tela bloqueante ao login com texto de autorização + assinatura digital. Apenas um dos pais precisa assinar por filho
- Atividades — auto-inscrição: MONITOR+ pode se inscrever em atividades. Se também for pai, vê a si mesmo + filhos no dropdown
- Alerta presença: se presença mensal ≤ 50%, notifica preceptor + diretor por e-mail
- Alerta preceptoria: se < 2 atendimentos de preceptoria ou 0 de sacerdote no mês, notifica preceptor + diretor
- Alerta formação pais: notifica preceptor + diretor com lista de pais faltantes
- Notificações de aniversário: cron semanal (segundas) envia e-mail ao diretor com aniversariantes do mês
- Notificações de calendário: cron diário envia lembretes de eventos do dia seguinte
- Bimestres de estudo: Mar/Abr, Mai/Jun, Ago/Set, Out/Nov

### Perfis de Acesso (RBAC)
- **SUPER_ADMIN**: Administrador da plataforma. Gerencia clubes, planos, métricas globais
- **DIRETOR**: Admin do seu clube. Acesso total dentro do tenant. Pode gerenciar papéis de usuários
- **PRECEPTOR**: Vê/edita dados dos seus preceptorados. Registra polares, presença, atendimentos
- **MONITOR**: Registra presença, polares (aba Lançamento). Extrai relatórios. Não edita cadastros
- **USUARIO**: Nível de acesso base. Funcionalidades de pai (Meus Filhos, horas de estudo, inscrição em atividades) são habilitadas via `parentId` na sessão JWT, não pelo role — permitindo que um DIRETOR/PRECEPTOR/MONITOR também seja pai. Criado via auto-registro (`/register`)

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Linguagem | TypeScript | 5.x |
| UI | Tailwind CSS + shadcn/ui (Radix) | v4 + latest |
| ORM | Prisma | 7.3.0 |
| Banco | PostgreSQL (Supabase) | 15.x |
| Auth | NextAuth.js v5 | 5.0.0-beta.30 |
| E-mail | Resend | 6.9.3 |
| Validação | Zod + react-hook-form | 4.3.6 + 7.71.1 |
| Export PDF | jsPDF + jspdf-autotable | 4.1.0 + 5.0.7 |
| Export Excel | ExcelJS | 4.4.0 |
| Runtime | Node.js | 20.19 |

## Estrutura do Projeto

```
sistema-polo/
├── prisma/
│   ├── schema.prisma              # Schema com 22 tabelas multi-tenant
│   ├── seed.ts                    # Seed data (1 clube, 4 usuários, 12 sócios, 12 configs, 10 livros)
│   ├── seed-calendar.ts           # Seed 63 eventos do calendário (Mar–Jun 2026)
│   ├── seed-test-data.ts          # Dados de teste adicionais
│   ├── clean-database.ts          # Script para limpar banco
│   ├── setup-club.ts              # Script para configurar clube
│   ├── migrate-parents.ts         # Migration script Parent/User cleanup
│   └── migrations/
├── prisma.config.ts               # Config Prisma 7 (datasource URL)
├── next.config.ts                 # Security headers (CSP, HSTS, XSS, Permissions-Policy)
├── vercel.json                    # Cron jobs (5 schedules)
├── public/
│   └── manual-clube-polo-1-semestre-2026.pdf  # Manual do clube para download
├── src/
│   ├── middleware.ts               # Proteção de rotas (JWT via getToken, Edge-compatible, USUARIO routing)
│   ├── app/
│   │   ├── globals.css             # Tema customizado (azul, oklch hue 250)
│   │   ├── layout.tsx              # Root layout (lang pt-BR + SessionProvider + PWA meta)
│   │   ├── page.tsx                # Redirect para /dashboard
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # API route NextAuth
│   │   │   └── cron/
│   │   │       ├── alert-notifications/route.ts      # Cron: alertas presença/preceptoria/formação
│   │   │       ├── birthday-notifications/route.ts   # Cron: aniversariantes do mês
│   │   │       ├── calendar-notifications/route.ts   # Cron: lembretes de eventos do calendário
│   │   │       ├── keep-alive/route.ts               # Cron: ping Supabase (anti-pause)
│   │   │       └── reset-polares/route.ts            # Cron: reset anual de polaresUntil (31/12)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx          # Layout limpo para auth (centrado)
│   │   │   ├── login/page.tsx      # Login via server action (não client-side signIn)
│   │   │   └── register/page.tsx   # Auto-registro (USUARIO por padrão)
│   │   └── (dashboard)/
│   │       ├── layout.tsx          # Layout com sidebar + header + bottom nav
│   │       ├── error.tsx           # Error boundary
│   │       ├── dashboard/page.tsx
│   │       ├── socios/page.tsx
│   │       ├── socios/novo/page.tsx
│   │       ├── socios/[id]/ficha/page.tsx
│   │       ├── socios/historico/page.tsx   # Histórico de sócios
│   │       ├── preceptores/page.tsx
│   │       ├── polares/page.tsx
│   │       ├── presenca/page.tsx
│   │       ├── biblioteca/page.tsx
│   │       ├── atendimentos/page.tsx
│   │       ├── meus-filhos/page.tsx        # Portal pais (qualquer role com parentId)
│   │       ├── atividades/page.tsx
│   │       ├── formacao-pais/page.tsx
│   │       ├── horas-estudo/page.tsx
│   │       ├── notificacoes/page.tsx       # Gestão de notificações e-mail (DIRETOR)
│   │       ├── calendario/page.tsx
│   │       ├── relatorios/page.tsx
│   │       └── usuarios/page.tsx           # Gestão de usuários (DIRETOR+)
│   ├── components/ui/              # Componentes shadcn/ui (23 incl. responsive-dialog)
│   ├── generated/prisma/           # Prisma Client gerado
│   ├── hooks/
│   │   └── use-mobile.ts
│   ├── lib/
│   │   ├── auth.ts                 # Configuração NextAuth.js (providers, callbacks, rate limiting)
│   │   ├── auth-utils.ts           # Helpers server-side (getRequiredSession, requireRole, withAuth)
│   │   ├── constants.ts            # Constantes do domínio (polares, labels)
│   │   ├── cron-auth.ts            # Autenticação Bearer para endpoints de cron
│   │   ├── email.ts                # Serviço de e-mail (Resend + console fallback, HTML escaping)
│   │   ├── env.ts                  # Validação Zod de variáveis de ambiente obrigatórias
│   │   ├── navigation.ts           # Definição da sidebar com RBAC (7 grupos)
│   │   ├── prisma.ts               # Singleton do Prisma Client (PrismaPg adapter)
│   │   ├── utils.ts                # Utilitários (cn)
│   │   ├── google-books.ts         # Integração Google Books API (busca capa/detalhes)
│   │   ├── bottom-nav.ts           # Definição da navegação inferior mobile
│   │   ├── export-pdf.ts           # Gerador PDF client-side (jsPDF + autoTable)
│   │   ├── export-pdf-server.ts    # Gerador PDF server-side (para alertas com anexo)
│   │   ├── export-excel.ts         # Gerador Excel client-side (ExcelJS)
│   │   ├── export-excel-server.ts  # Gerador Excel server-side
│   │   └── export-enrollment-pdf.ts # Gerador PDF da ficha de inscrição
│   ├── modules/
│   │   ├── auth/                   # Registro, gestão de usuários (schemas, actions, queries, components)
│   │   ├── members/               # Sócios (CRUD, listagem, formulário, histórico)
│   │   ├── preceptors/            # Preceptores (cards, atribuição manual de sócios)
│   │   ├── polares/
│   │   ├── attendance/
│   │   ├── library/
│   │   ├── activities/            # Atividades com confirmação de presença e caronas
│   │   ├── appointments/
│   │   ├── dashboard/
│   │   ├── calendar/
│   │   ├── study-hours/
│   │   ├── parents/                # Portal dos pais
│   │   ├── reports/                # Relatórios + formação de pais (com confirmação de presença)
│   │   ├── enrollment/             # Ficha de inscrição digital
│   │   └── notifications/          # Notificações por e-mail (com pause toggle)
│   ├── shared/components/
│   │   ├── app-sidebar.tsx         # Sidebar com navegação, RBAC e signOut
│   │   ├── bottom-nav.tsx          # Navegação inferior mobile
│   │   ├── header.tsx              # Header com breadcrumb e nome do clube
│   │   ├── mobile-filter-toggle.tsx # Toggle de filtros no mobile
│   │   ├── pending-access-screen.tsx # Tela para USUARIO sem parentId vinculado
│   │   ├── session-provider.tsx    # Wrapper client-side do NextAuth SessionProvider
│   │   └── stat-strip.tsx          # Faixa de estatísticas (dashboard, scroll horizontal)
│   └── types/
│       ├── index.ts                # Types reexportados do Prisma + tipos custom
│       └── next-auth.d.ts          # Augmentação de tipos NextAuth (role, clubId, etc.)
├── CLAUDE.md                       # Este arquivo
└── README.md
```

## Schema do Banco (Prisma)

### Tabelas (22 total)
| Módulo | Tabelas |
|--------|---------|
| Multi-tenant | `clubs` |
| Auth | `users` |
| Membros | `members`, `member_modules`, `parents`, `member_parents` |
| Polares | `polar_entries`, `polar_configs` |
| Presença | `attendance_sessions`, `attendance_records` |
| Biblioteca | `books`, `book_loans` |
| Atendimentos | `appointments`, `priest_queue` |
| Atividades | `activities`, `activity_registrations` |
| Formação Pais | `parent_formations`, `parent_formation_attendance` |
| Horas de Estudo | `study_hours` |
| Calendário | `calendar_events`, `calendar_notification_queue` |
| Notificações | `notifications` |

### Enums
| Enum | Valores |
|------|---------|
| UserRole | SUPER_ADMIN, DIRETOR, PRECEPTOR, MONITOR, USUARIO |
| GroupType | G1, G2, G3 |
| ModuleType | QUINTA, SEXTA, SABADO |
| MemberStatus | ATIVO, INATIVO |
| Sex | MASCULINO, FEMININO |
| ParentRelationship | PAI, MAE, RESPONSAVEL |
| PolarCategory | PRESENCA, PONTUALIDADE, AMIGO, ESPORTE, ENCARGO, MULTA, EXERCICIO, BOLETIM, RESUMO, LIVRO, OUTROS_PONTOS |
| BookCategory | LITERATURA, LEITURA_ESPIRITUAL, FORMACAO_HUMANA |
| FormationType | FORMACAO_PAI, FORMACAO_CASAL |
| CalendarEventType | CLUBE_REGULAR, ATIVIDADE_EXTERNA, FORMACAO_PAIS, FERIADO, OUTROS |
| AppointmentType | SACERDOTE, PRECEPTORIA_SOCIO, PRECEPTORIA_PAIS |
| NotificationType | ALERTA_PRESENCA, ALERTA_PRECEPTORIA, ANIVERSARIO, GERAL, ALERTA_FORMACAO, CALENDARIO, MANUAL |

### Multi-Tenancy
Abordagem: tabela compartilhada com `club_id` em todas as tabelas de domínio. Toda query deve filtrar por `clubId` do usuário autenticado.

## Páginas do Frontend (21 rotas)

Todas as páginas estão conectadas ao banco real (Supabase) com Server Actions e queries reais. Auth, RBAC e isolamento de tenant estão funcionais. Todas as tabelas possuem layout responsivo com cards no mobile (`md:hidden` / `hidden md:block`). Dialogs usam `responsive-dialog` (bottom sheet no mobile).

| Rota | Página | Funcionalidades | Acesso Pai |
|------|--------|----------------|------------|
| `/login` | Login | Email/senha via server action + link para registro | — |
| `/register` | Registro | Auto-registro com role USUARIO padrão, link bi-direcional com Parent | — |
| `/dashboard` | Dashboard | Stats, ações rápidas (admin) / Resumo dos filhos (USUARIO com parentId) / Pending access screen (USUARIO sem parentId) | Sim (view dedicada) |
| `/meus-filhos` | Meus Filhos | Polares detalhados por filho com tabela de categorias | Qualquer role com parentId |
| `/socios` | Lista de Sócios | Tabela com filtros (grupo, módulo, status), busca, coluna Ficha (Assinada/Pendente com view de assinatura), ícone de edição (SquarePen) | Não |
| `/socios/novo` | Cadastro de Sócio | Formulário com dados pessoais + pai + mãe + responsáveis adicionais, preceptores do banco | Não |
| `/socios/[id]/ficha` | Edição de Sócio | Formulário de edição (MONITOR+) com dados do sócio e pais. Sem assinatura, emergência ou autorizações (separados na tela de e-signature dos pais). Dialog G2→polares ao mudar grupo | Não |
| `/socios/historico` | Histórico de Sócios | Histórico de membros | Não |
| `/preceptores` | Preceptores | Cards com preceptorados, atribuição/remoção manual de sócios | Não |
| `/polares` | Polares | 3 abas: Lançamento (checkboxes + input OUTROS_PONTOS, MONITOR+), Ranking (medalhas, USUARIO+), Atribuição (config pontos por categoria, DIRETOR+). G1 incluso, G2 opt-in, G3 excluído. "pol" em vez de "pts" | Não |
| `/presenca` | Presença | Chamada por sessão com data e tipo de dia | Não |
| `/biblioteca` | Biblioteca | Catálogo com categorias, emprestar/devolver, busca, Google Books API | Não |
| `/atendimentos` | Atendimentos | Histórico + fila do sacerdote. Preceptorias com 4 campos extras (propósitos, metas, plano de vida, tópicos). Sacerdote sem observações | Não |
| `/atividades` | Atividades | Cards com status, inscrições com caronas (admin), auto-inscrição MONITOR+ (com filhos se também pai) / Inscrição de filhos (pai), confirmação de presença | Sim (view dedicada) |
| `/formacao-pais` | Formação Pais | Tabela expansível com presença, confirmação de presença | Não |
| `/horas-estudo` | Horas de Estudo | Tabela bimestral, registro por pais (via parentId) ou MONITOR+. G2 sem opt-in e G3 excluídos | Sim (filtrado) |
| `/calendario` | Calendário | Grade mensal + agenda view mobile, eventos coloridos por tipo, 63 eventos semestrais pré-carregados | Sim |
| `/notificacoes` | Notificações | Envio manual/bulk e-mail, alertas presença/preceptoria, histórico, pause toggle | Não (DIRETOR) |
| `/relatorios` | Relatórios | 8 tipos (incl. Histórico de Leitura) com preview, export PDF/Excel + download do Manual do Clube. Polares e Livros são anuais; demais mensais. G3 excluídos dos relatórios de polares | Não |
| `/usuarios` | Usuários | Gestão de papéis (RBAC hierárquico), ativar/desativar contas | Não (DIRETOR+) |

## Infraestrutura

| Serviço | Uso | URL |
|---------|-----|-----|
| Vercel | Hosting + CI/CD (plano Hobby) | Projeto `sistema-polo`; deploy automático via push no `main` |
| Supabase | PostgreSQL (transaction mode pooler, port 6543) + Storage (bucket `documentos`) | Prod `<PROD_PROJECT_REF>`; dev em projeto separado — `aws-1-sa-east-1.pooler.supabase.com` |
| Cloudflare | Registro do domínio + DNS | `sistemapolo.com`, wildcard `*.sistemapolo.com` → Vercel |
| Resend | E-mail transacional | Remetente verificado em `sistemapolo.com` |
| GitHub | Repositório (privado) | `github.com/sistemapolo/sistema-polo` |

Procedimentos de deploy, migrations em produção e cadastro de novo clube: ver seção "Produção e Operação" do `README.md`. Deploy na Vercel Hobby exige que o **autor** do commit seja o usuário GitHub `sistemapolo`.

### Variáveis de Ambiente
```
DATABASE_URL          # Supabase pooler connection string (obrigatória, validada via Zod em lib/env.ts)
AUTH_SECRET           # NextAuth JWT secret (obrigatória)
SUPABASE_SERVICE_ROLE_KEY  # Supabase Storage, bucket "documentos" (lib/storage.ts)
RESEND_API_KEY        # Chave da API Resend (opcional, console fallback)
RESEND_FROM_EMAIL     # Remetente dos e-mails (opcional)
CRON_SECRET           # Autenticação Bearer dos endpoints de cron (obrigatória)
```

### Cron Jobs (vercel.json)
| Job | Endpoint | Schedule |
|-----|----------|----------|
| Keep-alive | `/api/cron/keep-alive` | `0 8 */5 * *` (a cada 5 dias) |
| Aniversários | `/api/cron/birthday-notifications` | `0 15 * * 1` (segundas 15h) |
| Calendário | `/api/cron/calendar-notifications` | `0 20 * * *` (diário 20h) |
| Alertas | `/api/cron/alert-notifications` | `0 21 28-31 * *` (fim do mês 21h) |
| Reset Polares | `/api/cron/reset-polares` | `0 12 31 12 *` (31/12 às 12h UTC) |

### Segurança
- CSP headers (self + Google Books + Supabase)
- HSTS com preload (2 anos)
- X-Frame-Options: DENY
- Permissions-Policy: bloqueia camera, microphone, geolocation
- HTML escaping em e-mails
- Rate limiting no login: 5 tentativas / 15 min por e-mail
- Cron auth via Bearer token (`lib/cron-auth.ts`)

### Build
```bash
# Vercel build command (configurado em Vercel):
prisma generate && next build
```

## Comandos Úteis

```bash
# Dev server
npx next dev --port 3000

# Build de produção
npx next build

# Gerar Prisma Client (após alterar schema)
npx prisma generate

# Criar migration
npx prisma migrate dev --name descricao_da_mudanca

# Seed do banco (dados de teste)
npm run db:seed

# Seed do calendário (63 eventos Mar–Jun 2026)
npx tsx prisma/seed-calendar.ts

# Limpar banco de dados
npx tsx prisma/clean-database.ts

# Setup de clube
npx tsx prisma/setup-club.ts

# Type check
npx tsc --noEmit

# Prisma Studio
npm run db:studio
```

## Decisões Arquiteturais

1. **Monolito Modular**: Separação por domínios em `src/modules/` em vez de microsserviços
2. **Multi-tenant com club_id**: Mais simples que schema/banco separado para o volume esperado
3. **Server Actions**: Preferência sobre API Routes para mutações
4. **Prisma 7 + PrismaPg adapter**: `@prisma/adapter-pg` com PoolConfig (não pg.Pool manual). Transaction mode pooler (port 6543) para serverless. `idleTimeoutMillis: 0` para evitar stale connections. Config em `prisma.config.ts`. Migrations devem usar port 5432 (session mode): `DATABASE_URL="...5432/postgres" npx prisma migrate dev`
5. **shadcn/ui**: Componentes copiados para o projeto (não dependência externa), customizáveis
6. **Tema azul**: Esquema de cores oklch (hue 250), aplicado via CSS variables em `globals.css`
7. **Middleware Edge-safe**: Middleware NÃO importa Prisma (incompatível com Edge Runtime). Usa `getToken` do `next-auth/jwt` para verificação JWT segura. Restringe rotas de USUARIO
8. **NextAuth JWT strategy**: Sem banco para sessions — tudo via JWT (8h max-age). Dados extras (role, clubId, parentId) enriquecidos via callbacks. Rate limiting: 5 tentativas/15min por e-mail
9. **auth-utils.ts**: Helpers server-side (`withAuth`, `withRole`, `getClubScope`, `getParentContext`) preparam isolamento de tenant e contexto de pai para Server Actions
10. **Portal dos pais via conditional rendering**: Páginas existentes detectam `session.parentId` (para qualquer role) ou `session.role === "USUARIO"` e renderizam views dedicadas em vez de criar rotas separadas. `parentOnly` flag na navegação controla visibilidade de itens exclusivos de pais
11. **E-mail via Resend**: `lib/email.ts` abstrai o provider com console fallback automático quando env vars não estão configuradas. Funções: `sendEmail()`, `sendEmailBatch()`, `isEmailConfigured()`, `formatNotificationHtml()`
12. **Report exports client-side + server-side**: PDF (jsPDF) e Excel (ExcelJS) gerados no browser via dynamic imports para download manual. Variantes server-side (`export-pdf-server.ts`, `export-excel-server.ts`) usadas pelo cron de alertas para gerar PDFs anexados a e-mails. Interface `ReportData` padronizada para todos os 8 tipos
13. **Assinatura eletrônica separada**: E-signature dos pais é separada da edição de sócio. Pais veem tela bloqueante (`ParentSignatureScreen`) ao login com texto de autorização + `signature_pad`. Dados salvos como JSON em `enrollmentFormUrl` do Member. Edição de sócio (MONITOR+) usa `MemberEditForm` sem campos de assinatura
14. **Mobile responsive**: Todas as tabelas possuem layout duplo — `Table` para desktop (`hidden md:block`) e cards empilhados para mobile (`md:hidden`). Bottom nav bar, responsive dialogs (bottom sheets no mobile), horizontal scroll stat strips, collapsible filter bars, calendar agenda view, PWA meta tags
15. **Auto-registro**: Usuários se cadastram via `/register` com role USUARIO por padrão. Link bi-direcional: se um Parent com o mesmo e-mail existir, é vinculado automaticamente. Diretores promovem papéis via `/usuarios`
16. **Calendário semestral**: Formato de semestre é `"AAAA.N"` (ex: `"2026.1"`). Eventos populados via seed script a partir do Manual do Clube em PDF
17. **Env validation**: `lib/env.ts` valida variáveis obrigatórias (DATABASE_URL, AUTH_SECRET, CRON_SECRET) via Zod no startup
18. **Cron auth centralizada**: `lib/cron-auth.ts` — Bearer token via `Authorization` header (padrão Vercel) com fallback para query param `?key=`
19. **Security headers**: `next.config.ts` configura CSP, HSTS, X-Frame-Options, Permissions-Policy. Allowlist para Google Books e Supabase
20. **Cascade deletes**: Relacionamentos no Prisma schema usam `onDelete: Cascade` para limpeza automática
21. **Login via server action**: Login usa server action com `redirect: false` + client-side `window.location.href` (hard navigation). Server-action redirects do NextAuth v5 beta.30 são unreliable com Next.js 16
22. **Pending access screen**: USUARIO sem `parentId` vinculado vê tela de acesso pendente em vez do dashboard

## Histórico de Desenvolvimento

### Sessão 1 (31/01/2026)
- Análise dos documentos fornecidos (Sistema Polo.pptx, fichas, controle de livros, etc.)
- Proposta de arquitetura, schema de banco e telas aprovada pelo usuário
- Decisão de infraestrutura: Vercel + Supabase, multi-tenant com club_id
- Setup do projeto Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
- Schema Prisma completo com 20 tabelas e todos os relacionamentos
- 17 páginas frontend criadas com mock data e tema customizado

### Sessão 2 (01/02/2026)
- Conectou banco de dados Supabase PostgreSQL (21 tabelas criadas via migration)
- Configurou Prisma 7 com PrismaPg adapter + pg.Pool
- Criou seed data: 1 clube, 1 diretor, 3 preceptores, 12 sócios, 9 polar configs, 10 livros
- Implementou autenticação completa (NextAuth.js v5 com JWT, middleware Edge-safe, RBAC)
- auth-utils.ts: `getRequiredSession()`, `requireRole()`, `getClubScope()`, `withAuth()`, `withRole()`
- Credenciais de teste: `diretor@polo.com / admin123`, `carlos@polo.com / preceptor123`

### Sessão 3 (01–02/02/2026)
- Substituiu mock data por CRUD real em todos os 12 módulos
- Implementou Zod schemas para validação server-side em 7+ módulos
- Integrou react-hook-form com @hookform/resolvers para validação client-side
- ActionResult<T> pattern consistente para retorno de Server Actions

### Sessão 4 (02/02/2026)
- Implementou Portal dos Pais completo:
  - Dashboard pais com cards por filho, Meus Filhos (`/meus-filhos`), Horas de Estudo filtrado, Atividades com inscrição
  - `getParentContext()` em auth-utils.ts

### Sessão 5 (02/02/2026)
- Implementou integração WhatsApp + módulo de notificações completo (posteriormente migrado para e-mail na Sessão 9)

### Sessão 6 (02/02/2026)
- Exportação de relatórios em PDF e Excel para todos os 7 tipos
- Interface `ReportData` padronizada, preview em tabela, dynamic imports

### Sessão 7 (02/02/2026)
- Ficha de inscrição digital com assinatura eletrônica (`signature_pad`)
- Módulo `enrollment/` completo, export PDF dedicado

### Sessão 8 (02/02/2026)
- Corrigiu `/socios/novo` para usar server action real `createMember`
- Auditoria completa dos 9 itens do roadmap — todos confirmados funcionais

### Sessão 9 (03/02/2026)
- **Migração WhatsApp → Resend Email** (12 arquivos):
  - Removeu `lib/whatsapp.ts`, criou `lib/email.ts` com Resend SDK
  - Migrou todas as actions, schemas e componentes de notificações
  - Console fallback automático quando API key não configurada
- **Controle de acesso Preceptoria**: Preceptores veem apenas seus preceptorados em atendimentos
- **Notificações de aniversário**:
  - Cron `/api/cron/birthday-notifications` (mensal, 1º do mês às 8h)
  - Envia e-mail ao diretor com lista de aniversariantes do mês
- **Responsividade mobile**: Conversão de 11 tabelas para layout card no mobile
  - Padrão: `hidden md:block` (table desktop) + `md:hidden` (cards mobile)

### Sessão 10 (03/02/2026)
- **Deploy em produção**:
  - Criou repositório GitHub privado (`AntonioPignataro/sistema-polo`)
  - Deploy no Vercel com build command `prisma generate && next build`
  - Configurou variáveis de ambiente no Vercel
- **Supabase keep-alive**:
  - Cron `/api/cron/keep-alive` (a cada 6 dias) para evitar pausa do free tier
  - Configurado no cron-job.org

### Sessão 11 (03/02/2026)
- **Auto-registro de usuários** (`/register`):
  - Schema Zod com validação de senha, form com react-hook-form
  - Action pública que auto-atribui role USUARIO + primeiro clube ativo + link bi-direcional com Parent
  - Link bidirecional login ↔ register, banner de sucesso
  - `/register` adicionado às rotas públicas no middleware
- **Gestão de usuários** (`/usuarios`):
  - Página com tabela + filtros (busca, papel, status) + versão mobile cards
  - RBAC hierárquico: SUPER_ADMIN gerencia todos; DIRETOR gerencia DIRETOR e abaixo
  - Actions `updateUserRole` e `toggleUserActive` com validações
  - Dialog de confirmação para todas as ações
  - Navegação: grupo "Gestão" com ícone ShieldCheck, visível para DIRETOR+

### Sessão 12 (04/03/2026)
- **Correção de acentuação portuguesa** em 16+ arquivos:
  - Todos os textos user-facing corrigidos (cedilha, til, agudo, circunflexo)
  - Arquivos: constants, navigation, sidebar, header, calendário, polares, presença, horas de estudo, sócios, inscrição, notificações, relatórios, atividades, reports query, export-pdf, export-enrollment-pdf
- **Download do Manual do Clube**:
  - PDF copiado para `public/manual-clube-polo-1-semestre-2026.pdf`
  - Card de download adicionado à página de Relatórios
- **Seed do calendário semestral**:
  - `prisma/seed-calendar.ts`: 63 eventos (Mar–Jun 2026) extraídos do Manual do Clube
  - 40 CLUBE_REGULAR + 10 FORMAÇÃO_PAIS + 7 FERIADO + 4 ATIVIDADE + 2 OUTROS
  - Formato de semestre: `"2026.1"` (dot notation, exigido pelo frontend)

### Sessão 13 (04/03/2026)
- **Google Books API**: Integração na biblioteca para buscar capa e detalhes do livro ao emprestar
- **Remoção lembretes de pagamento**: Funcionalidade removida do módulo de notificações
- **Conteúdo de preceptoria (FASE II)**: Campos de propósitos, metas e plano de vida no atendimento de preceptoria, com fluxo de edição
- **Docker removido**: `docker-compose.yml` removido do projeto

### Sessão 14 (04–05/03/2026)
- **Alertas automáticos por e-mail** (`/api/cron/alert-notifications`):
  - Alerta presença (≤50% mensal), alerta preceptoria (<2 atendimentos ou 0 sacerdote), alerta formação pais
  - Relatórios PDF anexados automaticamente por role (DIRETOR recebe todos, PRECEPTOR recebe os relevantes)
- **Seletor de período dinâmico**: Removido seletor de bimestre, substituído por seletor mês/ano dinâmico em relatórios
- **Remoção coluna Código**: Removida da tela de biblioteca e do relatório de Livros

### Sessão 15 (05/03/2026)
- **Histórico de Leitura** (8º tipo de relatório):
  - Relatório geral (independente de período) mostrando histórico de empréstimos por sócio
  - Agrupado por membro, com status "Emprestado" para livros ativos

### Sessão 16 (05–06/03/2026)
- **Expansão do sistema de Polares** (20 arquivos, 7 fases):
  - **Novas categorias**: Exercício, Resumo, Geral (valor livre), Leilão (apenas negativo)
  - **Aba Atribuição**: Configuração de pontos por categoria (DIRETOR+), salva em PolarConfig
  - **Visibilidade por role**: Lançamento (MONITOR+), Ranking (USUARIO+), Atribuição (DIRETOR+)
  - **Unidade "pol"**: Substituiu "pts" por "pol" em toda a interface
  - **Exclusão G3**: Sócios G3 excluídos de polares, ranking, dashboard, portal pais, horas de estudo (10 arquivos)
  - **Horas de estudo pais-only**: Apenas pais (via parentId) registram horas
  - **Relatórios anuais**: Polares e Livros passaram de mensal para anual; novas colunas Exercício/Resumo/Geral/Leilão no PDF
  - **Input GERAL/LEILÃO**: Inputs `type="text"` + `inputMode="numeric"` com botões custom de setas (ChevronUp/ChevronDown). LEILÃO auto-insere "-" no focus e só aceita negativos

### Sessão 17 (07/03/2026)
- **Rename role PAI → USUARIO** (21 arquivos):
  - Role agora representa nível de acesso, não identidade como pai
  - Renomeado no banco via `ALTER TYPE "UserRole" RENAME VALUE 'PAI' TO 'USUARIO'`
  - Atualizado em constants, navigation, auth, pages, actions, components
- **Desacoplamento Parent ↔ User**:
  - `Parent.userId` agora é opcional (nullable) — pais existem independentemente de Users
  - `createMember` não cria mais Users automáticos para pais; cria apenas Parent records
  - `findOrCreateParent` helper: deduplicação por e-mail (reutiliza pai entre irmãos) + link bi-direcional
- **Link bi-direcional Parent ↔ User por e-mail**:
  - No auto-registro (`register.ts`): se Parent com mesmo e-mail existe, vincula automaticamente
  - No cadastro de sócio (`create-member.ts`): se User com mesmo e-mail existe, vincula automaticamente
  - Funciona independente da ordem de criação
- **parentId na sessão JWT**:
  - `parentId: string | null` adicionado ao JWT (auth.ts, next-auth.d.ts, auth-utils.ts)
  - Funcionalidades de pai (Meus Filhos, horas de estudo, atividades) agora baseadas em `parentId`, não role
  - Um DIRETOR/PRECEPTOR/MONITOR que também é pai tem acesso às features de pai
  - `parentOnly` flag no NavItem controla visibilidade na sidebar
- **Responsáveis adicionais (guardians)**:
  - Novo `guardianSchema` com campo `sex` (MASCULINO/FEMININO)
  - `useFieldArray` no formulário: cards dinâmicos para adicionar/remover responsáveis
  - E-mail obrigatório para pai, mãe e responsáveis
  - Salvos como Parent com `relationship: "RESPONSAVEL"`
- **Data migration script** (`prisma/migrate-parents.ts`):
  - Limpa Users auto-criados pelo antigo `createMember`
  - Desvincula Parent.userId, deleta Notifications e Users em transação

### Sessão 18 (07/03/2026)
- **Mobile UI overhaul** (10 fases, 43 arquivos):
  - Bottom nav bar (`bottom-nav.tsx`, `bottom-nav.ts`)
  - Responsive dialogs via `responsive-dialog.tsx` (bottom sheets no mobile)
  - Horizontal scroll stat strips, collapsible filter bars
  - Calendar agenda view para mobile
  - Touch target fixes, card polish, PWA meta tags, smooth scrolling
- **Migração de cor verde → azul** (oklch hue 145→250 em `globals.css`)
- **Scripts de banco**: `prisma/clean-database.ts`, `prisma/setup-club.ts`
- **Atribuição manual de preceptores**: Removeu auto-assign no cadastro de sócio, adicionou UI assign/unassign na página de preceptores
- **Remoção de preços de módulo**: `MODULE_FEES` removido, campo de mensalidade removido do formulário de cadastro
- **Correções**: Fix server action errors (type re-exports em "use server"), fix appointment form validation

### Sessão 19 (22/03/2026)
- **Phase 1 major overhaul** (136 arquivos, +5020/−2177 linhas):
  - **DB migration**: Enum swaps (ModuleType, MemberStatus, PolarCategory, CalendarEventType, FormationType, NotificationType, UserRole para valores sem acento/limpos)
  - **Nova tabela `member_modules`**: Junction table substituindo campo único de módulo no member
  - **Nova tabela `calendar_notification_queue`**: Fila para notificações de mudanças no calendário
  - **Módulo finance/mensalidades removido**: Rota `/mensalidades`, tabela `invoices`, módulo `finance/` — tudo deletado
  - **Segurança**:
    - Fix JWE middleware bypass (migrou para `getToken` de `next-auth/jwt`)
    - `lib/cron-auth.ts`: autenticação Bearer compartilhada para todos os crons
    - HTML escaping em e-mails
    - CSP/Permissions-Policy/HSTS headers em `next.config.ts`
    - Multi-tenant isolation fix em study-hours
    - Email normalization antes de duplicate check
  - **Novos arquivos**: `lib/cron-auth.ts`, `lib/env.ts`, `next.config.ts`, `shared/components/pending-access-screen.tsx`
  - **Novo cron**: `/api/cron/calendar-notifications` (diário, lembretes de eventos)
  - **Novas features**: Confirmação de presença em atividades e formação de pais, notification pause toggle, campos de carona em atividades
  - **Schema**: Cascade deletes, Sex enum, book metadata + categories (LITERATURA, LEITURA_ESPIRITUAL, FORMACAO_HUMANA), activity ride fields, formation description
  - **Nova rota**: `/socios/historico`
  - **Crons migrados para Vercel**: `vercel.json` com 4 schedules (keep-alive, birthday, calendar, alerts)
- **Login fix** (6 commits):
  - Migrou de client-side `signIn` para server action
  - Fix `secureCookie` no `getToken` para HTTPS (Vercel)
  - Hard navigation em vez de `router.push` após login
  - Removeu debug logging temporário

### Concluído — Roadmap Completo
- [x] Banco de dados: Supabase/PostgreSQL + Prisma 7 + PrismaPg adapter
- [x] Autenticação: NextAuth.js v5 + JWT + RBAC + auto-registro
- [x] Middleware de tenant: isolamento por clubId em todas as queries
- [x] Server Actions + queries reais: 15 módulos com CRUD completo
- [x] Validação: Zod schemas + react-hook-form em 7+ módulos
- [x] Portal dos pais: Dashboard, Meus Filhos, Horas de Estudo, Atividades
- [x] E-mail + Notificações: Resend, envio manual/bulk, alertas automáticos com PDF, aniversários
- [x] Relatórios: 8 tipos com export PDF/Excel + preview + download do Manual
- [x] Assinatura eletrônica: E-signature separada da edição de sócio, tela bloqueante para pais com texto de autorização
- [x] Gestão de usuários: Auto-registro + gerenciamento de papéis por DIRETOR
- [x] Desacoplamento Parent/User: Link bi-direcional por e-mail, parentId no JWT, guardians
- [x] Mobile responsive: Layout card no mobile, bottom nav, responsive dialogs, PWA meta
- [x] Deploy: Vercel + GitHub CI/CD + Supabase keep-alive + 5 cron jobs
- [x] Segurança: CSP, HSTS, rate limiting, cron auth Bearer, HTML escaping, cascade deletes
- [x] Calendário: 63 eventos semestrais pré-carregados
- [x] Polares expandido: 12 categorias, 3 abas com RBAC, Outros Pontos com input customizado, G1 incluso/G2 opt-in/G3 excluído, reset anual via cron
- [x] Google Books API: Integração na biblioteca
- [x] Alertas automáticos: Cron com relatórios PDF anexados por role

### Sessão 20 (29/03/2026)
- **Login fix** (4 commits):
  - Fallback `redirect()` para Next.js 16 compat (signIn não redirecionava)
  - Fix `CallbackRouteError`: improved error handling com `isRedirectError()`
  - Migrou para `redirect: false` + client-side hard navigation (`window.location.href`)
  - Extraiu `cause.err.message` para exibir erros reais em vez de genérico
- **DriverAdapterError fix** (3 commits):
  - Configurou pg.Pool para serverless (`idleTimeoutMillis: 0`, `allowExitOnIdle`)
  - Migrou pg.Pool manual → `PrismaPg(PoolConfig)` (adapter gerencia pool internamente)
  - Migrou DATABASE_URL de port 5432 (session mode) → 6543 (transaction mode) para serverless
  - `pool.on("error")` handler para evitar crash de serverless function
- **Ficha de inscrição editável**: Nome, data nascimento, grupo e módulos agora editáveis (antes readOnly). Grupo via Select, módulos via checkboxes. Save action atualiza member record + enrollment JSON em transação
- **Transição G3 polares**:
  - Novo campo `polares_until` (date, nullable) na tabela `members`
  - Dialog ao mudar grupo para G3: "Manter participação nos polares até o final do ano?"
  - `excludeG3Filter()` helper centraliza lógica de exclusão G3 em 11 arquivos
  - `isExcludedFromPolares()` para checks imperativos (ex: return-book)
- **Horas de estudo**: MONITOR+ agora pode registrar horas (antes só pais). Form dialog agora exibe erros do servidor
- **Polares renomeado**: Categorias GERAL→OUTROS_PONTOS, LEILÃO removido

### Sessão 21 (30/03/2026)
- **Polares overhaul** (44 arquivos, +2135/−124 linhas):
  - G1 sempre participa, G2 agora opt-in (mesmo mecanismo que G3 usava), G3 totalmente excluído sem exceções
  - `excludeG3Filter()` → `excludeFromPolaresFilter()` (alias deprecated mantido). Atualizado em 8 arquivos consumidores
  - Dialog "Manter participação nos polares?" movido de G3 para G2 no enrollment form
  - `isExcludedFromPolares()` atualizado: G1 nunca, G2 sem polaresUntil, G3 sempre
  - Novo cron `/api/cron/reset-polares` (31/12 às 12h UTC) limpa todos `polaresUntil` via `vercel.json`
- **Separação member editing ↔ e-signature** (13 novos arquivos):
  - **Member editing** (MONITOR+): Novo `MemberEditForm` com apenas dados do sócio + pais. Sem assinatura, emergência ou autorizações
  - **Tabela de sócios**: Ícone Eye → SquarePen. Ficha column mostra badges view-only; "Assinada" abre `SignatureViewDialog` com imagem da assinatura
  - **Tela bloqueante de e-signature**: `ParentSignatureScreen` renderizado no layout quando pai (USUARIO com parentId) tem filhos sem assinatura. Sem botão "Assinar depois". Novo texto de autorização ("Compromisso entre os pais e o clube"). Sequencial por filho. Apenas um dos pais precisa assinar
  - Novos: `parent-signature-screen.tsx`, `save-parent-signature.ts`, `get-unsigned-children.ts`, `member-edit-form.tsx`, `save-member-edit.ts`, `member-edit-schema.ts`, `signature-view-dialog.tsx`
- **Atividades — auto-inscrição MONITOR+**:
  - MONITOR+ pode se inscrever em atividades via `MonitorActivityDialog` com botão "Inscrever-se"
  - Se também é pai, dropdown mostra a si mesmo + filhos
  - Novo campo `userId` em `ActivityRegistration` (migration + schema)
  - Badge "Equipe" na lista de participantes para registros de staff
  - Novos: `register-monitor-in-activity.ts`, `monitor-activity-dialog.tsx`, `get-monitor-activity-data.ts`
- **Atendimentos — campos de preceptoria restaurados**:
  - 4 campos re-adicionados: `purposes`, `goals`, `lifePlan`, `mainTopics` (migration + schema + form + detail)
  - Campos só aparecem para PRECEPTORIA_SOCIO e PRECEPTORIA_PAIS
  - Observações (notes) removido para tipo SACERDOTE
- **Telefone obrigatório no registro**: `phone` de opcional para `min(1)`, removido indicador "(opcional)"
- **Labels de grupo**: "Grupo 1/2/3" → "G1/G2/G3" em `GROUP_LABELS` e todos os textos hardcoded
- **Navbar alignment**: `SidebarSeparator` substituído por `border-b` no `SidebarHeader` (h-14) para alinhar com header da página
- **Dropdowns**: Larguras fixas (130–220px) substituídas por `w-auto` em 6 arquivos para evitar truncamento de texto

### Fase II (futuro)
- Agendamento de preceptoria com pais
- Controle de convidados e futuros sócios
- Notificações in-app
- Página de detalhe do sócio (`/socios/[id]`)
