import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type LogActionOptions = {
  softFail?: boolean;
};

export async function logAction(
  action: string,
  entityType: string,
  entityId: string,
  metadata: Json = {},
  actorUserId: string,
  options?: LogActionOptions
): Promise<void> {
  const failHard = process.env.NODE_ENV === "development" && !options?.softFail;
  const onFailure = (message: string): void => {
    if (failHard) {
      throw new Error(message);
    }

    console.error(`[Audit] ${message}`);
  };

  const normalizedAction = action.trim();
  const normalizedEntityType = entityType.trim();
  const normalizedEntityId = entityId.trim();
  const normalizedActorUserId = actorUserId.trim();
  if (!normalizedAction || !normalizedEntityType || !normalizedEntityId || !normalizedActorUserId) {
    return onFailure("Falha ao registrar auditoria: action, entityType, entityId e actorUserId sao obrigatorios.");
  }

  if (!isUuidLike(normalizedEntityId)) {
    return onFailure(`Falha ao registrar auditoria: entityId invalido (${normalizedEntityId}).`);
  }

  if (!isUuidLike(normalizedActorUserId)) {
    return onFailure(`Falha ao registrar auditoria: actorUserId invalido (${normalizedActorUserId}).`);
  }

  const supabase = createClient();
  const { error } = await supabase.from("audit_logs").insert({
    action: normalizedAction,
    entity_type: normalizedEntityType,
    entity_id: normalizedEntityId,
    metadata,
    actor_user_id: normalizedActorUserId,
  });

  if (error) {
    return onFailure(`Falha ao registrar auditoria em audit_logs: ${error.message}`);
  }
}
