"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { exportReportToPdfStubAction, submitReportAction } from "@/app/actions/report.actions";

type Props = {
  reportId: string;
};

type FeedbackState = { kind: "success" | "error"; text: string } | null;

export function ReportActionButtons({ reportId }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isExporting, startExporting] = useTransition();

  const onSubmitReport = () => {
    setFeedback(null);
    startSubmitting(async () => {
      const result = await submitReportAction(reportId);
      if (!result.ok) {
        setFeedback({ kind: "error", text: result.error });
        return;
      }

      setFeedback({ kind: "success", text: result.message });
      router.refresh();
    });
  };

  const onExportReport = () => {
    setFeedback(null);
    startExporting(async () => {
      const result = await exportReportToPdfStubAction(reportId);
      if (!result.ok) {
        setFeedback({ kind: "error", text: result.error });
        return;
      }

      setFeedback({ kind: "success", text: result.message });
      router.refresh();
    });
  };

  const isBusy = isSubmitting || isExporting;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSubmitReport}
          disabled={isBusy}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Enviando..." : "Enviar"}
        </button>
        <button
          type="button"
          onClick={onExportReport}
          disabled={isBusy}
          className="rounded bg-slate-800 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Exportando..." : "Exportar PDF (stub)"}
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            feedback.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}
