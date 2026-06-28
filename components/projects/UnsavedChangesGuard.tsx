"use client";

import { useEffect, useCallback, useRef, useState } from "react";

type AutosaveResult = { ok: boolean; error?: string };
type SaveState = "idle" | "saving" | "saved";

/**
 * UnsavedChangesGuard
 *
 * Monitors form inputs inside the container and warns the user
 * before they navigate away with unsaved changes.
 *
 * Works by:
 * 1. Listening for `input` / `change` events inside the wrapper
 * 2. Tracking "dirty" state (any change since last reset)
 * 3. Intercepting `beforeunload` (browser tab close / refresh)
 * 4. Intercepting clicks on navigation links (tab links within the project)
 *
 * Resets dirty state when a form is submitted (captures `submit` event).
 *
 * Autosave (opcional):
 * - Se `autosaveAction` for fornecido, alterações dentro do form que casa com
 *   `autosaveFormSelector` disparam um debounce de `autosaveDelay` ms e então
 *   salvam silenciosamente, exibindo um indicador discreto no canto superior
 *   direito ("Salvando..." / "Salvo automaticamente").
 */
export default function UnsavedChangesGuard({
  children,
  tabLinksSelector = 'a[href*="?tab="]',
  autosaveAction,
  autosaveFormSelector = 'form[data-autosave="plan"]',
  autosaveDelay = 3000,
}: {
  children: React.ReactNode;
  tabLinksSelector?: string;
  autosaveAction?: (formData: FormData) => Promise<AutosaveResult>;
  autosaveFormSelector?: string;
  autosaveDelay?: number;
}) {
  const dirtyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  // Mark dirty on any input change
  const handleChange = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  // Reset on form submit
  const handleSubmit = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  // Autosave silencioso do form do plano
  const runAutosave = useCallback(async () => {
    if (!autosaveAction || !containerRef.current) return;

    const form = containerRef.current.querySelector<HTMLFormElement>(
      autosaveFormSelector
    );
    if (!form) return;

    const formData = new FormData(form);
    // Evita salvar duas vezes o mesmo conteúdo.
    const snapshot = JSON.stringify(
      Array.from(formData.entries()).filter(([k]) => k !== "project_id")
    );
    if (snapshot === lastSavedRef.current) return;

    setSaveState("saving");
    try {
      const result = await autosaveAction(formData);
      if (result.ok) {
        lastSavedRef.current = snapshot;
        dirtyRef.current = false;
        setSaveState("saved");
        if (savedHideRef.current) clearTimeout(savedHideRef.current);
        savedHideRef.current = setTimeout(() => setSaveState("idle"), 2500);
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  }, [autosaveAction, autosaveFormSelector]);

  // Intercept beforeunload
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Listen for input/change/submit inside container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onInput(e: Event) {
      handleChange();

      if (!autosaveAction) return;
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest(autosaveFormSelector)) return;

      // (Re)inicia o debounce a cada alteração no form do plano.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(runAutosave, autosaveDelay);
    }

    el.addEventListener("input", onInput);
    el.addEventListener("change", onInput);
    el.addEventListener("submit", handleSubmit);

    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("change", onInput);
      el.removeEventListener("submit", handleSubmit);
    };
  }, [
    handleChange,
    handleSubmit,
    runAutosave,
    autosaveAction,
    autosaveFormSelector,
    autosaveDelay,
  ]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedHideRef.current) clearTimeout(savedHideRef.current);
    };
  }, []);

  // Intercept tab link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dirtyRef.current) return;

      const target = (e.target as HTMLElement).closest(tabLinksSelector);
      if (!target) return;

      const confirmed = window.confirm(
        "Você tem alterações não salvas. Deseja sair sem salvar?"
      );

      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        dirtyRef.current = false;
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [tabLinksSelector]);

  return (
    <div ref={containerRef}>
      {autosaveAction && saveState !== "idle" && (
        <div
          aria-live="polite"
          className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur"
        >
          {saveState === "saving" ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Salvando...
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Salvo automaticamente
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
