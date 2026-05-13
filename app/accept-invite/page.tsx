import AcceptInviteForm from "./AcceptInviteForm";

type Props = {
  searchParams?: { token?: string | string[] };
};

function readToken(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  return "";
}

export default function AcceptInvitePage({ searchParams }: Props) {
  const token = readToken(searchParams?.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AcceptInviteForm initialToken={token} />
    </main>
  );
}

