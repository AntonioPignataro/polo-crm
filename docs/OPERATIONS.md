# Sistema Polo — Guia de operação (pt-BR)

Sistema de gestão para clubes educacionais infantis/juvenis. Gerencia sócios, preceptores, presença, sistema de pontuação (polares), biblioteca, atendimentos, atividades, formação de pais, horas de estudo e financeiro.


## Stack

- **Next.js 16** (App Router + Turbopack) + React 19 + TypeScript
- **Prisma 7** + PostgreSQL (Supabase, região São Paulo) · Supabase Storage para documentos
- **NextAuth.js v5** (JWT + RBAC) · multi-tenant por subdomínio (`<clube>.sistemapolo.com`)
- **Tailwind CSS v4** + shadcn/ui
- **Resend** (e-mail transacional)
- **jsPDF** + **ExcelJS** (exportação de relatórios)

## Primeiros Passos

### Pré-requisitos

- Node.js 20+
- Um projeto Supabase free próprio para dev (ou um PostgreSQL local) — nunca aponte o `.env.local` para o banco de prod

### Instalação

```bash
git clone <url-deste-repositório>
cd sistema-polo
npm install
```

### Variáveis de Ambiente

Crie `.env.local` (nunca commitado — `.gitignore` cobre `.env*`):

```env
DATABASE_URL="postgresql://..."      # pooler do Supabase, porta 6543 (transaction mode)
AUTH_SECRET="..."
CRON_SECRET="..."
SUPABASE_SERVICE_ROLE_KEY="..."      # Storage (bucket "documentos")
RESEND_API_KEY="re_..."              # opcional: sem ele, e-mails são só logados no console
RESEND_FROM_EMAIL="..."              # opcional
```

### Banco de Dados

O Prisma CLI **não** lê `.env.local` e as migrations precisam da porta **5432** (session mode), não da 6543:

```bash
npx prisma generate
DATABASE_URL="postgresql://...:5432/postgres" npx prisma migrate dev
npm run db:seed                    # Dados de teste
npx tsx prisma/seed-calendar.ts    # Eventos do calendário
```

### Rodar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Fora de `*.sistemapolo.com` (localhost, `*.vercel.app`) o sistema usa o primeiro clube ativo.

**Credenciais de teste (seed):** `diretor@polo.com` / `admin123`

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Sócios | Cadastro completo com ficha de inscrição digital e assinatura |
| Presença | Chamada por sessão com relatório de frequência |
| Polares | Sistema de pontuação com 9 categorias e ranking |
| Biblioteca | Catálogo de livros com empréstimos |
| Atendimentos | Preceptoria + fila do sacerdote |
| Atividades | Inscrições, custos, status |
| Formação de Pais | Controle de presença nas formações |
| Horas de Estudo | Registro bimestral com metas |
| Financeiro | Mensalidades com status de pagamento |
| Calendário | Grade mensal com eventos semestrais |
| Documentos | Arquivos compartilhados com pais (Supabase Storage) |
| Notificações | E-mail: alertas, lembretes, aniversários |
| Relatórios | Preview, export PDF e Excel |
| Usuários | Auto-registro, gestão de papéis (RBAC), recuperação de senha |

## Produção e Operação

### Serviços

| Serviço | Uso | Detalhe |
|---------|-----|---------|
| GitHub | Código | `sistemapolo/sistema-polo` — branch `main` = produção |
| Vercel | Hosting, deploy e crons | Projeto `sistema-polo` (plano Hobby); deploy automático a cada push no `main` |
| Supabase | Banco + Storage | Prod `<PROD_PROJECT_REF>` (plano free); dev em projeto separado |
| Cloudflare | Domínio `sistemapolo.com` (registro + DNS) | Wildcard `*.sistemapolo.com` → Vercel; registros do Resend |
| Resend | E-mail | Remetente verificado em `sistemapolo.com` |

As variáveis de ambiente ficam no painel da Vercel, separadas por ambiente: **Production** (branch `main`) aponta para o banco de prod; **Preview** (demais branches) deve apontar para o banco de dev — ao criar um banco de dev novo, atualize o `DATABASE_URL` de Preview. As crons estão em `vercel.json` e autenticam com `CRON_SECRET`.

### Deploy

1. Rode `npx next build` localmente antes de subir — `tsc`/`eslint` não pegam erros de assets/build.
2. `git push` para `main` do repositório `sistemapolo/sistema-polo`.

⚠️ **Plano Hobby da Vercel:** só é publicado o commit cujo **autor** tem acesso ao projeto na Vercel (hoje, o usuário GitHub `sistemapolo`). Commit com outro autor fica `BLOCKED`. Para liberar outros autores, é preciso o plano Pro. Para corrigir o último commit: `git commit --amend --reset-author --no-edit`.

### Migrations em produção

```bash
DATABASE_URL="<URL de prod, porta 5432>" npx prisma migrate deploy
```

Se o Prisma retornar `P1001` (falha intermitente de rede via IPv6), aplique o `migration.sql` via `psql` numa transação e registre a linha em `_prisma_migrations` (checksum = `sha256` do `migration.sql`).

### Novo clube (tenant)

1. Crie o registro em `clubs` no banco de prod com o `slug` desejado.
2. Registre `<slug>.sistemapolo.com` no projeto da Vercel (Settings → Domains, ou `POST /v10/projects/{id}/domains`) para emitir o certificado SSL. O DNS já é coberto pelo wildcard da Cloudflare.
3. Em ~1 min, `https://<slug>.sistemapolo.com` deve redirecionar para `/login`.

### Observações

- O Supabase free pausa projetos sem uso após ~7 dias (basta "Restore" no painel). O de prod fica ativo pela cron `keep-alive`.
- O domínio `sistemapolo.com` é renovado anualmente na Cloudflare (vence em maio). Se expirar, o sistema e os e-mails param.
- `scripts/git-ops.sh` executa comandos git com um token lido de `.env.ops` (opcional; útil para não logar o GitHub globalmente na máquina).

## Documentação

Consulte [`CLAUDE.md`](../CLAUDE.md) para documentação técnica detalhada, incluindo schema do banco, estrutura de arquivos, decisões arquiteturais e histórico de desenvolvimento.
