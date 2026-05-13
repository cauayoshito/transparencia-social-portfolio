# CHANGELOG — MVP Fix (Fase 1)
**Data:** 22/03/2026

---

## Arquivos alterados

### Ponto 1 + 2: Consultor e Investidor veem projetos/relatórios

**`services/projects.service.ts`**
- **NOVA função** `getInvestorOrgIds(userId)` — resolve org IDs acessíveis ao investidor via cadeia `investor_memberships → organization_investor_links`
- **ALTERADA** `listProjectsForUser()` — adicionado Path 3 (investidor): busca projetos das organizações vinculadas ao investidor
- **ALTERADA** `getProjectByIdForUser()` — adicionado Path 3 (investidor): verifica se a org do projeto está vinculada ao investidor

**`services/reports.service.ts`**
- **ALTERADA** `listReportsForUser()` — agora filtra relatórios apenas de projetos acessíveis ao usuário (usa `listProjectsForUser` internamente), em vez de retornar TODOS os relatórios do banco
- **ALTERADO** import — adicionado `listProjectsForUser`

**Resultado:** Investidor vê projetos + relatórios das organizações vinculadas. Consultor continua acessando via `project_consultants`. ORG mantém acesso via `project_memberships`.

---

### Ponto 3: Dados não se perdem ao trocar de aba

**`components/projects/UnsavedChangesGuard.tsx`** (NOVO)
- Client component que monitora alterações em forms
- Intercepta `beforeunload` (fechar/atualizar aba)
- Intercepta clicks em links de aba (`?tab=...`)
- Exibe `confirm()` se há alterações não salvas
- Reset automático no `submit` do form

**`app/dashboard/projects/[id]/page.tsx`**
- **ADICIONADO** import de `UnsavedChangesGuard`
- **ALTERADO** conteúdo das abas envolto pelo guard

---

### Ponto 4: Documentos — novos tipos + campo descrição

**`components/projects/ProjectDocuments.tsx`**
- **ADICIONADOS** tipos: `DECLARACAO`, `CERTIDAO`, `OUTRO` ao array `DOC_TYPES`
- **ADICIONADO** campo `document_type` ao type `DocRow`
- **ADICIONADO** state `docDescription` + input de texto "Nome / Descrição do documento"
- **ADICIONADO** envio de `doc_description` no FormData do upload
- **ALTERADA** listagem mobile: exibe descrição quando presente
- **ALTERADA** tabela desktop: nova coluna "Descrição"

**`app/actions/project-documents.actions.ts`**
- **ALTERADO** `listProjectDocumentsAction` — incluído `document_type` no SELECT
- **ALTERADO** `uploadProjectDocumentAction` — extrai `doc_description` do FormData e grava em `document_type`

---

### Ponto 5: Template base de relatório

**`supabase/migrations/202603220001_seed_report_templates.sql`** (NOVO)
- Seed para 3 templates (INCENTIVADO, RECURSOS_PUBLICOS, RECURSOS_PROPRIOS)
- Cada template com 4 seções:
  1. Identificação do Projeto (3 campos)
  2. Atividades Realizadas no Período (3 campos)
  3. Resultados e Indicadores (3 campos)
  4. Observações Gerais (2 campos)
- Total: ~11 campos por template
- Idempotente: só insere se não existe template ativo para o tipo

**Para aplicar:** Execute no Supabase SQL Editor ou via `supabase db push`.

---

## Como testar

1. **Investidor:** Faça login com perfil investidor → Dashboard deve mostrar projetos das organizações vinculadas → Clicar em projeto deve abrir detalhes → Aba Relatórios deve listar relatórios existentes

2. **Consultor:** Faça login com perfil consultor → Projetos onde foi adicionado via `project_consultants` devem aparecer → Abas Plano/Financeiro/Documentos devem carregar dados (modo leitura)

3. **Documentos:** Abrir projeto como ORG → Aba Documentos → Verificar tipos Declaração/Certidão no select → Preencher descrição → Upload → Verificar descrição na listagem

4. **Guard de dados:** Abrir projeto como ORG → Aba Plano → Digitar algo no objetivo → Clicar em outra aba → Deve aparecer aviso "Você tem alterações não salvas"

5. **Template relatório:** Executar migration → Criar relatório em qualquer projeto → Clicar "Editar" → Formulário deve mostrar 4 seções com campos preenchíveis
