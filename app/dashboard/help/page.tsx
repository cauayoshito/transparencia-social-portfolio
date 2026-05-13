import Link from "next/link";

export const dynamic = "force-dynamic";

function statusClass(color: "slate" | "amber" | "blue" | "emerald" | "rose") {
  if (color === "slate") return "border-slate-200 bg-slate-50 text-slate-700";
  if (color === "amber") return "border-amber-200 bg-amber-50 text-amber-700";
  if (color === "blue") return "border-blue-200 bg-blue-50 text-blue-700";
  if (color === "emerald")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
      {label}
    </span>
  );
}

function HelpCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  const isAnchor = href.startsWith("#");

  return (
    <Link
      href={href}
      scroll={!isAnchor}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 transition group-hover:text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition group-hover:border-slate-300 group-hover:text-slate-700">
          →
        </span>
      </div>
    </Link>
  );
}

function ModuleCard({
  title,
  description,
  highlight,
}: {
  title: string;
  description: string;
  highlight: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {highlight}
      </p>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900 focus:outline-none">
        <span>{question}</span>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-500 transition group-open:rotate-45 group-open:text-slate-700">
          +
        </span>
      </summary>
      <p className="mt-3 pr-8 text-sm leading-6 text-slate-600">{answer}</p>
    </details>
  );
}

function QuickCheckCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 text-slate-400">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <SectionBadge label="Central de orientação" />

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Central de Ajuda
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Encontre orientações rápidas para usar o sistema com mais clareza,
            entender o fluxo das etapas e resolver dúvidas comuns sem atrito.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              Organizações
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              Projetos
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              Relatórios
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              Documentos
            </span>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Voltar ao dashboard
        </Link>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-slate-900">
            Use a Transparência Social com mais clareza e menos retrabalho
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Esta página reúne os principais fluxos do sistema para facilitar o
            uso da plataforma no dia a dia. Aqui você encontra a sequência mais
            recomendada de operação, o papel de cada módulo e soluções rápidas
            para dúvidas frequentes.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <HelpCard
            title="Começar pelo fluxo ideal"
            description="Veja a sequência mais recomendada para iniciar o uso do sistema sem travar."
            href="#primeiros-passos"
          />
          <HelpCard
            title="Entender status e andamento"
            description="Saiba como funcionam os fluxos de projetos e relatórios em cada etapa."
            href="#fluxos"
          />
          <HelpCard
            title="Ver soluções rápidas"
            description="Consulte respostas objetivas para login, upload, permissões e relatórios."
            href="#problemas"
          />
        </div>
      </section>

      <section
        id="primeiros-passos"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Primeiros passos
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Esta é a ordem mais recomendada para operar a Transparência Social com
          segurança e fluidez.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            "Crie ou acesse uma organização.",
            "Preencha os dados institucionais da organização.",
            "Envie os documentos obrigatórios.",
            "Cadastre um projeto.",
            "Complete as abas de plano, financeiro, documentos e relatórios do projeto.",
            "Crie e envie os relatórios vinculados ao projeto.",
          ].map((item, index) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Como funciona cada módulo
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Uma visão rápida do papel de cada área dentro do sistema.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            title="Organizações"
            description="Cadastre dados da organização, membros e documentos obrigatórios."
            highlight="Dados da organização"
          />

          <ModuleCard
            title="Projetos"
            description="Crie projetos, acompanhe o status e complete as abas de plano, financeiro, documentos e relatórios."
            highlight="Acompanhamento do processo"
          />

          <ModuleCard
            title="Relatórios"
            description="Gere relatórios por período, registre conteúdo, envie evidências e acompanhe o envio."
            highlight="Prestação de informações"
          />

          <ModuleCard
            title="Documentos"
            description="Faça upload dos arquivos exigidos, acompanhe pendências e confira a validade dos documentos."
            highlight="Controle documental"
          />
        </div>
      </section>

      <section
        id="fluxos"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Fluxos do sistema
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Entenda o caminho natural de projetos e relatórios dentro da
          Transparência Social.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Fluxo do projeto
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Acompanhe o andamento do projeto desde a preparação até a
                  validação final.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "slate"
                )}`}
              >
                Rascunho
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "amber"
                )}`}
              >
                Enviado
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "blue"
                )}`}
              >
                Em análise
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "emerald"
                )}`}
              >
                Aprovado
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "blue"
                )}`}
              >
                Em análise
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "rose"
                )}`}
              >
                Devolvido
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "amber"
                )}`}
              >
                Reenviado
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              O projeto nasce como rascunho, segue para envio, entra em análise
              e pode ser aprovado ou devolvido para ajustes antes do reenvio.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Fluxo do relatório
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Entenda quando o relatório pode ser editado e quando fica
                  bloqueado.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "slate"
                )}`}
              >
                Rascunho
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "amber"
                )}`}
              >
                Enviado
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "amber"
                )}`}
              >
                Enviado
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                  "slate"
                )}`}
              >
                Reaberto para rascunho
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Relatórios podem ser editados enquanto estão em rascunho. Depois
              do envio, a edição fica bloqueada até que o relatório seja
              reaberto.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Atalhos rápidos
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Vá direto para as áreas mais utilizadas do sistema.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HelpCard
            title="Ir para organizações"
            description="Acesse dados institucionais, membros e documentos da organização."
            href="/dashboard/organizations"
          />
          <HelpCard
            title="Ir para projetos"
            description="Crie, visualize e acompanhe o andamento dos projetos."
            href="/dashboard/projects"
          />
          <HelpCard
            title="Ir para relatórios"
            description="Gerencie relatórios e acompanhe seus status de envio."
            href="/dashboard/reports"
          />
          <HelpCard
            title="Voltar ao início"
            description="Retorne ao painel principal para ter uma visão geral do sistema."
            href="/dashboard"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Perguntas frequentes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Respostas rápidas para dúvidas comuns de uso.
          </p>
        </div>

        <div className="grid gap-3">
          <FaqItem
            question="Não consigo criar um relatório. O que devo verificar?"
            answer="Confirme se existe um projeto visível para a sua organização e se o projeto correto foi selecionado no momento da criação."
          />

          <FaqItem
            question="Por que não consigo editar um relatório enviado?"
            answer="Porque relatórios enviados deixam de ser editáveis. Para alterar o conteúdo, o relatório precisa ser reaberto para rascunho."
          />

          <FaqItem
            question="O que significa um projeto devolvido?"
            answer="Significa que o projeto voltou para ajustes. Revise as informações necessárias e faça o reenvio quando tudo estiver correto."
          />

          <FaqItem
            question="Como envio documentos da organização?"
            answer="Entre na organização desejada, abra a área de documentos, selecione o item correspondente, informe a validade e envie o arquivo."
          />

          <FaqItem
            question="Quem pode alterar dados da organização?"
            answer="Isso depende do papel do usuário vinculado à organização. Em geral, perfis administrativos possuem acesso mais amplo de edição."
          />

          <FaqItem
            question="O que fazer se o upload falhar?"
            answer="Atualize a página, tente reenviar o arquivo e verifique se o documento foi selecionado corretamente antes de concluir o envio."
          />
        </div>
      </section>

      <section
        id="problemas"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Solução rápida de problemas
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Antes de pedir suporte, passe por esta checagem rápida.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <QuickCheckCard
            title="Não consigo entrar no sistema"
            items={[
              "Verifique se você está autenticado.",
              "Tente limpar os cookies ou usar uma aba anônima.",
              "Volte para a tela de login e tente novamente.",
            ]}
          />

          <QuickCheckCard
            title="O upload não funciona"
            items={[
              "Confirme se o arquivo foi realmente selecionado.",
              "Atualize a página e tente novamente.",
              "Verifique se o envio está sendo feito no item correto.",
            ]}
          />

          <QuickCheckCard
            title="Relatório não aparece"
            items={[
              "Verifique se o projeto correto foi escolhido.",
              "Confirme se você tem acesso à organização vinculada.",
              "Atualize a listagem de relatórios.",
            ]}
          />

          <QuickCheckCard
            title="Página deu erro ou não carregou"
            items={[
              "Recarregue a página.",
              "Volte ao dashboard e abra a rota novamente.",
              "Refaça a ação e confira os campos obrigatórios.",
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Ainda com dúvida?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Em caso de dúvida operacional, fale com o responsável pela
          organização, com o administrador do sistema ou com o consultor que
          acompanha o processo.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Voltar ao dashboard
          </Link>

          <Link
            href="/dashboard/organizations"
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Abrir organizações
          </Link>

          <Link
            href="/dashboard/projects"
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Abrir projetos
          </Link>
        </div>
      </section>
    </main>
  );
}
