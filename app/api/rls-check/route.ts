import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id ?? null;

  const { data: memberships, error: memErr } = await supabase
    .schema("public")
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId ?? "");

  const orgId = memberships?.[0]?.organization_id ?? null;

  const { data: orgCheck, error: orgErr } = orgId
    ? await supabase.rpc("is_org_member", { org_id: orgId })
    : { data: null, error: null };

  // bônus: pega auth.uid() direto do banco
  const { data: uidDb, error: uidDbErr } = await supabase.rpc("debug_auth_uid");

  return NextResponse.json({
    userId,
    memberships,
    memErr: memErr?.message ?? null,
    orgId,
    isOrgMember: orgCheck,
    orgErr: orgErr?.message ?? null,
    dbAuthUid: uidDb,
    uidDbErr: uidDbErr?.message ?? null,
  });
}
