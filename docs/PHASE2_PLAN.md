# Plano Fase 2 - Inversao do Fluxo de Onboarding

**Data:** 2026-04-13
**Branch:** `feat/invert-onboarding`

---

## Diagnostico do Estado Atual

### Banco de dados (verificado via Supabase MCP)

| Tabela | Registros | Observacoes |
|---|---|---|
| profiles | 16 | |
| organizations | 18 | |
| organization_memberships | 23 | |
| investors | 2 | "Investidor Principal" + "BM Consultoria e Assessoria" |
| investor_memberships | 2 | Ambas do mesmo user_id (21c0c22b...) |
| institutional_entities | 3 | Vinculadas a orgs diferentes |
| institutional_entity_invites | 2 | |
| organization_investor_links | 1 | BM Consultoria -> Instituto Semente Cidada (status ACTIVE) |
| projects | 62 | **TODOS com linked_entity_id = NULL e investor_id = NULL** |
| reports | 12 | |

### Descoberta critica: a tabela `organization_investor_links` ja funciona como invite + link

O codigo atual em `org-invite.actions.ts` **ja usa** `organization_investor_links` como mecanismo de convite:
- `createOrgInviteAction` cria registro com status `PENDING`, token UUID, e `expires_at` (+30 dias)
- `getOrgInviteByToken` busca por token pendente nao expirado
- `acceptOrgInviteAction` atualiza para `ACTIVE`, seta `organization_id` e `accepted_at`

A pagina `/accept-org-invite` ja renderiza formulario de aceite com token.
O dashboard do investor (`/dashboard/organizations`) ja tem formulario "Convidar organizacao".

### O que FALTA para completar a Fase 2

1. **Signup nao esta separado** - Hoje `/signup` e generico, cria apenas auth user, sem distinguir financiador vs organizacao
2. **Signup de financiador nao cria investor + investor_membership** - E feito manualmente
3. **Signup de organizacao nao exige token** - Qualquer um pode se cadastrar
4. **NewProjectForm puxa de `institutional_entities`** - Precisa puxar de `organization_investor_links` (financiadores que convidaram)
5. **Nao ha validacao de vinculo ativo na criacao de projeto** - Qualquer org cria projeto livremente
6. **Backfill:** 62 projetos existentes nao tem `linked_entity_id` nem `investor_id`, e 17 das 18 orgs nao tem link ativo com financiador
7. **Faltam acoes de revogar e reenviar convite**
8. **A tela de aceite exige usuario logado** - No novo fluxo, o aceite deve criar a conta (signup + aceite juntos)

---

## Decisao Arquitetural: Reusar `organization_investor_links` vs Criar tabelas novas

### Opcao A (Recomendada): Evoluir `organization_investor_links`

A tabela ja tem: `id, organization_id, investor_id, email, org_name, token, status, accepted_at, expires_at, created_by, created_at, updated_at`

**Vantagens:**
- Codigo de invite/aceite ja funciona (3 server actions + 2 paginas)
- RLS policies de `projects` e `organizations` ja referenciam esta tabela por nome
- Menos migracao, menos risco de quebra

**Ajustes necessarios:**
- Adicionar colunas: `revoked_at`, `accepted_by_user_id`, `organization_name` (o `org_name` ja existe)
- Adicionar status `REVOKED` e `EXPIRED` (atualmente so `PENDING` e `ACTIVE`)
- Manter retrocompatibilidade total

### Opcao B: Criar `financier_organization_invites` + `financier_organization_links` (conforme spec)

**Vantagens:**
- Separacao limpa: invite e link sao entidades distintas
- Mais proximo do que o spec pede

**Desvantagens:**
- Precisa reescrever 3 server actions, 2 paginas, e atualizar 4+ RLS policies
- Precisa migrar dados existentes entre tabelas
- Maior superficie de quebra

### Decisao: **Opcao A** - evoluir a tabela existente, a menos que voce prefira a Opcao B.

O nome `organization_investor_links` pode ser mantido (mudar nome de tabela quebraria RLS). Na pratica, esta tabela passa a funcionar como invite (status PENDING) e como link efetivo (status ACTIVE), que e exatamente o pattern ja implementado.

---

## Plano Detalhado por Etapa

### Etapa 1 - Migration SQL

**Arquivo:** aplicar via Supabase MCP (`apply_migration`)

#### 1.1 Evolucao de `organization_investor_links`

