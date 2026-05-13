"use client";

import { useEffect, useCallback, useRef } from "react";

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
 */
export default function UnsavedChangesGuard({
  children,
  tabLinksSelector = 'a[href*="?tab="]',
}: {
  children: React.ReactNode;
  tabLinksSelector?: string;
}) {
  const dirtyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mark dirty on any input change
  const handleChange = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  // Reset on form submit
  const handleSubmit = useCallback(() => {
    dirtyRef.current = false;
  }, []);

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

    el.addEventListener("input", handleChange);
    el.addEventListener("change", handleChange);
    el.addEventListener("submit", handleSubmit);

    return () => {
      el.removeEventListener("input", handleChange);
      el.removeEventListener("change", handleChange);
      el.removeEventListener("submit", handleSubmit);
    };
  }, [handleChange, handleSubmit]);

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

  return <div ref={containerRef}>{children}</div>;
}
