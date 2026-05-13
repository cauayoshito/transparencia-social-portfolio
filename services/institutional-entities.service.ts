import { createClient } from "@/lib/supabase/server";
import type { Database, LinkedEntityType } from "@/types/database";

export type InstitutionalEntityRow =
  Database["public"]["Tables"]["institutional_entities"]["Row"];

export type CreateInstitutionalEntityInput = {
  organization_id: string;
  entity_type: LinkedEntityType;
  display_name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

function cleanNullable(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLinkedEntityType(
  value: string | null | undefined
): LinkedEntityType | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "empresa") return "empresa";
  if (normalized === "entidade_publica") return "entidade_publica";
  return null;
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

export async function listInstitutionalEntitiesForOrganizations(
  organizationIds: string[]
): Promise<InstitutionalEntityRow[]> {
  if (!Array.isArray(organizationIds) || organizationIds.length === 0) return [];

  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("institutional_entities")
    .select("*")
    .in("organization_id", organizationIds)
    .order("display_name", { ascending: true });

  if (error) {
    throw serviceError(
      "Falha ao listar entidades institucionais",
      error,
      "institutional_entities.selectMany"
    );
  }

  return (data ?? []) as InstitutionalEntityRow[];
}

export async function listInstitutionalEntitiesForOrganization(
  organizationId: string
): Promise<InstitutionalEntityRow[]> {
  const orgId = String(organizationId ?? "").trim();
  if (!orgId) return [];

  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("institutional_entities")
    .select("*")
    .eq("organization_id", orgId)
    .order("display_name", { ascending: true });

  if (error) {
    throw serviceError(
      "Falha ao listar entidades da organização",
      error,
      "institutional_entities.selectByOrganization"
    );
  }

  return (data ?? []) as InstitutionalEntityRow[];
}

export async function getInstitutionalEntityByIdForOrganization(
  entityId: string,
  organizationId: string
): Promise<InstitutionalEntityRow | null> {
  const safeEntityId = String(entityId ?? "").trim();
  const safeOrganizationId = String(organizationId ?? "").trim();

  if (!safeEntityId || !safeOrganizationId) return null;

  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("institutional_entities")
    .select("*")
    .eq("id", safeEntityId)
    .eq("organization_id", safeOrganizationId)
    .maybeSingle();

  if (error) {
    throw serviceError(
      "Falha ao buscar a entidade vinculada",
      error,
      "institutional_entities.selectById"
    );
  }

  return (data as InstitutionalEntityRow | null) ?? null;
}

export async function createInstitutionalEntity(
  payload: CreateInstitutionalEntityInput,
  userId?: string
): Promise<InstitutionalEntityRow> {
  const supabase = createClient() as any;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw serviceError(
      "Usuário não autenticado",
      authError ?? "Sem user",
      "auth.getUser"
    );
  }

  const organizationId = String(payload.organization_id ?? "").trim();
  const displayName = String(payload.display_name ?? "").trim();
  const entityType = normalizeLinkedEntityType(payload.entity_type);
  const effectiveUserId = userId ?? user.id;

  if (!organizationId) {
    throw new Error("Selecione a organização da entidade.");
  }

  if (!entityType) {
    throw new Error("Selecione o tipo da entidade.");
  }

  if (!displayName) {
    throw new Error("Informe o nome da empresa ou entidade pública.");
  }

  const { data, error } = await supabase
    .from("institutional_entities")
    .insert({
      organization_id: organizationId,
      entity_type: entityType,
      display_name: displayName,
      legal_name: cleanNullable(payload.legal_name),
      tax_id: cleanNullable(payload.tax_id),
      contact_email: cleanNullable(payload.contact_email),
      contact_phone: cleanNullable(payload.contact_phone),
      created_by: effectiveUserId,
      updated_by: effectiveUserId,
    })
    .select("*")
    .single();

  if (error) {
    const code = (error as { code?: string }).code;

    if (code === "23505") {
      throw new Error(
        "Já existe uma entidade com este nome e tipo nesta organização."
      );
    }

    throw serviceError(
      "Falha ao cadastrar a entidade",
      error,
      "institutional_entities.insert"
    );
  }

  return data as InstitutionalEntityRow;
}
