"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  deleteProjectDocumentAction,
  getProjectDocumentSignedUrlAction,
  listProjectDocumentsAction,
  uploadProjectDocumentAction,
} from "@/app/actions/project-documents.actions";

type Props = {
  projectId: string;
  projectType: string;
};

type DocRow = {
  id: string;
  project_id: string;
  organization_id: string;
  uploaded_by: string | null;
  doc_type: string;
  document_type: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  file_path: string | null;
  created_at: string;
};

// Apenas documentos institucionais/cadastrais do projeto.
// Comprovantes, notas fiscais, extratos e evidências periódicas pertencem ao Relatório.
const DOC_TYPES = [
  { value: "CNPJ", label: "CNPJ" },
  { value: "ESTATUTO", label: "Estatuto Social" },
  { value: "ATA_DIRETORIA", label: "Ata da diretoria" },
  { value: "PROJETO_PROPOSTA", label: "Projeto ou proposta" },
  { value: "CERTIDAO", label: "Certidão" },
  { value: "DECLARACAO", label: "Declaração" },
  { value: "OUTRO", label: "Outro" },
];

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function ProjectDocuments({ projectId }: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docType, setDocType] = useState<string>("CNPJ");
  const [docDescription, setDocDescription] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const checklist = useMemo(
    () => [
      "CNPJ e documentação da organização",
      "Estatuto social ou ata da diretoria",
      "Projeto-base ou proposta aprovada",
      "Certidões e declarações",
    ],
    []
  );

  async function refresh() {
    const res = await listProjectDocumentsAction(projectId);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setDocs((res.data?.documents ?? []) as DocRow[]);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function onUpload() {
    setMsg("");

    if (!file) {
      setMsg("Selecione um arquivo primeiro.");
      return;
    }

    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("doc_type", docType);
    fd.set("doc_description", docDescription);
    fd.set("file", file);

    startTransition(async () => {
      const res = await uploadProjectDocumentAction(fd);

      if (!res.ok) {
        setMsg(res.error || "Falha no upload.");
        return;
      }

      setMsg("Arquivo enviado com sucesso.");
      setFile(null);
      setDocDescription("");
      const input = document.getElementById(
        "project-doc-file"
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      await refresh();
    });
  }

  function onOpen(doc: DocRow) {
    setMsg("");

    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("document_id", doc.id);

    startTransition(async () => {
      const res = await getProjectDocumentSignedUrlAction(fd);

      if (!res.ok) {
        setMsg(res.error || "Falha ao abrir arquivo.");
        return;
      }

      const url = res.data?.url;
      if (!url) {
        setMsg("Não foi possível gerar o link do arquivo.");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function onDelete(doc: DocRow) {
    setMsg("");

    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("document_id", doc.id);

    startTransition(async () => {
      const res = await deleteProjectDocumentAction(fd);

      if (!res.ok) {
        setMsg(res.error || "Falha ao remover.");
        return;
      }

      setMsg("Arquivo removido.");
      await refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          Documentos institucionais
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Arquivos cadastrais e permanentes da organização e do projeto.
          Comprovantes financeiros, notas fiscais, extratos bancários e
          evidências de execução devem ser anexados nos{" "}
          <strong>Relatórios</strong> de cada período.
        </p>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Envio de documentos institucionais
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Envie aqui apenas documentos cadastrais e permanentes do projeto
            (CNPJ, estatuto, proposta, certidões).
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tipo do documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nome / Descrição do documento
            </label>
            <input
              type="text"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Ex: Certidão negativa de débitos federais"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Arquivo
            </label>
            <input
              id="project-doc-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onUpload}
            disabled={isPending}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Enviando..." : "Enviar arquivo"}
          </button>

          {msg ? <span className="text-sm text-slate-700">{msg}</span> : null}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-900">
            Arquivos enviados
          </h4>

          {docs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Nenhum arquivo enviado até agora.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <div className="divide-y divide-slate-200 md:hidden">
                {docs.map((d) => (
                  <div key={d.id} className="space-y-3 px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {d.doc_type}
                    </span>

                    <div className="grid gap-2 text-sm text-slate-600">
                      {d.document_type ? (
                        <div>
                          <span className="font-medium text-slate-900">
                            Descrição:
                          </span>{" "}
                          {d.document_type}
                        </div>
                      ) : null}
                      <div className="break-all">
                        <span className="font-medium text-slate-900">
                          Arquivo:
                        </span>{" "}
                        {d.file_name ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">
                          Tamanho:
                        </span>{" "}
                        {formatBytes(d.size_bytes)}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">
                          Enviado em:
                        </span>{" "}
                        {d.created_at
                          ? new Date(d.created_at).toLocaleString()
                          : "-"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onOpen(d)}
                        className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(d)}
                        className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Descrição</th>
                      <th className="px-3 py-2">Arquivo</th>
                      <th className="px-3 py-2">Tamanho</th>
                      <th className="px-3 py-2">Enviado em</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{d.doc_type}</td>
                        <td className="px-3 py-2 text-slate-600">{d.document_type ?? "-"}</td>
                        <td className="px-3 py-2">{d.file_name ?? "-"}</td>
                        <td className="px-3 py-2">
                          {formatBytes(d.size_bytes)}
                        </td>
                        <td className="px-3 py-2">
                          {d.created_at
                            ? new Date(d.created_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpen(d)}
                              className="rounded-md border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(d)}
                              className="rounded-md border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
