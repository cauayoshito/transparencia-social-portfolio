/**
 * Project Schedule & Counterparts Service
 *
 * Cronograma de execução mês a mês (todos os tipos de projeto) e
 * contrapartidas pactuadas (projetos INCENTIVADO). A prestação de contas
 * puxa estas linhas para avaliação por período.
 *
 * Tabelas: project_schedule_items · project_counterparts
 */

import { createClient } from "@/lib/supabase/server";

export type ProjectScheduleItem = {
  id: string;
  project_id: string;
  activity_month: string | null;
  activity_year: number | null;
  activity: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export type ProjectCounterpart = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

// ── Cronograma ──

export async function listProjectScheduleItems(
  projectId: string,
): Promise<ProjectScheduleItem[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("project_schedule_items")
    .select("*")
    .eq("project_id", projectId)
    .order("activity_year", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Falha ao listar cronograma: ${error.message}`);
  return (data ?? []) as ProjectScheduleItem[];
}

export async function createProjectScheduleItem(
  projectId: string,
  item: {
    activity_month?: string | null;
    activity_year?: number | null;
    activity: string;
  },
): Promise<ProjectScheduleItem> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("project_schedule_items")
    .insert({
      project_id: projectId,
      activity_month: item.activity_month ?? null,
      activity_year: item.activity_year ?? null,
      activity: item.activity,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Falha ao criar item do cronograma: ${error.message}`);
  return data as ProjectScheduleItem;
}

export async function deleteProjectScheduleItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("project_schedule_items")
    .delete()
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) throw new Error(`Falha ao remover item do cronograma: ${error.message}`);
}

// ── Contrapartidas ──

export async function listProjectCounterparts(
  projectId: string,
): Promise<ProjectCounterpart[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("project_counterparts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Falha ao listar contrapartidas: ${error.message}`);
  return (data ?? []) as ProjectCounterpart[];
}

export async function createProjectCounterpart(
  projectId: string,
  counterpart: { title: string; description?: string | null },
): Promise<ProjectCounterpart> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("project_counterparts")
    .insert({
      project_id: projectId,
      title: counterpart.title,
      description: counterpart.description ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Falha ao criar contrapartida: ${error.message}`);
  return data as ProjectCounterpart;
}

export async function deleteProjectCounterpart(
  projectId: string,
  counterpartId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("project_counterparts")
    .delete()
    .eq("id", counterpartId)
    .eq("project_id", projectId);

  if (error) throw new Error(`Falha ao remover contrapartida: ${error.message}`);
}
