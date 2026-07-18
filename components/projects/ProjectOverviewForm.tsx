import { updateProjectExtendedAction } from "@/app/actions/project-extended.actions";

type ProjectLike = {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
  state_uf?: string | null;
  area_of_action?: string | null;
  total_value?: number | null;
  people_served?: number | null;
  coordinator_name?: string | null;
  observations?: string | null;
  is_incentivado?: boolean | null;
  target_audience?: string[] | null;
};

type Props = {
  project: ProjectLike;
};

// Item 6: opções fixas de área de atuação.
const AREA_OPTIONS = [
  "Educação",
  "Esporte",
  "Cultura",
  "Assistência Social",
  "Outros",
];

// Item 5: público-alvo (inclui criança, adolescente, idoso). Chaves alinhadas
// com as lidas em updateProjectExtendedAction (audience_<chave>).
const AUDIENCE_OPTIONS: { key: string; label: string }[] = [
  { key: "criancas", label: "Crianças" },
  { key: "adolescentes", label: "Adolescentes" },
  { key: "jovens", label: "Jovens" },
  { key: "adultos", label: "Adultos" },
  { key: "idosos", label: "Idosos" },
  { key: "mulheres", label: "Mulheres" },
  { key: "familias", label: "Famílias" },
  { key: "pessoas_rua", label: "Pessoas em situação de rua" },
  { key: "apenados", label: "Apenados e egressos" },
  { key: "grupos_minorizados", label: "Grupos minorizados" },
  { key: "migrantes", label: "Migrantes" },
  { key: "pcd", label: "Pessoas com deficiência" },
  { key: "professores", label: "Professores e facilitadores" },
  { key: "outros", label: "Outros" },
];

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toAmountInput(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProjectOverviewForm({ project }: Props) {
  const selectedAudiences = new Set(project.target_audience ?? []);
  const currentArea = String(project.area_of_action ?? "").trim();
  const areaIsCustom = currentArea.length > 0 && !AREA_OPTIONS.includes(currentArea);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white sm:px-6">
        Dados cadastrais do projeto
      </div>

      <form action={updateProjectExtendedAction} className="space-y-5 p-4 sm:p-6">
        <input type="hidden" name="project_id" value={project.id} />

        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Esta seção fica editável até o envio do projeto para análise. Depois de
          enviado, os dados ficam somente leitura.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Data de início
            </span>
            <input
              type="date"
              name="start_date"
              defaultValue={toDateInput(project.start_date)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Data de término
            </span>
            <input
              type="date"
              name="end_date"
              defaultValue={toDateInput(project.end_date)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              UF do projeto
            </span>
            <input
              name="state_uf"
              maxLength={2}
              placeholder="Ex: SP"
              defaultValue={project.state_uf ?? ""}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase"
            />
          </label>

          {/* Item 6: Área de atuação com opções fixas */}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Área de atuação
            </span>
            <select
              name="area_of_action"
              defaultValue={currentArea}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {AREA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {areaIsCustom && (
                <option value={currentArea}>{currentArea}</option>
              )}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Valor total (R$)
            </span>
            <input
              name="total_value"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={toAmountInput(project.total_value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {/* Item 5: Quantidade de beneficiários — bloco livre */}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Quantidade de beneficiários
            </span>
            <input
              name="people_served"
              type="number"
              min={0}
              placeholder="Ex: 120"
              defaultValue={
                project.people_served != null ? String(project.people_served) : ""
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Coordenador/Gerente
            </span>
            <input
              name="coordinator_name"
              placeholder="Nome do responsável"
              defaultValue={project.coordinator_name ?? ""}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm sm:mt-6">
            <input
              type="checkbox"
              name="is_incentivado"
              defaultChecked={project.is_incentivado === true}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="font-medium text-slate-600">
              Projeto incentivado
            </span>
          </label>
        </div>

        {/* Item 5: Público-alvo */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Público-alvo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  name={`audience_${opt.key}`}
                  defaultChecked={selectedAudiences.has(opt.key)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Observações
          </span>
          <textarea
            name="observations"
            rows={3}
            defaultValue={project.observations ?? ""}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Salvar dados cadastrais
          </button>
        </div>
      </form>
    </section>
  );
}
