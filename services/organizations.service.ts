import { createClient } from "@/lib/supabase/server";

export type Organization = {
  id: string;
  name: string | null;

  // Legado/atual: vamos tratar como tax_id
  document: string | null;
  tax_id_type: string | null;

  legal_name: string | null;
  foundation_date: string | null;

  profile_type: string | null;
  profile_other: string | null;

  email: string | null;
  facebook: string | null;
  instagram: string | null;
  site: string | null;
  linkedin: string | null;

  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  pix_key: string | null;

  logo_path: string | null;

  responsible_user_id: string | null;

  updated_at: string | null;
  updated_by: string | null;

  created_at?: string | null;
};

export type OrgMemberRow = {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
};

export type ProfileLite = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export async function listOrganizationsForUser(orgIds: string[]) {
  if (!Array.isArray(orgIds) || orgIds.length === 0) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      created_at,
      updated_at
    `
    )
    .in("id", orgIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Array<
    Pick<Organization, "id" | "name" | "created_at" | "updated_at">
  >;
}

export async function getOrganizationByIdForUser(orgId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(
  orgId: string,
  patch: Partial<Organization>
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("organizations")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq("id", orgId);

  if (error) throw error;
}

export async function listOrganizationMembers(
  orgId: string
): Promise<OrgMemberRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("user_id, role, profiles(full_name, email)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    user_id: row.user_id as string,
    role: row.role as string,
    full_name: (row.profiles?.full_name ?? null) as string | null,
    email: (row.profiles?.email ?? null) as string | null,
  }));
}

export async function getProfileById(profileId: string): Promise<ProfileLite> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", profileId)
    .single();

  if (error) throw error;
  return data as ProfileLite;
}
