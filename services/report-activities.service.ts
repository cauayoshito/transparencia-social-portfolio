/**
 * Report Activities Service
 *
 * Acompanhamento de atividades do relatório (modelo PHI):
 * Mês, Ano, Atividade, Execução, Avaliação de processos/resultados/comentários.
 *
 * Tabela: report_activities
 */

import { createClient } from "@/lib/supabase/server";

export type ReportActivity = {
  id: string;
  report_id: string;
  activity_month: string | null;
  activity_year: number | null;
  activity: string;
  execution: string | null;
  evaluation: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export async function listReportActivities(
  reportId: string,
): Promise<ReportActivity[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_activities")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar atividades do relatório: ${error.message}`);
  }
  return (data ?? []) as ReportActivity[];
}

export async function upsertReportActivity(
  reportId: string,
  activity: {
    id?: string;
    activity_month?: string | null;
    activity_year?: number | null;
    activity: string;
    execution?: string | null;
    evaluation?: string | null;
    sort_order?: number | null;
  },
): Promise<ReportActivity> {
  const supabase = createClient();
  const db = supabase as any;

  const payload = {
    report_id: reportId,
    activity_month: activity.activity_month ?? null,
    activity_year: activity.activity_year ?? null,
    activity: activity.activity,
    execution: activity.execution ?? null,
    evaluation: activity.evaluation ?? null,
    sort_order: activity.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (activity.id) {
    const { data, error } = await db
      .from("report_activities")
      .update(payload)
      .eq("id", activity.id)
      .eq("report_id", reportId)
      .select("*")
      .single();
    if (error) {
      throw new Error(`Falha ao atualizar atividade: ${error.message}`);
    }
    return data as ReportActivity;
  }

  const { data, error } = await db
    .from("report_activities")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(`Falha ao criar atividade: ${error.message}`);
  }
  return data as ReportActivity;
}

export async function deleteReportActivity(
  reportId: string,
  activityId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("report_activities")
    .delete()
    .eq("id", activityId)
    .eq("report_id", reportId);

  if (error) {
    throw new Error(`Falha ao remover atividade: ${error.message}`);
  }
}
