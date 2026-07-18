"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import { createClient } from "@/lib/supabase/server";

function isRedirectError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("NEXT_REDIRECT") || err.constructor?.name === "RedirectError")
  );
}

/**
 * Salva os campos estendidos do projeto (alinhamento com protótipo PHI).
 * Campos: state_uf, area_of_action, target_audience, start_date, end_date,
 * total_value, people_served, coordinator_name, observations, is_incentivado
 */
export async function updateProjectExtendedAction(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const go = (q: string) =>
    redirect(`/dashboard/projects/${projectId}?tab=overview${q}`);

  try {
    const user = await requireUser();

    if (!projectId) {
      return go("&error=" + encodeURIComponent("ID do projeto não informado."));
    }

    // FIX: Verificar que o usuário tem acesso ao projeto
    const { getProjectByIdForUser } = await import("@/services/projects.service");
    const project = await getProjectByIdForUser(projectId, user.id);
    if (!project) {
      return go("&error=" + encodeURIComponent("Acesso negado ao projeto."));
    }

    // Item 7: Visão geral editável somente até o envio (rascunho ou devolvido).
    const projStatus = String((project as any).status ?? "")
      .trim()
      .toUpperCase();
    if (projStatus !== "DRAFT" && projStatus !== "DEVOLVIDO") {
      return go(
        "&error=" +
          encodeURIComponent(
            "Edição bloqueada: o projeto já foi enviado para análise.",
          ),
      );
    }

    // Collect target audience checkboxes
    const targetAudience: string[] = [];
    const audienceOptions = [
      "criancas", "adolescentes", "jovens", "adultos", "idosos",
      "mulheres", "familias", "pessoas_rua", "apenados",
      "grupos_minorizados", "migrantes", "pcd", "professores", "outros",
    ];
    for (const opt of audienceOptions) {
      if (formData.get(`audience_${opt}`)) {
        targetAudience.push(opt);
      }
    }

    const totalValueRaw = String(formData.get("total_value") ?? "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    const totalValue = parseFloat(totalValueRaw);

    const peopleServedRaw = String(formData.get("people_served") ?? "").trim();
    const peopleServed = parseInt(peopleServedRaw, 10);

    const payload: Record<string, unknown> = {
      state_uf: String(formData.get("state_uf") ?? "").trim() || null,
      area_of_action: String(formData.get("area_of_action") ?? "").trim() || null,
      target_audience: targetAudience.length > 0 ? targetAudience : null,
      start_date: String(formData.get("start_date") ?? "").trim() || null,
      end_date: String(formData.get("end_date") ?? "").trim() || null,
      total_value: Number.isFinite(totalValue) ? totalValue : null,
      people_served: Number.isFinite(peopleServed) ? peopleServed : null,
      coordinator_name: String(formData.get("coordinator_name") ?? "").trim() || null,
      observations: String(formData.get("observations") ?? "").trim() || null,
      is_incentivado: formData.get("is_incentivado") === "on" || formData.get("is_incentivado") === "true",
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("projects")
      .update(payload)
      .eq("id", projectId);

    if (error) {
      return go("&error=" + encodeURIComponent(`Falha ao salvar: ${error.message}`));
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return go("&success=" + encodeURIComponent("Dados do projeto atualizados."));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      "&error=" +
        encodeURIComponent(
          err instanceof Error ? err.message : "Erro ao salvar dados do projeto."
        )
    );
  }
}