```sql
-- Novas colunas
ALTER TABLE organization_investor_links
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_user_id uuid REFERENCES profiles(id);

-- Indice para busca por token (ja existe? verificar)
CREATE INDEX IF NOT EXISTS idx_oil_token ON organization_investor_links(token);
CREATE INDEX IF NOT EXISTS idx_oil_investor_status ON organization_investor_links(investor_id, status);
CREATE INDEX IF NOT EXISTS idx_oil_org_status ON organization_investor_links(organization_id, status);
```

#### 1.2 RLS para tabela existente

A tabela ja tem RLS habilitado com 3 policies:
- `investor creates invites` (INSERT)
- `investor sees own links` (SELECT - so investor ve os seus)
- `authenticated updates links` (UPDATE)

**Ajuste necessario:** adicionar policy SELECT para que a **organizacao** tambem veja seus links ativos:

```sql
CREATE POLICY "org_sees_own_links"
  ON organization_investor_links
  FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organization_investor_links.organization_id
        AND om.user_id = auth.uid()
    )
  );
```

Tambem precisamos de uma policy para leitura por token (aceite de convite sem estar logado na org ainda):

```sql
CREATE POLICY "anyone_reads_by_token"
  ON organization_investor_links
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );
```

**Nota:** Dado que o padrao atual e permissivo (`authenticated USING(true)`), podemos simplificar com uma policy unica `authenticated` para SELECT. Isso alinha com o padrao do projeto e sera endurecido na fase de seguranca.

#### 1.3 Backfill de dados existentes

**Problema:** 62 projetos existentes em 7 organizacoes, nenhum com `linked_entity_id` ou `investor_id` setado. Apenas 1 link ativo existe (BM Consultoria -> Instituto Semente Cidada).

**Estrategia:**
1. Criar um investor "sistema" chamado `__LEGACY_SYSTEM__` (ou usar o "Investidor Principal" existente, id `c75f147e-...`)
2. Para cada organizacao que tenha projetos MAS nao tenha link ativo, criar um `organization_investor_links` com status `ACTIVE` apontando para o investor legado
3. Marcar esses links como `legacy = true` via coluna extra ou campo no token (ex: token fixo `00000000-...`)

```sql
-- Usar "Investidor Principal" como fallback legado
-- Orgs com projetos que NAO tem nenhum link ativo:
INSERT INTO organization_investor_links (investor_id, organization_id, status, accepted_at, created_at, email, org_name)
SELECT
  'c75f147e-e779-45a2-981e-455fcfe2ca32'::uuid,  -- Investidor Principal
  p.organization_id,
  'ACTIVE',
  now(),
  now(),
  o.email,
  o.name
FROM (SELECT DISTINCT organization_id FROM projects) p
JOIN organizations o ON o.id = p.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM organization_investor_links oil
  WHERE oil.organization_id = p.organization_id
    AND oil.status = 'ACTIVE'
);
```

Isso garante que **todas as 7 orgs com projetos** tenham pelo menos 1 link ativo -> projetos existentes nao ficam orfaos.

#### 1.4 Verificacao de sanidade (rodar apos migration)

```sql
-- Todo projeto deve ter pelo menos 1 link ativo na sua org
SELECT p.id, p.organization_id, o.name,
  EXISTS (
    SELECT 1 FROM organization_investor_links oil
    WHERE oil.organization_id = p.organization_id AND oil.status = 'ACTIVE'
  ) as has_active_link
FROM projects p
JOIN organizations o ON o.id = p.organization_id;
-- Esperado: TODOS com has_active_link = true
```

---

### Etapa 2 - Services novos

#### 2.1 `services/financier-invites.service.ts` (novo)

Funcoes:
- `listInvitesForInvestor(investorId: string)` - lista convites enviados por um financiador
- `getInviteByToken(token: string)` - busca convite por token (validando status e expiracao)
- `createInvite(investorId, email, orgName, createdBy)` - cria convite PENDING com token + expires_at 30 dias
- `revokeInvite(inviteId, userId)` - marca status REVOKED + revoked_at
- `acceptInvite(token, orgId, userId)` - marca ACTIVE + organization_id + accepted_at + accepted_by_user_id

**Tabela usada:** `organization_investor_links`

#### 2.2 `services/financier-organization-links.service.ts` (novo)

