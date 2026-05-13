'use client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <main className="mx-auto mt-16 max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Ocorreu um erro</h1>
          <p className="mt-2 text-sm text-slate-600">
            Nao foi possivel carregar esta pagina.
          </p>
          <p className="mt-2 text-xs text-slate-500">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
