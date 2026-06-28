"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveReportAction,
  returnReportAction,
} from "@/app/actions/report.actions";

type Props = {
  reportId: string;
  /**
   * Quem está avaliando:
   * - "CONSULTANT" → consultor ativo no projeto (decisão final)
   * - "INVESTOR" → financiador (decisão final, quando não há consultor)
   */
  roleLabel?: string;
};

type ModalMode = "approve" | "reject" | "request" | null;

export default function ReviewReportButtons({ reportId, roleLabel }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<ModalMode>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isApprove = mode === "approve";
  const isReject = mode === "reject";
  const isRequest = mode === "request";

  // Reprovação e solicitação de ajuste exigem observação.
  const requiresComment = isReject || isRequest;
  const canSubmit = requiresComment ? comment.trim().length > 0 : true;

  const reviewerLabel =
    roleLabel === "CONSULTANT" ? "consultor" : "financiador";

  function close() {
    setMode(null);
    setComment("");
    setError(null);
  }

  function handleSubmit() {
    if (!mode) return;
    if (requiresComment && !comment.trim()) {
      setError(
        isReject
          ? "Informe o motivo da reprovação para que a organização entenda a decisão."
          : "Informe o que precisa ser ajustado para que a organização saiba o que corrigir."
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        if (isApprove) {
          await approveReportAction(reportId, comment.trim() || "Aprovado.");
        } else {
          // Reprovado e Solicitar ajuste seguem o mesmo fluxo RETURNED.
          await returnReportAction(reportId, comment.trim());
        }
        close();
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao processar avaliação."
        );
      }
    });
  }

  // Conteúdo do modal por modo.
  const modal = isApprove
    ? {
        title: "Aprovar relatório",
        description: `Adicione uma observação (opcional). A organização será notificada da aprovação pelo ${reviewerLabel}.`,
        label: "Observação (opcional)",
        placeholder: "Ex: Relatório bem estruturado. Parabéns pela execução.",
        confirmLabel: "Confirmar aprovação",
        confirmClass: "bg-emerald-600 hover:bg-emerald-700",
      }
    : isReject
    ? {
        title: "Reprovar relatório",
        description:
          "Explique o motivo da reprovação. A organização verá este comentário.",
        label: "Motivo da reprovação *",
        placeholder:
          "Ex: O relatório não atende aos requisitos de prestação de contas e não pode ser aceito.",
        confirmLabel: "Confirmar reprovação",
        confirmClass: "bg-rose-600 hover:bg-rose-700",
      }
    : {
        title: "Solicitar ajuste",
        description:
          "Explique o que precisa ser corrigido. A organização verá este comentário.",
        label: "O que precisa ser ajustado *",
        placeholder:
          "Ex: O relatório financeiro está incompleto. Faltam comprovantes do mês de fevereiro.",
        confirmLabel: "Confirmar solicitação",
        confirmClass: "bg-amber-600 hover:bg-amber-700",
      };

  return (
    <>
      {/* Botões de trigger */}
      <button
        type="button"
        onClick={() => setMode("approve")}
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Aprovar
      </button>

      <button
        type="button"
        onClick={() => setMode("reject")}
        className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
      >
        Reprovado
      </button>

      <button
        type="button"
        onClick={() => setMode("request")}
        className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
      >
        Solicitar ajuste
      </button>

      {/* Modal inline */}
      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {modal.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{modal.description}</p>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {modal.label}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder={modal.placeholder}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  disabled={isPending}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || !canSubmit}
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50",
                    modal.confirmClass,
                  ].join(" ")}
                >
                  {isPending ? "Processando..." : modal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