Funcoes:
- `getActiveLinksForOrganization(organizationId: string)` - retorna links ACTIVE com dados do investor (nome, id)
- `getActiveLinksForInvestor(investorId: string)` - retorna links ACTIVE com dados da org
- `hasActiveLink(organizationId: string)` - boolean, verifica se org tem ao menos 1 link ativo
- `deactivateLink(linkId, userId)` - desativa vinculo (futuro, nao obrigatorio agora)

**Tabela usada:** `organization_investor_links`

---

### Etapa 3 - Server Actions

#### 3.1 `app/actions/financier-invites.actions.ts` (novo)

| Action | Descricao |
|---|---|
| `inviteOrganizationAction(formData)` | Investor cria convite. Substitui/evolui `createOrgInviteAction` |
| `revokeInviteAction(formData)` | Investor revoga convite pendente |
| `resendInviteAction(formData)` | Revoga o antigo + cria novo com novo token e nova expiracao |
| `acceptFinancierInviteAction(formData)` | Aceite completo: cria auth user + org + membership + link ACTIVE. Evolui `acceptOrgInviteAction` |

**Nota:** `createOrgInviteAction` e `acceptOrgInviteAction` em `org-invite.actions.ts` serao mantidos funcionando (periodo de transicao) mas o codigo novo apontara para as novas actions.

#### 3.2 `app/actions/auth.actions.ts` (editar)

| Mudanca | Descricao |
|---|---|
| `signUpFinanciadorAction(formData)` | Nova. Cria auth user + investor + investor_membership (MASTER). Redireciona para /dashboard |
| `signUpOrganizacaoAction(formData)` | Nova. Valida token de convite, cria auth user + org + membership + ativa link. Redireciona para /dashboard |
| `signUpAction` | Mantida como esta (retrocompatibilidade) mas a UI nao vai mais apontar para ela |

---

### Etapa 4 - Telas do Financiador (painel de organizacoes convidadas)

#### 4.1 `app/dashboard/organizations/page.tsx` (editar)

Ja tem o formulario de convite para INVESTOR. Adicionar:

- **Listagem de convites pendentes** com status (Pendente / Aceito / Expirado / Revogado), data de criacao, data de expiracao
- **Botao "Revogar"** em cada convite pendente (chama `revokeInviteAction`)
- **Botao "Reenviar"** em cada convite pendente (chama `resendInviteAction`)
- **Link direto de aceite** visivel pro financiador copiar

**Dados:** chamar `listInvitesForInvestor(investorId)` no server component

#### 4.2 Nenhum novo arquivo de pagina necessario

O painel do investor ja existe em `/dashboard/organizations`. So precisa enriquecer.

---

### Etapa 5 - Tela de aceite de convite

#### 5.1 `app/accept-financier-invite/page.tsx` (novo)

**Rota:** `/accept-financier-invite?token=xxx`

**Comportamento:**
1. Valida token (pendente, nao expirado)
2. Se token invalido: mensagem de erro + link para login
3. Se token valido: mostra nome do financiador (buscar investor.name via investor_id do convite) + nome sugerido da org
4. Formulario: nome completo, email, senha, nome da organizacao (pre-preenchido)
5. Ao submeter (`acceptFinancierInviteAction`):
   - Cria auth user via `supabase.auth.signUp`
   - Cria profile
   - Cria organization
   - Cria organization_membership (ORG_ADMIN)
   - Atualiza `organization_investor_links`: status ACTIVE, organization_id, accepted_at, accepted_by_user_id
   - Redireciona para `/login?success=...`

#### 5.2 `app/accept-org-invite/page.tsx` (manter)

Manter funcionando para retrocompatibilidade. Adicionar banner: "Este fluxo sera descontinuado. Novos convites usam /accept-financier-invite."

---

### Etapa 6 - Ajuste de Signup

#### 6.1 `app/signup/page.tsx` (reescrever)

Transformar em tela de selecao com 2 cards:

- **"Sou financiador / empresa"** -> Link para `/signup/financiador`
- **"Recebi um convite para cadastrar minha organizacao"** -> Link para `/signup/organizacao` (ou campo para colar o token)

#### 6.2 `app/signup/financiador/page.tsx` (novo)

Formulario:
- Nome completo
- Email
- Senha
- Nome da empresa/financiador
- CNPJ (opcional)

