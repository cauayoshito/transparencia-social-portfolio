import { createClient } from "@/lib/supabase/server";
import type { Database, ProjectMilestoneStatus } from "@/types/database";

export type ProjectMilestoneRow =
  Database["public"]["Tables"]["project_milestones"]["Row"];

export type CreateProjectMilestoneInput = {
  project_id: string;
  goal_id?: string | null;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string | null;
  sort_order?: number | string | null;
};

export type UpdateProjectMilestoneInput = {
  goal_id?: string | null;
  title?: string | null;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string | null;
  sort_order?: number | string | null;
};

type ProjectContext = {
  id: string;
  organization_id: string;
};

type GoalContext = {
  id: string;
  project_id: string;
};

const PROJECT_MILESTONE_STATUS: ProjectMilestoneStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DELAYED",
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

function normalizeMilestoneStatus(
  value: string | null | undefined
): ProjectMilestoneStatus | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return PROJECT_MILESTONE_STATUS.includes(normalized as ProjectMilestoneStatus)
    ? (normalized as ProjectMilestoneStatus)
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
      "Falha ao carregar o projeto para cronograma",
      error,
      "projects.selectMilestoneContext"
    );
  }

  return (data as ProjectContext | null) ?? null;
}

async function getGoalContext(goalId: string, supabase: any) {
  const safeGoalId = String(goalId ?? "").trim();
  if (!safeGoalId) return null;

  const { data, error } = await supabase
    .from("project_goals")
    .select("id, project_id")
    .eq("id", safeGoalId)
    .maybeSingle();

  if (error) {
    throw serviceError(
      "Falha ao validar a meta vinculada ao marco",
      error,
      "project_goals.selectMilestoneGoal"
    );
  }

  return (data as GoalContext | null) ?? null;
}

async function getNextSortOrder(projectId: string, supabase: any) {
  const { data, error } = await supabase
    .from("project_milestones")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw serviceError(
      "Falha ao calcular a ordenacao do marco",
      error,
      "project_milestones.nextSortOrder"
    );
  }

  const lastSortOrder = Number(data?.[0]?.sort_order ?? -1);
  return Number.isFinite(lastSortOrder) ? lastSortOrder + 1 : 0;
}

function validateDateRange(startsAt: string | null, endsAt: string | null) {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("A data de inicio nao pode ser maior que a data de fim.");
  }
}

async function resolveGoalId(
  goalId: string | null | undefined,
  projectId: string,
  supabase: any
) {
  const safeGoalId = cleanNullable(goalId);
  if (!safeGoalId) return null;

  const goal = await getGoalContext(safeGoalId, supabase);

  if (!goal || goal.project_id !== projectId) {
    throw new Error("A meta selecionada nao pertence a este projeto.");
  }

  return goal.id;
}

export async function listProjectMilestones(
  projectId: string,
  userId?: string
): Promise<ProjectMilestoneRow[]> {
  const safeProjectId = String(projectId ?? "").trim();
  if (!safeProjectId) return [];

  const { supabase } = await requireAuthenticatedUserId(userId);

  const project = await getProjectContext(safeProjectId, supabase);

  if (!project) {
    throw new Error(
      "Projeto nao encontrado ou indisponivel para este usuario."
    );
  }

  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", safeProjectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw serviceError(
      "Falha ao listar marcos do projeto",
      error,
      "project_milestones.select"
    );
  }

  return (data ?? []) as ProjectMilestoneRow[];
}

