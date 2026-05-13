import { createClient } from "@/lib/supabase/server";

export type OrganizationQuestionnaire = {
  organization_id: string;

  leader_name: string | null;
  leader_phone: string | null;
  leader_email: string | null;

  leader_gender: string | null;
  leader_gender_other: string | null;
  leader_race: string | null;

  legal_rep_has_public_office: string | null;
  legal_rep_public_office_details: string | null;

  legal_rep_ran_for_political_office: string | null;
  legal_rep_political_office_details: string | null;

  legal_rep_criminal_declaration: string | null;

  filled_by_name: string | null;
  filled_by_phone: string | null;
  filled_by_email: string | null;

  edital_date: string | null;
  edital_code: string | null;
  edital_text: string | null;
};

export async function getQuestionnaireByOrgId(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_questionnaire")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return (data as OrganizationQuestionnaire | null) ?? null;
}

export async function upsertQuestionnaire(
  orgId: string,
  patch: Partial<OrganizationQuestionnaire>
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    organization_id: orgId,
    ...patch,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  };

  const { error } = await supabase
    .from("organization_questionnaire")
    .upsert(payload, {
      onConflict: "organization_id",
    });

  if (error) throw error;
}
