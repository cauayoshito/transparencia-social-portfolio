"use client";

import Link from "next/link";
import { useState } from "react";

type ProjectType = "INCENTIVADO" | "RECURSOS_PUBLICOS" | "RECURSOS_PROPRIOS";

type OrganizationOption = {
  id: string;
  label: string;
};

/** Vínculo ativo entre a organização e um financiador */
type FinancierLinkOption = {
  id: string;
  investor_id: string;
  investor_name: string;
  organization_id: string;
  is_legacy: boolean;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  organizations: OrganizationOption[];
  financierLinks: FinancierLinkOption[];
  defaultOrganizationId: string;
  canSubmit: boolean;
};

function projectTypeLabel(type: ProjectType) {
  if (type === "INCENTIVADO") return "Incentivos Fiscais";
  if (type === "RECURSOS_PUBLICOS") return "Recursos Públicos";
  return "Recursos Próprios";
}

export default function NewProjectForm({
  action,
  organizations,
  financierLinks,
  defaultOrganizationId,
  canSubmit,
}: Props) {
  const initialOrganizationId =
    defaultOrganizationId || organizations[0]?.id || "";

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    initialOrganizationId
  );
  const [selectedLinkId, setSelectedLinkId] = useState("");

  // Filtra vínculos da org selecionada
  const filteredLinks = financierLinks.filter(
    (link) => link.organization_id === selectedOrganizationId
  );

  const isSubmitDisabled =
    !canSubmit ||
    !selectedOrganizationId ||
    filteredLinks.length === 0 ||
    !selectedLinkId;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Dados iniciais do projeto
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Todo projeto precisa estar vinculado a um financiador ativo da
          organização.
        </p>
      </div>

      <form action={action} className="space-y-6 p-4 sm:p-5">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Nome do projeto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Nome do projeto
            </label>
            <input
              name="title"
              placeholder="Ex: Educação no Trânsito também é coisa de Criança"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          {/* Organização */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Organização
            </label>
            <select
              name="organization_id"
              value={selectedOrganizationId}
              onChange={(e) => {
                setSelectedOrganizationId(e.target.value);
                setSelectedLinkId("");
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            >
              {organizations.length === 0 ? (
                <option value="">Você ainda não tem organização vinculada</option>
              ) : (
                organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Modelo do projeto */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Modelo do projeto
            </label>
            <select
              name="project_type"
              defaultValue="INCENTIVADO"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="INCENTIVADO">
                {projectTypeLabel("INCENTIVADO")}
              </option>
              <option value="RECURSOS_PUBLICOS">
                {projectTypeLabel("RECURSOS_PUBLICOS")}
              </option>
              <option value="RECURSOS_PROPRIOS">
                {projectTypeLabel("RECURSOS_PROPRIOS")}
              </option>
            </select>
          </div>

          {/* Financiador vinculado */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Financiador vinculado
            </label>
            <select
              name="financier_link_id"
              value={selectedLinkId}
              onChange={(e) => setSelectedLinkId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="" disabled>
                {filteredLinks.length === 0
                  ? "Nenhum financiador ativo nesta organização"
                  : "Selecione o financiador"}
              </option>
              {filteredLinks.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.investor_name}
                  {link.is_legacy ? " (legado)" : ""}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Apenas financiadores que convidaram esta organização aparecem
              na lista. Ao trocar de organização, o financiador é limpo.
            </p>

            {selectedOrganizationId && filteredLinks.length === 0 && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Sua organização ainda não tem nenhum financiador ativo.
                Aguarde o convite de um financiador antes de criar projetos.
              </div>
            )}
          </div>

          {/* Status (somente leitura) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Status inicial
            </label>
            <input
              value="Rascunho"
              readOnly
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600"
            />
          </div>

          {/* Descrição */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Resumo do projeto (opcional)
            </label>
            <textarea
              name="description"
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Escreva um resumo curto para contextualizar este projeto..."
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Ao criar o projeto, o sistema registra o vínculo com o financiador
          selecionado e salva os dados de identificação no próprio projeto.
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/dashboard/projects"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            Criar projeto
          </button>
        </div>
      </form>
    </section>
  );
}
