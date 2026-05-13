import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const { data: userRes } = await supabase.auth.getUser();

  const { data: jwt, error } = await supabase.rpc("debug_jwt");

  return NextResponse.json({
    authUser: userRes.user
      ? { id: userRes.user.id, email: userRes.user.email }
      : null,
    dbJwt: jwt ?? null,
    dbJwtError: error ? { message: error.message, code: error.code } : null,
  });
}
