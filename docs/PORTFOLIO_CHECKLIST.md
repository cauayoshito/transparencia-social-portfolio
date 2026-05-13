# Checklist de envio para portfólio

Use esta lista antes de enviar o repositório para uma vaga.

---

## Repositório GitHub

- [ ] Repositório criado (público ou com acesso ao recrutador)
- [ ] Nome do repositório claro: ex. `transparencia-social` ou `phi-management`
- [ ] Descrição do repositório preenchida no GitHub (campo "About")
  - Sugestão: *"Plataforma de gestão de projetos sociais com prestação de contas — Next.js 14, Supabase, TypeScript"*
- [ ] Topics adicionados: `nextjs`, `supabase`, `typescript`, `tailwindcss`, `social-impact`
- [ ] Branch principal (`main`) atualizada com todos os arquivos

## README

- [ ] Lido e revisado — nenhuma referência interna ou dado sensível exposto
- [ ] Screenshots adicionadas em `docs/screenshots/` e referenciadas no README
  - Veja o guia em [`docs/screenshots/README.md`](screenshots/README.md)
- [ ] Link de demo ao vivo (se fizer deploy) adicionado no topo do README
- [ ] Link de demo incluído no campo "Website" do repositório no GitHub

## Segurança — antes de publicar

- [ ] Arquivo `.env.local` está no `.gitignore` (já está — confirmar)
- [ ] Nenhuma chave de API, service role key ou senha no histórico de commits
  - Rodar `git log -p | grep -i "supabase\|service_role\|password\|secret"` para verificar
- [ ] Nenhum dado real de usuários ou organizações no banco de desenvolvimento

## Deploy (opcional mas recomendado)

- [ ] Projeto deployado na Vercel ou outra plataforma
- [ ] Variáveis de ambiente configuradas no painel da plataforma
- [ ] URL de produção configurada no Supabase Auth (Site URL + Redirect URLs)
- [ ] `npm run build` passa sem erros

## Para o currículo / candidatura

- [ ] URL do repositório no currículo
- [ ] 2–3 bullets descrevendo o projeto (ex. abaixo):
  - *Desenvolvi plataforma full-stack com Next.js 14 App Router e Supabase para gestão de projetos sociais com múltiplos perfis de acesso (Organização, Financiador, Consultor)*
  - *Implementei Row Level Security (RLS) no Supabase com 20+ migrations e fluxo de onboarding por token de convite*
  - *Utilizei Server Components e Server Actions para formulários com validação server-side e upload de documentos*

---

## Itens que dependem só de você

Estes itens não foram feitos automaticamente e precisam de ação manual:

1. **Screenshots** — tire prints do app rodando e coloque em `docs/screenshots/`
2. **Deploy** — suba na Vercel e adicione a URL no README e no GitHub
3. **Dados de demo** — crie dados de exemplo (organizações, projetos, relatórios) para o recrutador explorar
4. **Descrição e topics no GitHub** — preencha no painel do repositório após o push
