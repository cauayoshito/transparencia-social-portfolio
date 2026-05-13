import AcceptEntityInviteForm from "./AcceptEntityInviteForm";

type Props = {
  searchParams?: { token?: string | string[] };
};

function readToken(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  return "";
}

export default function AcceptEntityInvitePage({ searchParams }: Props) {
  const token = readToken(searchParams?.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <AcceptEntityInviteForm initialToken={token} />
    </main>
  );
}
