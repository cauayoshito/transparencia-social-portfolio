import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type InstitutionalEntityInviteRow =
  Database["public"]["Tables"]["institutional_entity_invites"]["Row"];

export type InstitutionalEntityMembershipRow =
  Database["public"]["Tables"]["institutional_entity_memberships"]["Row"];

type EntityMemberProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type InstitutionalEntityInviteListItem = InstitutionalEntityInviteRow & {
  entity?: {
    id: string;
    display_name: string | null;
  } | null;
};

export type InstitutionalEntityMembershipListItem =
  InstitutionalEntityMembershipRow & {
    profile?: {
      full_name: string | null;
      email: string | null;
    } | null;
  };

function serviceError(base: string, raw: unknown, context: string) {
  const anyRaw = raw as { message?: string } | null;
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

async function syncExpiredInstitutionalEntityInvites(entityIds: string[]) {
  if (!Array.isArray(entityIds) || entityIds.length === 0) return;

  const supabase = createClient() as any;

  const { error } = await supabase
    .from("institutional_entity_invites")
    .update({
      status: "EXPIRED",
      updated_at: new Date().toISOString(),
    })
    .in("entity_id", entityIds)
    .eq("status", "PENDING")
    .lt("expires_at", new Date().toISOString());

  if (error) {
    throw serviceError(
      "Falha ao atualizar convites expirados",
      error,
      "institutional_entity_invites.syncExpired"
    );
  }
}

export async function listInstitutionalEntityInvites(
  entityIds: string[]
): Promise<InstitutionalEntityInviteListItem[]> {
  if (!Array.isArray(entityIds) || entityIds.length === 0) return [];

  await syncExpiredInstitutionalEntityInvites(entityIds);

  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("institutional_entity_invites")
    .select("*, entity:institutional_entities(id, display_name)")
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw serviceError(
      "Falha ao listar convites das entidades",
      error,
      "institutional_entity_invites.select"
    );
  }

  return (data ?? []) as InstitutionalEntityInviteListItem[];
}

export async function listInstitutionalEntityMembers(
  entityIds: string[]
): Promise<InstitutionalEntityMembershipListItem[]> {
  if (!Array.isArray(entityIds) || entityIds.length === 0) return [];

  const supabase = createClient() as any;

  const { data: memberships, error: membershipsError } = await supabase
    .from("institutional_entity_memberships")
    .select("id, entity_id, user_id, role, status, created_at, created_by")
    .in("entity_id", entityIds)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw serviceError(
      "Falha ao listar membros das entidades",
      membershipsError,
      "institutional_entity_memberships.select"
    );
  }

  const membershipRows = (memberships ??
    []) as InstitutionalEntityMembershipRow[];

  if (membershipRows.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(
      membershipRows.map((membership) => membership.user_id).filter(Boolean)
    )
  );

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesError) {
    throw serviceError(
      "Falha ao buscar perfis dos membros da entidade",
      profilesError,
      "profiles.selectEntityMembers"
    );
  }

  const profileRows = (profiles ?? []) as EntityMemberProfile[];

  const profilesMap = new Map<string, EntityMemberProfile>(
    profileRows.map((profile) => [profile.id, profile])
  );

  return membershipRows.map((membership) => {
    const profile = profilesMap.get(membership.user_id);

    return {
      ...membership,
      profile: {
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
      },
    };
  });
}

export async function revokeInstitutionalEntityInvite(
  inviteId: string,
  userId?: string
): Promise<void> {
  const safeInviteId = String(inviteId ?? "").trim();
  if (!safeInviteId) {
    throw new Error("Informe o convite que deve ser revogado.");
  }

  const supabase = createClient() as any;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw serviceError(
      "Usuario nao autenticado",
      authError ?? "Sem user",
      "auth.getUser"
    );
  }

  const effectiveUserId = userId ?? user.id;

  const { data, error } = await supabase
    .from("institutional_entity_invites")
    .update({
      status: "REVOKED",
      revoked_at: new Date().toISOString(),
      updated_by: effectiveUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", safeInviteId)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (error) {
    throw serviceError(
      "Falha ao revogar o convite",
      error,
      "institutional_entity_invites.revoke"
    );
  }

  if (!data?.id) {
    throw new Error("Convite pendente nao encontrado para revogacao.");
  }
}
