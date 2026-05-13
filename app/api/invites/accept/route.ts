import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AcceptInviteBody = {
  token?: string;
};

type AcceptOrgInviteRow = {
  organization_id?: string;
  organizationId?: string;
  role?: string;
};

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function POST(request: Request) {
  try {
    let body: AcceptInviteBody;

    try {
      body = (await request.json()) as AcceptInviteBody;
    } catch (error) {
      return NextResponse.json(
        { error: "Não foi possível ler os dados do convite.", details: error },
        { status: 400 }
      );
    }

    const token = String(body.token ?? "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Informe o token do convite." },
        { status: 400 }
      );
    }

    if (!isUuid(token)) {
      return NextResponse.json(
        { error: "O token informado é inválido." },
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
        { error: "Faça login para aceitar este convite." },
        { status: 401 }
      );
    }

    const rpcResponse = await supabase.rpc(
      "accept_org_invite" as never,
      {
        p_token: token,
      } as never
    );

    const error = rpcResponse.error;
    const data = rpcResponse.data as
      | AcceptOrgInviteRow
      | AcceptOrgInviteRow[]
      | null;

    if (error) {
      const message = error.message ?? "Erro desconhecido";
      const lower = message.toLowerCase();

      if (lower.includes("not authenticated")) {
        return NextResponse.json(
          {
            error: "Faça login para aceitar este convite.",
            details: message,
          },
          { status: 401 }
        );
      }

      if (lower.includes("user email not found")) {
        return NextResponse.json(
          {
            error:
              "Não foi possível identificar o e-mail da sua conta. Entre novamente e tente de novo.",
            details: message,
          },
          { status: 400 }
        );
      }

      if (lower.includes("invite email does not match logged user")) {
        return NextResponse.json(
          {
            error:
              "Este convite foi enviado para outro e-mail. Entre com a conta correta para continuar.",
            details: message,
          },
          { status: 400 }
        );
      }

      if (lower.includes("invalid invite token")) {
        return NextResponse.json(
          {
            error: "O link de convite é inválido ou foi alterado.",
            details: message,
          },
          { status: 400 }
        );
      }

      if (lower.includes("invite expired")) {
        return NextResponse.json(
          {
            error: "Este convite expirou. Peça um novo link de acesso.",
            details: message,
          },
          { status: 400 }
        );
      }

      if (lower.includes("invite already accepted")) {
        return NextResponse.json(
          {
            error: "Este convite já foi utilizado.",
            details: message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Não foi possível aceitar o convite agora.",
          details: message,
        },
        { status: 500 }
      );
    }

    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload) {
      return NextResponse.json(
        {
          error:
            "O convite foi processado, mas não retornou os dados esperados.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        organizationId:
          payload.organization_id ?? payload.organizationId ?? null,
        role: payload.role ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[accept-invite] route error:", error);

    return NextResponse.json(
      {
        error: "Ocorreu um erro interno ao aceitar o convite.",
        details:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      { status: 500 }
    );
  }
}
