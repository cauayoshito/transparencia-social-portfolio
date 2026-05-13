# Transparência Social

Plataforma web para gestão de projetos sociais com prestação de contas estruturada entre organizações e financiadores.

Desenvolvida em Next.js 14 (App Router) com Supabase como backend — autenticação, banco de dados PostgreSQL e armazenamento de arquivos.

---

## Demonstração

> **Screenshots:** veja [`docs/screenshots/`](docs/screenshots/) para capturas de tela das principais telas.  
> **Diagrama de fluxo:** [`docs/diagrams/fluxo-transparencia-social.mermaid`](docs/diagrams/fluxo-transparencia-social.mermaid)

---

## Funcionalidades

### Gestão de projetos
- Criação de projetos com objetivos, marcos e orçamento
- Abas separadas para Plano, Financeiro, Documentos e Relatórios
- Guard de alterações não salvas ao trocar de aba

### Relatórios e prestação de contas
- Templates de relatório por tipo de projeto (Incentivado, Recursos Públicos, Recursos Próprios)
- Seções configuráveis com campos preenchíveis
- Resumo financeiro consolidado por projeto
- Upload de documentos com tipo e descrição (Declaração, Certidão, etc.)

### Multi-papéis com controle de acesso
| Papel | Acesso |
|-------|--------|
| **Organização** | Gerencia seus próprios projetos e relatórios |
| **Financiador** | Visualiza projetos e relatórios das organizações vinculadas |
| **Consultor** | Acesso de leitura a projetos onde foi adicionado |

### Onboarding por convite (Fase 2)
- Financiador convida organização por e-mail com token de aceite
- Organização cria conta já vinculada ao financiador via link seguro
- Projetos exigem vínculo ativo para serem criados

### Segurança
- Row Level Security (RLS) no Supabase em todas as tabelas
- Middleware de autenticação protegendo rotas do dashboard
- Service Role isolado em server actions — nunca exposto ao cliente
- 20+ migrations documentando evolução incremental do schema

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 — App Router, Server Components, Server Actions |
| Linguagem | TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Estilo | Tailwind CSS |
| Ícones | Lucide React |
| Deploy | Vercel (recomendado) |

---

## Estrutura do projeto

```
app/
├── dashboard/
│   ├── projects/         # Listagem, criação e detalhe de projetos
│   ├── reports/          # Relatórios por organização
│   ├── organizations/    # Gestão de organizações e convites (Financiador)
│   └── entities/         # Entidades institucionais (Fase 1)
├── signup/               # Seleção de perfil: Financiador ou Organização
├── accept-financier-invite/  # Aceite de convite com criação de conta
└── actions/              # Server Actions (auth, projetos, relatórios, convites)

components/
├── dashboard/            # DashboardOrg, DashboardInvestor, DashboardConsultor
├── projects/             # Formulários e visualizações de projeto
├── reports/              # Editor e visualização de relatórios
└── ui/                   # Componentes reutilizáveis

services/                 # Camada de acesso ao banco (por domínio)
supabase/migrations/      # 20+ migrations — histórico completo do schema
lib/supabase/             # Clients: browser, server, admin (service role)
types/                    # Types TypeScript compartilhados
```

---

## Rodando localmente

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com) com projeto criado

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

As chaves estão em **Supabase Dashboard → Settings → API**.

> `SUPABASE_SERVICE_ROLE_KEY` é usado apenas em server actions e nunca exposto ao cliente.

### 3. Aplicar o schema

Execute as migrations na ordem no **SQL Editor do Supabase** ou via CLI:

```bash
supabase db push
```

O schema base está em [`docs/database/schema.sql`](docs/database/schema.sql).

### 4. Configurar Auth

Em **Supabase → Auth → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000`, `http://localhost:3000/*`

### 5. Iniciar o servidor

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Fluxo de onboarding

```
1. Financiador acessa /signup/financiador → cria conta
2. Financiador convida organização em /dashboard/organizations
   → gera token com validade de 30 dias
3. Financiador envia o link /accept-financier-invite?token=<uuid>
4. Organização acessa o link → cria conta já vinculada ao financiador
5. Organização acessa /dashboard/projects/new → cria projeto
   (exige vínculo ativo com financiador)
```

Detalhes de arquitetura em [`docs/PHASE2_PLAN.md`](docs/PHASE2_PLAN.md).

---

## Documentação adicional

| Arquivo | Conteúdo |
|---------|----------|
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Histórico de correções do MVP |
| [`docs/PHASE2_PLAN.md`](docs/PHASE2_PLAN.md) | Plano e decisões arquiteturais da Fase 2 |
| [`docs/diagrams/`](docs/diagrams/) | Diagramas de fluxo (Mermaid + HTML interativo) |
| [`docs/assets/`](docs/assets/) | Apresentação de entrega e auditoria técnica |
| [`supabase/migrations/`](supabase/migrations/) | Histórico completo de migrations |
