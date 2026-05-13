"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildProjectPlanData } from "@/lib/project-plan";

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

function goToProjectTab(projectId: string, params: Record<string, string>) {
  const search = new URLSearchParams({ tab: "plan", ...params });
  redirect(`/dashboard/projects/${projectId}?${search.toString()}`);
}

export async function saveProjectPlanAction(formData: FormData) {
  const supabase = createClient() as any;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const projectId = asString(formData.get("project_id")).trim();
  const objective = asString(formData.get("objective")).trim();

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Não foi possível identificar o projeto."
      )}`
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("plan_data")
    .eq("id", projectId)
    .single();

  if (projectError) {
    goToProjectTab(projectId, {
      error: "Não foi possível carregar o plano atual do projeto.",
    });
  }

  const planData = buildProjectPlanData(project?.plan_data, objective);

  const { error: updateError } = await supabase
    .from("projects")
    .update({ plan_data: planData })
    .eq("id", projectId);

  if (updateError) {
    goToProjectTab(projectId, {
      error: "Não foi possível salvar o plano do projeto.",
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  goToProjectTab(projectId, { success: "Plano salvo com sucesso." });
}
