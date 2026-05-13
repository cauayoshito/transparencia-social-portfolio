import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, step: "getUser", userErr },
      { status: 401 }
    );
  }

  const orgId = "50dc2919-fd27-49a9-8bea-9bb326f538eb";

  const { data, error } = await supabase.rpc("debug_projects_insert_check", {
    p_org_id: orgId,
    p_created_by: user.id,
  });

  return NextResponse.json({ ok: !error, userId: user.id, data, error });
}
