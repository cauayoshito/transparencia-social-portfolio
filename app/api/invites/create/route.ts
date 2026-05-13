import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CreateInviteBody = {
  organizationId?: string;
  email?: string;
  role?: "ORG_ADMIN" | "ORG_MEMBER";
  expiresInDays?: number;
};

type CreateOrgInviteRow = {
  invite_id: string;
  token: string;
  expires_at: string;
};

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    let body: CreateInviteBody;

    try {
      body = (await request.json()) as CreateInviteBody;
    } catch (error) {
      return NextResponse.json(
        { error: "Não foi possível ler os dados do convite.", details: error },
        { status: 400 }
      );
    }

    const organizationId = String(body.organizationId ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const role = body.role ?? "ORG_MEMBER";
    const expiresInDays = Number.isFinite(body.expiresInDays)
      ? Number(body.expiresInDays)
      : 7;

    if (!organizationId || !email) {
      return NextResponse.json(
        { error: "Preencha os campos obrigatórios: organização e e-mail." },
        { status: 400 }
      );
    }

    if (!isUuid(organizationId)) {
      return NextResponse.json(
        { error: "A organização informada é inválida." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido para enviar o convite." },
        { status: 400 }
      );
    }

    if (role !== "ORG_ADMIN" && role !== "ORG_MEMBER") {
      return NextResponse.json(
        { error: "O papel informado para o convite é inválido." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(expiresInDays) ||
      expiresInDays < 1 ||
      expiresInDays > 90
    ) {
      return NextResponse.json(
        {
          error: "A validade do convite deve ser um número entre 1 e 90 dias.",
        },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Faça login para gerar um convite." },
        { status: 401 }
      );
    }

    const rpcResponse = await supabase.rpc(
      "create_org_invite" as never,
      {
        p_organization_id: organizationId,
        p_email: email,
        p_role: role,
        p_expires_in_days: expiresInDays,
      } as never
    );

    const error = rpcResponse.error;
    const data = rpcResponse.data as
      | CreateOrgInviteRow
      | CreateOrgInviteRow[]
      | null;

    if (error) {
      const message = error.message ?? "Erro desconhecido";
      const lower = message.toLowerCase();

      if (lower.includes("not authenticated")) {
        return NextResponse.json(
          {
            error: "Faça login para gerar um convite.",
            details: message,
          },
          { status: 401 }
        );
      }

      if (lower.includes("not allowed")) {
        return NextResponse.json(
          {
            error:
              "Você não tem permissão para convidar membros nesta organização.",
            details: message,
          },
          { status: 403 }
        );
      }

      if (
        lower.includes("email") &&
        lower.includes("already") &&
        lower.includes("member")
      ) {
        return NextResponse.json(
          {
            error: "Este usuário já faz parte da organização.",
            details: message,
          },
          { status: 400 }
        );
      }

      if (
        lower.includes("invite") &&
        lower.includes("already") &&
        (lower.includes("pending") || lower.includes("exists"))
      ) {
        return NextResponse.json(
          {
            error:
              "Já existe um convite pendente para este e-mail. Gere um novo link ou aguarde o aceite.",
            details: message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Não foi possível gerar o convite agora.",
          details: message,
        },
        { status: 500 }
      );
    }

    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload) {
      return NextResponse.json(
        { error: "O convite foi criado, mas não retornou os dados esperados." },
        { status: 500 }
      );
    }

    const token = String(payload.token ?? "");
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "")
      .trim()
      .replace(/\/$/, "");

    const acceptUrl = appUrl
      ? `${appUrl}/accept-invite?token=${encodeURIComponent(token)}`
      : `/accept-invite?token=${encodeURIComponent(token)}`;

    return NextResponse.json(
      {
        inviteId: payload.invite_id,
        token,
        expiresAt: payload.expires_at,
        acceptUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Ocorreu um erro interno ao gerar o convite.",
        details:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      { status: 500 }
    );
  }
}
