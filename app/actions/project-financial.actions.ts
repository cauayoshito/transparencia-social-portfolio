"use server";

/**
 * DEPRECATED: Este action salvava dados financeiros no campo JSONB
 * projects.financial_data. O módulo financeiro agora usa tabelas
 * normalizadas (report_financial_items, report_receipts, etc.)
 * preenchidas via edição de relatório.
 *
 * Este action é mantido apenas por backward-compatibility.
 * Novos fluxos devem usar report-financial.actions.ts.
 *
 * O campo projects.financial_data NÃO foi removido do banco,
 * mas não é mais lido pelo frontend.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function toNumberLoose(input: string) {
  const cleaned = input
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * @deprecated Use report-financial.actions.ts instead.
 * Kept for backward compatibility only.
 */
export async function updateProjectFinancialAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Não foi possível identificar o projeto."
      )}`
    );
  }

  // Redireciona para a aba financeiro com mensagem informativa
  // O formulário legado não deve mais ser exibido, mas se for
  // chamado, redirecionamos sem salvar no JSON.
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(
    `/dashboard/projects/${projectId}?tab=financial&success=${encodeURIComponent(
      "Os dados financeiros agora são gerenciados via relatórios. Acesse a aba Relatórios para editar."
    )}`
  );
}
