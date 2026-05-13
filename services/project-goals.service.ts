import { createClient } from "@/lib/supabase/server";
import type { Database, ProjectGoalStatus } from "@/types/database";

export type ProjectGoalRow =
  Database["public"]["Tables"]["project_goals"]["Row"];

export type CreateProjectGoalInput = {
  project_id: string;
  title: string;
  description?: string | null;
  indicator?: string | null;
  target_value?: string | null;
  due_date?: string | null;
  status?: string | null;
  sort_order?: number | string | null;
};

export type UpdateProjectGoalInput = {
  title?: string | null;
  description?: string | null;
  indicator?: string | null;
  target_value?: string | null;
  due_date?: string | null;
  status?: string | null;
  sort_order?: number | string | null;
};

type ProjectContext = {
  id: string;
  organization_id: string;
};

const PROJECT_GOAL_STATUS: ProjectGoalStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
];

function cleanNullable(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function cleanDate(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  return normalized;
}

function normalizeGoalStatus(
  value: string | null | undefined
): ProjectGoalStatus | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return PROJECT_GOAL_STATUS.includes(normalized as ProjectGoalStatus)
    ? (normalized as ProjectGoalStatus)
    : null;
}

function parseSortOrder(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return Math.max(0, Math.trunc(parsed));
}

function serviceError(base: string, raw: unknown, context: string) {
  const anyRaw = raw as { message?: string; code?: string } | null;
  const message =
    raw instanceof Error
      ? raw.message
      : typeof anyRaw?.message === "string"
      ? anyRaw.message
      : typeof raw === "string"
      ? raw
      : JSON.stringify(raw);

  return new Error(`${base} [context: ${context}]: ${message}`);
}

async function requireAuthenticatedUserId(userId?: string) {
  const supabase = createClient() as any;

  if (userId) return { supabase, userId };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw serviceError(
      "Usuario nao autenticado",
      error ?? "Sem user",
      "auth.getUser"
    );
  }

  return { supabase, userId: user.id };
}

async function getProjectContext(
  projectId: string,
  supabase: any
): Promise<ProjectContext | null> {
  const safeProjectId = String(projectId ?? "").trim();
  if (!safeProjectId) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", safeProjectId)
    .maybeSingle();

  if (error) {
    throw serviceError(
      "Falha ao carregar o projeto para metas",
      error,
      "projects.selectGoalContext"
    );
  }

  return (data as ProjectContext | null) ?? null;
}

async function getNextSortOrder(projectId: string, supabase: any) {
  const { data, error } = await supabase
    .from("project_goals")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw serviceError(
      "Falha ao calcular a ordenacao da meta",
      error,
      "project_goals.nextSortOrder"
    );
  }

  const lastSortOrder = Number(data?.[0]?.sort_order ?? -1);
  return Number.isFinite(lastSortOrder) ? lastSortOrder + 1 : 0;
}

export async function listProjectGoals(
  projectId: string
): Promise<ProjectGoalRow[]> {
  const safeProjectId = String(projectId ?? "").trim();
  if (!safeProjectId) return [];

  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("project_goals")
    .select("*")
    .eq("project_id", safeProjectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw serviceError(
      "Falha ao listar metas do projeto",
      error,
      "project_goals.select"
    );
  }

  return (data ?? []) as ProjectGoalRow[];
}

export async function createProjectGoal(
  payload: CreateProjectGoalInput,
  userId?: string
): Promise<ProjectGoalRow> {
  const { supabase, userId: effectiveUserId } =
    await requireAuthenticatedUserId(userId);

  const projectId = String(payload.project_id ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const status = normalizeGoalStatus(payload.status) ?? "PLANNED";

  if (!projectId) {
    throw new Error("Nao foi possivel identificar o projeto da meta.");
  }

  if (!title) {
    throw new Error("Informe o titulo da meta.");
  }

  const project = await getProjectContext(projectId, supabase);

  if (!project) {
    throw new Error("Projeto nao encontrado ou indisponivel para este usuario.");
  }

  const sortOrder =
    parseSortOrder(payload.sort_order) ??
    (await getNextSortOrder(projectId, supabase));

  const { data, error } = await supabase
    .from("project_goals")
    .insert({
      project_id: projectId,
      organization_id: project.organization_id,
      title,
      description: cleanNullable(payload.description),
      indicator: cleanNullable(payload.indicator),
      target_value: cleanNullable(payload.target_value),
      due_date: cleanDate(payload.due_date),
      status,
      sort_order: sortOrder,
      created_by: effectiveUserId,
      updated_by: effectiveUserId,
    })
    .select("*")
    .single();

  if (error) {
    throw serviceError(
      "Falha ao criar a meta do projeto",
      error,
      "project_goals.insert"
    );
  }

  return data as ProjectGoalRow;
}

export async function updateProjectGoal(
  goalId: string,
  projectId: string,
  payload: UpdateProjectGoalInput,
  userId?: string
): Promise<ProjectGoalRow> {
  const { supabase, userId: effectiveUserId } =
    await requireAuthenticatedUserId(userId);

  const safeGoalId = String(goalId ?? "").trim();
  const safeProjectId = String(projectId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const status = normalizeGoalStatus(payload.status);

  if (!safeGoalId || !safeProjectId) {
    throw new Error("Nao foi possivel identificar a meta selecionada.");
  }

  if (!title) {
    throw new Error("Informe o titulo da meta.");
  }

  const project = await getProjectContext(safeProjectId, supabase);

  if (!project) {
    throw new Error("Projeto nao encontrado ou indisponivel para este usuario.");
  }

  if (!status) {
    throw new Error("Selecione um status valido para a meta.");
  }

  const parsedSortOrder = parseSortOrder(payload.sort_order);

  const { data, error } = await supabase
    .from("project_goals")
    .update({
      title,
      description: cleanNullable(payload.description),
      indicator: cleanNullable(payload.indicator),
      target_value: cleanNullable(payload.target_value),
      due_date: cleanDate(payload.due_date),
      status,
      sort_order: parsedSortOrder ?? 0,
      updated_by: effectiveUserId,
      organization_id: project.organization_id,
    })
    .eq("id", safeGoalId)
    .eq("project_id", safeProjectId)
    .select("*")
    .single();

  if (error) {
    throw serviceError(
      "Falha ao atualizar a meta do projeto",
      error,
      "project_goals.update"
    );
  }

  return data as ProjectGoalRow;
}

export async function deleteProjectGoal(
  goalId: string,
  projectId: string,
  userId?: string
): Promise<void> {
  const { supabase } = await requireAuthenticatedUserId(userId);

  const safeGoalId = String(goalId ?? "").trim();
  const safeProjectId = String(projectId ?? "").trim();

  if (!safeGoalId || !safeProjectId) {
    throw new Error("Nao foi possivel identificar a meta selecionada.");
  }

  const project = await getProjectContext(safeProjectId, supabase);

  if (!project) {
    throw new Error("Projeto nao encontrado ou indisponivel para este usuario.");
  }

  const { error } = await supabase
    .from("project_goals")
    .delete()
    .eq("id", safeGoalId)
    .eq("project_id", safeProjectId);

  if (error) {
    throw serviceError(
      "Falha ao remover a meta do projeto",
      error,
      "project_goals.delete"
    );
  }
}
