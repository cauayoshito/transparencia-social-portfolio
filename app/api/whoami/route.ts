import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const { data: userRes } = await supabase.auth.getUser();
  const { data: sessionRes } = await supabase.auth.getSession();

  return NextResponse.json({
    user: userRes?.user
      ? { id: userRes.user.id, email: userRes.user.email }
      : null,
    hasSession: Boolean(sessionRes?.session),
  });
}
