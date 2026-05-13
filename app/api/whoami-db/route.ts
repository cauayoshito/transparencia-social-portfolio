import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  const { data: dbUid, error: dbUidError } = await supabase.rpc(
    "phi_debug_auth_uid"
  ); // vamos criar essa função já já

  return NextResponse.json({
    appUser: userData?.user ?? null,
    dbAuthUid: dbUid ?? null,
    dbUidError: dbUidError?.message ?? null,
  });
}
