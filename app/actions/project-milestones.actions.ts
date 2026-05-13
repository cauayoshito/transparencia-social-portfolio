"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import {
  createProjectMilestone,
  deleteProjectMilestone,
  updateProjectMilestone,
} from "@/services/project-milestones.service";

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

export async function createProjectMilestoneAction(formData: FormData) {
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
    await createProjectMilestone({
      project_id: projectId,
      goal_id: safeText(formData.get("goal_id")) || null,
      title: safeText(formData.get("title")),
      description: safeText(formData.get("description")) || null,
      starts_at: safeText(formData.get("starts_at")) || null,
      ends_at: safeText(formData.get("ends_at")) || null,
      status: safeText(formData.get("status")) || null,
      sort_order: safeText(formData.get("sort_order")) || null,
    });
  } catch (error) {
    redirectToProjectPlan(projectId, {
      error: readErrorMessage(error, "Nao foi possivel cadastrar o marco."),
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirectToProjectPlan(projectId, {
    success: "Marco cadastrado com sucesso.",
  });
}

export async function updateProjectMilestoneAction(formData: FormData) {
  await requireUser();

  const projectId = safeText(formData.get("project_id"));
  const milestoneId = safeText(formData.get("milestone_id"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Nao foi possivel identificar o projeto."
      )}`
    );
  }

  if (!milestoneId) {
    redirectToProjectPlan(projectId, {
      error: "Nao foi possivel identificar o marco selecionado.",
    });
  }

  try {
    await updateProjectMilestone(milestoneId, projectId, {
      goal_id: safeText(formData.get("goal_id")) || null,
      title: safeText(formData.get("title")),
      description: safeText(formData.get("description")) || null,
      starts_at: safeText(formData.get("starts_at")) || null,
      ends_at: safeText(formData.get("ends_at")) || null,
      status: safeText(formData.get("status")) || null,
      sort_order: safeText(formData.get("sort_order")) || null,
    });
  } catch (error) {
    redirectToProjectPlan(projectId, {
      error: readErrorMessage(error, "Nao foi possivel atualizar o marco."),
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirectToProjectPlan(projectId, {
    success: "Marco atualizado com sucesso.",
  });
}

export async function deleteProjectMilestoneAction(formData: FormData) {
  await requireUser();

  const projectId = safeText(formData.get("project_id"));
  const milestoneId = safeText(formData.get("milestone_id"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Nao foi possivel identificar o projeto."
      )}`
    );
  }

  if (!milestoneId) {
    redirectToProjectPlan(projectId, {
      error: "Nao foi possivel identificar o marco selecionado.",
    });
  }

  try {
    await deleteProjectMilestone(milestoneId, projectId);
  } catch (error) {
    redirectToProjectPlan(projectId, {
      error: readErrorMessage(error, "Nao foi possivel remover o marco."),
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirectToProjectPlan(projectId, {
    success: "Marco removido com sucesso.",
  });
}
