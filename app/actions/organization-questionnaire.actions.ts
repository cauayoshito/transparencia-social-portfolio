"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { isNotFoundError } from "next/dist/client/components/not-found";
import { upsertQuestionnaire } from "@/services/organization_questionnaire.service";

export async function upsertOrganizationQuestionnaireAction(
  formData: FormData
) {
  const orgId = String(formData.get("orgId") ?? "");
  if (!orgId) redirect("/dashboard/organizations?error=orgId%20invalido");

  try {
    await upsertQuestionnaire(orgId, {
      leader_name: String(formData.get("leader_name") ?? "") || null,
      leader_phone: String(formData.get("leader_phone") ?? "") || null,
      leader_email: String(formData.get("leader_email") ?? "") || null,

      leader_gender: String(formData.get("leader_gender") ?? "") || null,
      leader_gender_other:
        String(formData.get("leader_gender_other") ?? "") || null,
      leader_race: String(formData.get("leader_race") ?? "") || null,

      legal_rep_has_public_office:
        String(formData.get("legal_rep_has_public_office") ?? "") || null,
      legal_rep_public_office_details:
        String(formData.get("legal_rep_public_office_details") ?? "") || null,

      legal_rep_ran_for_political_office:
        String(formData.get("legal_rep_ran_for_political_office") ?? "") ||
        null,
      legal_rep_political_office_details:
        String(formData.get("legal_rep_political_office_details") ?? "") ||
        null,

      legal_rep_criminal_declaration:
        String(formData.get("legal_rep_criminal_declaration") ?? "") || null,

      filled_by_name: String(formData.get("filled_by_name") ?? "") || null,
      filled_by_phone: String(formData.get("filled_by_phone") ?? "") || null,
      filled_by_email: String(formData.get("filled_by_email") ?? "") || null,

      edital_date: String(formData.get("edital_date") ?? "") || null,
      edital_code: String(formData.get("edital_code") ?? "") || null,
      edital_text: String(formData.get("edital_text") ?? "") || null,
    });

    redirect(
      `/dashboard/organizations/${orgId}?success=${encodeURIComponent(
        "Questionário salvo."
      )}`
    );
  } catch (error: unknown) {
    if (isRedirectError(error) || isNotFoundError(error)) throw error;

    const message =
      error instanceof Error ? error.message : "Erro no questionario";

    redirect(
      `/dashboard/organizations/${orgId}?error=${encodeURIComponent(
        message
      )}`
    );
  }
}
