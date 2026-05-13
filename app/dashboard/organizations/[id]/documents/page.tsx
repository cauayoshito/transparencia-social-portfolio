import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listOrgDocuments,
  createSignedUrl,
} from "@/services/organization_documents.service";
import {
  uploadOrganizationDocumentAction,
  deleteOrganizationDocumentAction,
} from "@/app/actions/organization-documents.actions";

export const dynamic = "force-dynamic";

const ORG_DOC_TYPES = [
  { code: "01", name: "Estatuto Social em vigor registrado em cartório" },
  { code: "02", name: "Ata da última assembleia de eleição de diretoria" },
  { code: "03", name: "Cartão do CNPJ" },
  { code: "04", name: "RG e CPF do responsável legal" },
  { code: "05", name: "Comprovante de residência do responsável legal" },
  {
    code: "06",
    name: "Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União",
  },
  { code: "07", name: "Certificado de regularidade do FGTS" },
  { code: "08", name: "Certidão Negativa de Débitos Trabalhistas" },
  { code: "09", name: "Certidão Negativa de Tributos Estaduais" },
  { code: "10", name: "Certidão Negativa de Tributos Municipais" },
];

function msg(v?: string | string[]) {
  return typeof v === "string" ? decodeURIComponent(v) : null;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(d);
}

function statusBadge(isSent?: boolean | null) {
  if (isSent) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function OrgDocumentsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string | string[]; success?: string | string[] };
}) {
  const orgId = params.id;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6">
        <p>Sem sessão. Faça login.</p>
        <Link className="underline" href="/login">
          Ir para login
        </Link>
      </div>
    );
  }

  const rows = await listOrgDocuments(orgId);
  const byCode = new Map(rows.map((r) => [r.doc_type_code, r]));

  const error = msg(searchParams?.error);
  const success = msg(searchParams?.success);

  const enviados = rows.filter((r) => r.is_sent).length;
  const total = ORG_DOC_TYPES.length;

  const docs = await Promise.all(
    ORG_DOC_TYPES.map(async (t) => {
      const r = byCode.get(t.code);

      let viewUrl: string | null = null;
      if (r?.file_path) {
        viewUrl = await createSignedUrl(
          "organization-documents",
          r.file_path,
          300
        ).catch(() => null);
      }

      return { type: t, row: r ?? null, viewUrl };
    })
  );

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Documentos da organização
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Envie os documentos obrigatórios da organização. Cada item abaixo
            funciona como uma tarefa individual.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {enviados} de {total} enviados
            </span>

            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              Status: Aberto
            </span>
          </div>
        </div>

        <Link
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          href={`/dashboard/organizations/${orgId}`}
        >
          ← Voltar para organização
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Checklist de documentação
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Preencha a validade, selecione o arquivo e envie cada documento.
          </p>
        </div>

        <div className="grid gap-4 p-5">
          {docs.map(({ type, row, viewUrl }) => (
            <form
              key={type.code}
              action={uploadOrganizationDocumentAction}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="doc_type_code" value={type.code} />
              <input type="hidden" name="doc_name" value={type.name} />

              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {type.code}
                    </span>

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge(
                        row?.is_sent
                      )}`}
                    >
                      {row?.is_sent ? "Enviado" : "Pendente"}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {type.name}
                  </h3>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-800">
                        Enviado em:
                      </span>{" "}
                      {formatDate(row?.sent_at ?? null)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">
                        Validade atual:
                      </span>{" "}
                      {formatDate(row?.valid_until ?? null)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {viewUrl ? (
                    <a
                      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      href={viewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visualizar
                    </a>
                  ) : (
                    <span className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
                      Sem arquivo
                    </span>
                  )}

                  {row?.id ? (
                    <button
                      formAction={deleteOrganizationDocumentAction}
                      name="docId"
                      value={row.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Data de validade
                  </label>
                  <input
                    name="valid_until"
                    type="date"
                    defaultValue={row?.valid_until ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Arquivo
                  </label>
                  <input
                    name="file"
                    type="file"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                  />
                </div>

                <div className="flex items-end">
                  <button className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 md:w-auto">
                    Enviar arquivo
                  </button>
                </div>
              </div>
            </form>
          ))}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          Complete os documentos obrigatórios para manter a organização pronta
          para análise.
        </div>
      </section>
    </main>
  );
}
