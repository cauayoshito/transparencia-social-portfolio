"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import {
  createProjectGoal,
  deleteProjectGoal,
  updateProjectGoal,
} from "@/services/project-goals.service";

function safeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function redirectToProjectPlan(
  projectId: string,
  params: { success?: string; error?: string }
): never {
  const search = new URLSearchParams({ tab: "plan" });

  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);

  redirect(`/dashboard/projects/${projectId}?${search.toString()}`);
}

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function createProjectGoalAction(formData: FormData) {
  await requireUser();

  const projectId = safeText(formData.get("project_id"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Nao foi possivel identificar o projeto."
      )}`
    );
  }

  try {
    await createProjectGoal({
      project_id: projectId,
      title: safeText(formData.get("title")),
      description: safeText(formData.get("description")) || null,
      indicator: safeText(formData.get("indicator")) || null,
      target_value: safeText(formData.get("target_value")) || null,
      due_date: safeText(formData.get("due_date")) || null,
      status: safeText(formData.get("status")) || null,
      sort_order: safeText(formData.get("sort_order")) || null,
    });
  } catch (error) {
    redirectToProjectPlan(projectId, {
      error: readErrorMessage(error, "Nao foi possivel cadastrar a meta."),
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirectToProjectPlan(projectId, {
    success: "Meta cadastrada com sucesso.",
  });
}

export async function updateProjectGoalAction(formData: FormData) {
  await requireUser();

  const projectId = safeText(formData.get("project_id"));
  const goalId = safeText(formData.get("goal_id"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Nao foi possivel identificar o projeto."
      )}`
    );
  }

  if (!goalId) {
    redirectToProjectPlan(projectId, {
      error: "Nao foi possivel identificar a meta selecionada.",
    });
  }

  try {
    await updateProjectGoal(goalId, projectId, {
      title: safeText(formData.get("title")),
      description: safeText(formData.get("description")) || null,
      indicator: safeText(formData.get("indicator")) || null,
      target_value: safeText(formData.get("target_value")) || null,
      due_date: safeText(formData.get("due_date")) || null,
      status: safeText(formData.get("status")) || null,
      sort_order: safeText(formData.get("sort_order")) || null,
    });
  } catch (error) {
    redirectToProjectPlan(projectId, {
      error: readErrorMessage(error, "Nao foi possivel atualizar a meta."),
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirectToProjectPlan(projectId, {
    success: "Meta atualizada com sucesso.",
  });
}

export async function deleteProjectGoalAction(formData: FormData) {
  await requireUser();

  const projectId = safeText(formData.get("project_id"));
  const goalId = safeText(formData.get("goal_id"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Nao foi possivel identificar o projeto."
      )}`
    );
  }

  if (!goalId) {
    redirectToProjectPlan(projectId, {
      error: "Nao foi possivel identificar a meta selecionada.",
    });
  }

  try {
    await deleteProjectGoal(goalId, projectId);
  } catch (error) {
    redirectToProjectPlan(projectId, {
      error: readErrorMessage(error, "Nao foi possivel remover a meta."),
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirectToProjectPlan(projectId, {
    success: "Meta removida com sucesso.",
  });
}
