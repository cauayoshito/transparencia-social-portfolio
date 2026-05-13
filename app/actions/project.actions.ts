"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { requireUser } from "@/services/auth.service";
import { logAction } from "@/services/audit.service";
import { createProject } from "@/services/projects.service";

function enc(value: string) {
  return encodeURIComponent(value);
}

const ALLOWED_TYPES = new Set([
  "RECURSOS_PROPRIOS",
  "INCENTIVADO",
  "RECURSOS_PUBLICOS",
]);

export async function createProjectAction(formData: FormData) {
  try {
    const user = await requireUser();

    const title = String(formData.get("title") ?? "").trim();
    const projectType = String(formData.get("project_type") ?? "")
      .trim()
      .toUpperCase();
    const status = String(formData.get("status") ?? "DRAFT")
      .trim()
      .toUpperCase();
    const descriptionRaw = String(formData.get("description") ?? "").trim();
    const linkedEntityId = String(formData.get("linked_entity_id") ?? "").trim();
    const organization_id =
      String(formData.get("organization_id") ?? "").trim() || undefined;

    if (!title) {
      redirect(
        `/dashboard/projects/new?error=${enc("Informe o nome do projeto.")}`
      );
    }

    if (!ALLOWED_TYPES.has(projectType)) {
      redirect(
        `/dashboard/projects/new?error=${enc("Tipo de projeto invalido.")}`
      );
    }

    if (!organization_id) {
      redirect(
        `/dashboard/projects/new?error=${enc(
          "Sem organizacao selecionada. Volte e escolha uma organizacao."
        )}`
      );
    }

    if (!linkedEntityId) {
      redirect(
        `/dashboard/projects/new?error=${enc(
          "Selecione um financiador cadastrado da organizacao."
        )}`
      );
    }

    const project = await createProject(
      {
        title,
        project_type: projectType,
        status,
        description: descriptionRaw || null,
        organization_id,
        linked_entity_id: linkedEntityId,
      },
      user.id
    );

    await logAction(
      "create_project",
      "project",
      project.id,
      {
        title,
        project_type: projectType,
        status,
        organization_id,
        linked_entity_id: linkedEntityId,
      },
      user.id
    );

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/projects/new");
    redirect(`/dashboard/projects/${project.id}?tab=overview`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Nao foi possivel criar o projeto agora. Revise o financiador vinculado e tente novamente.";

    redirect(`/dashboard/projects/new?error=${enc(message)}`);
  }
}
