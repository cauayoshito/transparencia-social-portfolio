"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import { getOrganizationMemberships } from "@/services/membership.service";
import { createInstitutionalEntity } from "@/services/institutional-entities.service";
import type { LinkedEntityType } from "@/types/database";

function enc(value: string) {
  return encodeURIComponent(value);
}

function normalizeLinkedEntityType(
  value: FormDataEntryValue | null
): LinkedEntityType | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "empresa") return "empresa";
  if (normalized === "entidade_publica") return "entidade_publica";
  return null;
}

export async function createInstitutionalEntityAction(formData: FormData) {
  const user = await requireUser();

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const entityType = normalizeLinkedEntityType(formData.get("entity_type"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();

  if (!organizationId) {
    redirect(
      `/dashboard/entities?error=${enc("Selecione a organização da entidade.")}`
    );
  }

  if (!entityType) {
    redirect(
      `/dashboard/entities?error=${enc("Selecione o tipo da entidade.")}`
    );
  }

  if (!displayName) {
    redirect(
      `/dashboard/entities?error=${enc(
        "Informe o nome da empresa ou entidade pública."
      )}`
    );
  }

  const memberships = await getOrganizationMemberships(user.id);
  const hasMembership = memberships.some(
    (membership) => membership.organization_id === organizationId
  );

  if (!hasMembership) {
    redirect(
      `/dashboard/entities?error=${enc(
        "Você não tem acesso à organização selecionada."
      )}`
    );
  }

  try {
    await createInstitutionalEntity(
      {
        organization_id: organizationId,
        entity_type: entityType,
        display_name: displayName,
        legal_name: legalName || null,
        tax_id: taxId || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
      },
      user.id
    );

    revalidatePath("/dashboard/entities");
    revalidatePath("/dashboard/projects/new");

    redirect(
      `/dashboard/entities?success=${enc(
        "Entidade cadastrada com sucesso."
      )}`
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível cadastrar a entidade agora.";

    redirect(`/dashboard/entities?error=${enc(message)}`);
  }
}
