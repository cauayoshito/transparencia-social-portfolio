"use client";

/**
 * Barra de ações da página de impressão do relatório.
 * "Exportar PDF" abre o diálogo de impressão do navegador — o usuário
 * escolhe "Salvar como PDF" (mesmo fluxo do botão Imprimir do PHI).
 * Oculta na impressão via classe print:hidden.
 */
export default function PrintReportButton() {
  return (
    <div className="flex items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ← Voltar
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        🖨️ Exportar PDF / Imprimir
      </button>
    </div>
  );
}
