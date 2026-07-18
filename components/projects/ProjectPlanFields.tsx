"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  autosaveProjectPlanAction,
  type AutosaveProjectPlanResult,
} from "@/app/actions/project-plan.actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  projectId: string;
  initialObjective: string;
  initialMethodology: string;
  readOnly?: boolean;
};

const AUTOSAVE_DEBOUNCE_MS = 1000;

export default function ProjectPlanFields({
  projectId,
  initialObjective,
  initialMethodology,
  readOnly = false,
}: Props) {
  const [objective, setObjective] = useState(initialObjective);
  const [methodology, setMethodology] = useState(initialMethodology);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda o último conteúdo persistido para evitar salvamentos redundantes.
  const lastSavedRef = useRef({
    objective: initialObjective,
    methodology: initialMethodology,
  });

  const persist = useCallback(
    async (nextObjective: string, nextMethodology: string) => {
      if (
        nextObjective === lastSavedRef.current.objective &&
        nextMethodology === lastSavedRef.current.methodology
      ) {
        return;
      }

      setStatus("saving");
      setErrorMessage(null);

      let result: AutosaveProjectPlanResult;
      try {
        result = await autosaveProjectPlanAction({
          projectId,
          objective: nextObjective,
          methodology: nextMethodology,
        });
      } catch {
        setStatus("error");
        setErrorMessage("Falha de conexão ao salvar. Tente novamente.");
        return;
      }

      if (result.ok) {
        lastSavedRef.current = {
          objective: nextObjective,
          methodology: nextMethodology,
        };
        setStatus("saved");
      } else {
        setStatus("error");
        setErrorMessage(result.error ?? "Não foi possível salvar o plano.");
      }
    },
    [projectId]
  );

  // Debounce: agenda autosave a cada alteração.
  useEffect(() => {
    if (readOnly) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void persist(objective, methodology);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [objective, methodology, persist, readOnly]);

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-900">
            Objetivo / Descrição
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {objective.trim() ? (
              objective
            ) : (
              <span className="italic text-slate-400">Não informado</span>
            )}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-900">Metodologia</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {methodology.trim() ? (
              methodology
            ) : (
              <span className="italic text-slate-400">Não informada</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label
            htmlFor="plan-objective"
            className="block text-sm font-medium text-slate-900"
          >
            Objetivo / Descrição
          </label>
          <SaveIndicator status={status} />
        </div>
        <textarea
          id="plan-objective"
          name="objective"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          className="min-h-[140px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-300"
          placeholder="Descreva com clareza o objetivo principal e a descrição do projeto."
        />
        <p className="mt-2 text-xs text-slate-500">
          Card livre para registrar a direção central do projeto nesta fase.
        </p>
      </div>

      <div>
        <label
          htmlFor="plan-methodology"
          className="mb-2 block text-sm font-medium text-slate-900"
        >
          Metodologia
        </label>
        <textarea
          id="plan-methodology"
          name="methodology"
          value={methodology}
          onChange={(event) => setMethodology(event.target.value)}
          className="min-h-[140px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-300"
          placeholder="Descreva como o projeto será executado: etapas, métodos, abordagem e recursos."
        />
        <p className="mt-2 text-xs text-slate-500">
          Explique de que forma o projeto será conduzido na prática.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <p className="text-xs text-slate-400">
        As alterações são salvas automaticamente conforme você digita.
      </p>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return <span className="text-xs text-slate-500">Salvando…</span>;
  }
  if (status === "saved") {
    return <span className="text-xs text-emerald-600">Salvo ✓</span>;
  }
  if (status === "error") {
    return <span className="text-xs text-rose-600">Erro ao salvar</span>;
  }
  return null;
}
