import { PROJECT_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/status";

type Props = {
  status: string;
  type?: "project" | "report";
};

export default function StatusBadge({ status, type = "project" }: Props) {
  const label =
    type === "project"
      ? (PROJECT_STATUS_LABEL as any)[status] ?? status
      : (REPORT_STATUS_LABEL as any)[status] ?? status;

  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ENVIADO: "bg-blue-100 text-blue-700",
    EM_ANALISE: "bg-yellow-100 text-yellow-700",
    APROVADO: "bg-green-100 text-green-700",
    DEVOLVIDO: "bg-red-100 text-red-700",

    SUBMITTED: "bg-blue-100 text-blue-700",
    RETURNED: "bg-red-100 text-red-700",
    APPROVED: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        colors[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {label}
    </span>
  );
}
