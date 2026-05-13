import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CreateInviteBody = {
  entityId?: string;
  email?: string;
  role?: "ENTITY_ADMIN" | "ENTITY_MEMBER";
  expiresInDays?: number;
};

type CreateEntityInviteRow = {
  invite_id: string;
  token: string;
  expires_at: string;
  entity_id: string;
  organization_id: string;
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
        { error: "Nao foi possivel ler os dados do convite.", details: error },
        { status: 400 }
      );
    }

    const entityId = String(body.entityId ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const role = body.role ?? "ENTITY_MEMBER";
    const expiresInDays = Number.isFinite(body.expiresInDays)
      ? Number(body.expiresInDays)
      : 7;

    if (!entityId || !email) {
      return NextResponse.json(
        { error: "Preencha os campos obrigatorios: entidade e e-mail." },
        { status: 400 }
      );
    }

    if (!isUuid(entityId)) {
      return NextResponse.json(
        { error: "A entidade informada e invalida." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail valido para gerar o convite." },
        { status: 400 }
      );
    }

    if (role !== "ENTITY_ADMIN" && role !== "ENTITY_MEMBER") {
      return NextResponse.json(
        { error: "O papel informado para o convite e invalido." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(expiresInDays) ||
      expiresInDays < 1 ||
      expiresInDays > 90
    ) {
      return NextResponse.json(
        { error: "A validade do convite deve ficar entre 1 e 90 dias." },
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
        { error: "Faca login para gerar um convite." },
        { status: 401 }
      );
    }

    const rpcResponse = await supabase.rpc(
      "create_institutional_entity_invite" as never,
      {
        p_entity_id: entityId,
        p_email: email,
        p_role: role,
        p_expires_in_days: expiresInDays,
      } as never
    );

    const error = rpcResponse.error;
    const data = rpcResponse.data as
      | CreateEntityInviteRow
      | CreateEntityInviteRow[]
      | null;

    if (error) {
      const message = error.message ?? "Erro desconhecido";
      const lower = message.toLowerCase();

      if (lower.includes("not authenticated")) {
        return NextResponse.json(
          { error: "Faca login para gerar um convite.", details: message },
          { status: 401 }
        );
      }

      if (lower.includes("not allowed")) {
        return NextResponse.json(
          {
            error: "Voce nao tem permissao para convidar membros nesta entidade.",
            details: message,
          },
          { status: 403 }
        );
      }

      if (lower.includes("already linked")) {
        return NextResponse.json(
          {
            error: "Este e-mail ja possui vinculo ativo com a entidade.",
            details: message,
          },
          { status: 400 }
        );
      }

      if (lower.includes("duplicate key") || lower.includes("pending")) {
        return NextResponse.json(
          {
            error:
              "Ja existe um convite pendente para este e-mail nesta entidade.",
            details: message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Nao foi possivel gerar o convite agora.",
          details: message,
        },
        { status: 500 }
      );
    }

    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload) {
      return NextResponse.json(
        { error: "O convite foi criado, mas nao retornou os dados esperados." },
        { status: 500 }
      );
    }

    const token = String(payload.token ?? "");
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "")
      .trim()
      .replace(/\/$/, "");

    const acceptUrl = appUrl
      ? `${appUrl}/accept-entity-invite?token=${encodeURIComponent(token)}`
      : `/accept-entity-invite?token=${encodeURIComponent(token)}`;

    return NextResponse.json(
      {
        inviteId: payload.invite_id,
        token,
        expiresAt: payload.expires_at,
        entityId: payload.entity_id,
        organizationId: payload.organization_id,
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