export async function createProjectMilestone(
  payload: CreateProjectMilestoneInput,
  userId?: string
): Promise<ProjectMilestoneRow> {
  const { supabase, userId: effectiveUserId } =
    await requireAuthenticatedUserId(userId);

  const projectId = String(payload.project_id ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const startsAt = cleanDate(payload.starts_at);
  const endsAt = cleanDate(payload.ends_at);
  const status = normalizeMilestoneStatus(payload.status) ?? "PLANNED";

  if (!projectId) {
    throw new Error("Nao foi possivel identificar o projeto do marco.");
  }

  if (!title) {
    throw new Error("Informe o titulo do marco.");
  }

  validateDateRange(startsAt, endsAt);

  const project = await getProjectContext(projectId, supabase);

  if (!project) {
    throw new Error(
      "Projeto nao encontrado ou indisponivel para este usuario."
    );
  }

  const sortOrder =
    parseSortOrder(payload.sort_order) ??
    (await getNextSortOrder(projectId, supabase));

  const goalId = await resolveGoalId(payload.goal_id, projectId, supabase);

  const { data, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: projectId,
      organization_id: project.organization_id,
      goal_id: goalId,
      title,
      description: cleanNullable(payload.description),
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      sort_order: sortOrder,
      created_by: effectiveUserId,
      updated_by: effectiveUserId,
    })
    .select("*")
    .single();

  if (error) {
    throw serviceError(
      "Falha ao criar o marco do projeto",
      error,
      "project_milestones.insert"
    );
  }

  return data as ProjectMilestoneRow;
}

export async function updateProjectMilestone(
  milestoneId: string,
  projectId: string,
  payload: UpdateProjectMilestoneInput,
  userId?: string
): Promise<ProjectMilestoneRow> {
  const { supabase, userId: effectiveUserId } =
    await requireAuthenticatedUserId(userId);

  const safeMilestoneId = String(milestoneId ?? "").trim();
  const safeProjectId = String(projectId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const startsAt = cleanDate(payload.starts_at);
  const endsAt = cleanDate(payload.ends_at);
  const status = normalizeMilestoneStatus(payload.status);

  if (!safeMilestoneId || !safeProjectId) {
    throw new Error("Nao foi possivel identificar o marco selecionado.");
  }

  if (!title) {
    throw new Error("Informe o titulo do marco.");
  }

  if (!status) {
    throw new Error("Selecione um status valido para o marco.");
  }

  validateDateRange(startsAt, endsAt);

  const project = await getProjectContext(safeProjectId, supabase);

  if (!project) {
    throw new Error(
      "Projeto nao encontrado ou indisponivel para este usuario."
    );
  }

  const goalId = await resolveGoalId(payload.goal_id, safeProjectId, supabase);
  const parsedSortOrder = parseSortOrder(payload.sort_order);

  const { data, error } = await supabase
    .from("project_milestones")
    .update({
      goal_id: goalId,
      title,
      description: cleanNullable(payload.description),
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      sort_order: parsedSortOrder ?? 0,
      organization_id: project.organization_id,
      updated_by: effectiveUserId,
    })
    .eq("id", safeMilestoneId)
    .eq("project_id", safeProjectId)
    .select("*")
    .single();

  if (error) {
    throw serviceError(
      "Falha ao atualizar o marco do projeto",
      error,
      "project_milestones.update"
    );
  }

  return data as ProjectMilestoneRow;
}

export async function deleteProjectMilestone(
  milestoneId: string,
  projectId: string,
  userId?: string
): Promise<void> {
  const { supabase } = await requireAuthenticatedUserId(userId);

  const safeMilestoneId = String(milestoneId ?? "").trim();
  const safeProjectId = String(projectId ?? "").trim();

  if (!safeMilestoneId || !safeProjectId) {
    throw new Error("Nao foi possivel identificar o marco selecionado.");
  }

  const project = await getProjectContext(safeProjectId, supabase);

  if (!project) {
    throw new Error(
      "Projeto nao encontrado ou indisponivel para este usuario."
    );
  }

  const { error } = await supabase
    .from("project_milestones")
    .delete()
    .eq("id", safeMilestoneId)
    .eq("project_id", safeProjectId);

  if (error) {
    throw serviceError(
      "Falha ao remover o marco do projeto",
      error,
      "project_milestones.delete"
    );
  }
}