Action: `signUpFinanciadorAction`
- `supabase.auth.signUp({ email, password })`
- Insert em `profiles` (full_name)
- Insert em `investors` (name, document)
- Insert em `investor_memberships` (user_id, investor_id, role: MASTER)
- Redirect `/login?success=Cadastro criado. Faca login.`

#### 6.3 `app/signup/organizacao/page.tsx` (novo)

**Se acessado SEM token:** Mensagem bloqueio: "Organizacoes so entram por convite de um financiador. Se voce recebeu um convite, use o link enviado por e-mail."

**Se acessado COM token (`?token=xxx`):** Redireciona para `/accept-financier-invite?token=xxx`

---

### Etapa 7 - Ajuste de NewProjectForm

#### 7.1 `app/dashboard/projects/new/page.tsx` (editar)

**Antes:** busca `institutional_entities` para as orgs do usuario.
**Depois:** busca `organization_investor_links` com status ACTIVE para as orgs do usuario.

Mudancas:
1. Substituir chamada `listInstitutionalEntitiesForOrganizations(orgIds)` por `getActiveLinksForOrganizations(orgIds)` (novo service)
2. O dropdown "Financiador vinculado" mostra os investors dos links ativos (nome do investor, nao da entity)
3. O `linked_entity_id` do formulario agora recebe o **id do link** ou o **investor_id** — DECISAO: manter `linked_entity_id` apontando para o `investor_id` do link, ou apontar para o `id` do link? 

**Recomendacao:** Continuar setando `linked_entity_id` com o `id` da `institutional_entity` correspondente se existir, OU (mais simples) setar `investor_id` no projeto diretamente com o investor_id do link. O campo `linked_entity_id` fica opcional pra retrocompatibilidade.

**Na pratica:**
- O campo `investor_id` do projeto passa a ser obrigatorio (preenchido com o investor do link ativo)
- `linked_entity_id` se torna opcional (legado)
- `linked_entity_name` e `linked_entity_type` sao preenchidos automaticamente com dados do investor

4. **Validacao server-side:** `createProjectAction` valida que existe `organization_investor_links` com status ACTIVE para aquela org antes de criar o projeto

5. **Validacao client-side:** Se `filteredLinks.length === 0`, mostra:
   "Sua organizacao ainda nao tem financiador ativo. Aguarde convite de um financiador."

#### 7.2 `NewProjectForm.tsx` (editar)

- Renomear props: `entities` -> `financierLinks` (ou manter generico)
- Ajustar tipo: em vez de `EntityOption` com `entity_type`, usar `LinkOption` com `investor_name`
- O resto do form continua igual (select, onChange, etc)

---

### Etapa 8 - Compatibilidade com fluxo antigo

**Principio:** O fluxo antigo de `institutional_entities` / `institutional_entity_invites` continua funcionando. Nenhum arquivo desse fluxo e deletado.

| Arquivo | Acao |
|---|---|
| `services/institutional-entities.service.ts` | Manter intacto |
| `services/institutional-entity-invites.service.ts` | Manter intacto |
| `app/actions/institutional-entities.actions.ts` | Manter intacto |
| `app/actions/institutional-entity-invites.actions.ts` | Manter intacto |
| `app/accept-entity-invite/` | Manter intacto |
| `app/actions/org-invite.actions.ts` | Manter intacto (periodo de transicao) |
| `app/accept-org-invite/` | Manter intacto (periodo de transicao) |
| `app/dashboard/entities/page.tsx` | Manter intacto |

---

### Etapa 9 - Teste Manual Documentado

#### Fluxo ponta a ponta:

1. Acessar `/signup` -> ver tela de selecao
2. Clicar "Sou financiador" -> ir para `/signup/financiador`
3. Preencher dados -> criar conta de financiador
4. Login -> acessar dashboard vazio de investor
5. Ir em "Organizacoes" -> formulario de convite
6. Preencher email + nome org -> gerar convite -> copiar link
7. Abrir link em janela anonima -> `/accept-financier-invite?token=xxx`
8. Preencher dados da org + usuario -> criar conta
9. Login como org_admin -> dashboard de ORG
10. Ir em "Novo projeto" -> ver dropdown com financiador que convidou
11. Criar projeto com sucesso
12. **Teste negativo:** Criar outra org SEM link ativo -> tentar criar projeto -> deve bloquear
13. **Teste legado:** Verificar que os 62 projetos existentes continuam acessiveis
14. `npm run build` passa sem erro

---

