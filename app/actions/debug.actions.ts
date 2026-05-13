"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";

export async function debugAuthContext(orgId: string) {
  const supabase = createClient();

  const appUser = await requireUser();
  const {
    data: { user: sbUser },
    error: sbErr,
  } = await supabase.auth.getUser();

  const { data: isMember, error: rpcErr } = await supabase.rpc(
    "is_org_member",
    {
      org_id: orgId,
    }
  );

  return {
    requireUser_id: appUser.id,
    supabase_getUser_id: sbUser?.id ?? null,
    supabase_getUser_error: sbErr?.message ?? null,
    rpc_is_org_member: isMember ?? null,
    rpc_error: rpcErr?.message ?? null,
  };
}