### Etapa 10 - Atualizar README

Adicionar secao "Fluxo de Onboarding (Fase 2)" descrevendo:
- Financiador se cadastra livremente
- Financiador convida organizacao
- Organizacao aceita e cria conta vinculada
- Organizacao cria projetos vinculados ao financiador

---

## Inventario de Arquivos

### Arquivos NOVOS a criar

| Arquivo | Descricao |
|---|---|
| `services/financier-invites.service.ts` | Service de convites de financiador |
| `services/financier-organization-links.service.ts` | Service de vinculos financiador<->org |
| `app/actions/financier-invites.actions.ts` | Server actions de invite/revoke/resend/accept |
| `app/signup/financiador/page.tsx` | Tela de signup para financiador |
| `app/signup/organizacao/page.tsx` | Tela de signup para org (bloqueio sem token / redirect com token) |
| `app/accept-financier-invite/page.tsx` | Tela de aceite de convite (com criacao de conta) |

### Arquivos EXISTENTES a editar

| Arquivo | Mudanca |
|---|---|
| `app/signup/page.tsx` | Reescrever como tela de selecao (2 caminhos) |
| `app/actions/auth.actions.ts` | Adicionar `signUpFinanciadorAction` e `signUpOrganizacaoAction` |
| `app/dashboard/projects/new/page.tsx` | Trocar source de entities para links ativos |
| `app/dashboard/projects/new/NewProjectForm.tsx` | Ajustar props e dropdown para financier links |
| `app/dashboard/organizations/page.tsx` | Adicionar listagem de convites + botoes revogar/reenviar |
| `app/actions/project.actions.ts` | Adicionar validacao de vinculo ativo |

### Arquivos que NAO serao tocados

- Todos os services/actions de `institutional_entities`, `institutional_entity_invites`
- `app/accept-entity-invite/`, `app/accept-org-invite/`
- `services/reports.service.ts`, `services/report-financial.service.ts`
- VIEW `report_financial_summary`
- `middleware.ts` (nao precisa mudar - as novas rotas sao publicas fora do /dashboard)
- `components/dashboard/DashboardInvestor.tsx`, `DashboardOrg.tsx` (sem mudanca funcional)

---

## Perguntas Abertas (preciso da sua decisao)

### P1: Opcao A vs B para tabelas
Confirma que podemos evoluir `organization_investor_links` (Opcao A) em vez de criar tabelas novas? Isso preserva RLS existente e reduz risco.

### P2: Campo `investor_id` vs `linked_entity_id` nos projetos
Os 62 projetos existentes tem `linked_entity_id = NULL`. No novo fluxo, ao criar projeto, devemos:
- (a) Setar `investor_id` com o investor do link ativo (mais limpo, semanticamente correto)
- (b) Criar uma `institutional_entity` automaticamente pro investor e setar `linked_entity_id` (retrocompativel mas complexo)
- (c) Setar ambos: `investor_id` + `linked_entity_id` se a entity existir

**Recomendacao:** Opcao (a) - usar `investor_id` direto. O campo `linked_entity_id` fica legado.

### P3: Envio de e-mail real
O sistema atual nao envia e-mail de convite - apenas gera o link para o financiador copiar e enviar manualmente. Manter assim ou implementar envio via Supabase Auth / Resend / outro?

### P4: Investor "Investidor Principal" como legado
Para o backfill, posso usar o investor existente `c75f147e-...` ("Investidor Principal") como financiador-sistema para os links legados? Ou preferir criar um investor especifico `__SISTEMA__`?

---

## Ordem de Execucao (com pausas para revisao)

| # | Entrega | Pausa? |
|---|---|---|
| 1 | Este plano (voce esta aqui) | SIM - aguardo aprovacao |
| 2 | Migration SQL (ALTER TABLE + backfill + RLS) | SIM - confirmo com SELECTs |
| 3 | Services novos | NAO - sigo direto |
| 4 | Server actions | SIM - revisao rapida |
| 5 | Telas do financiador (painel de convites) | NAO - sigo direto |
| 6 | Tela de aceite `/accept-financier-invite` | NAO - sigo direto |
| 7 | Ajuste de signup (3 paginas) | SIM - revisao do fluxo |
| 8 | Ajuste de NewProjectForm | SIM - ponto critico |
| 9 | Teste manual documentado | SIM - executo e documento |
| 10 | README atualizado | NAO - faco junto |
