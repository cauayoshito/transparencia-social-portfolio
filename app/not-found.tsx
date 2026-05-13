export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Pagina nao encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">A rota solicitada nao existe.</p>
      </div>
    </main>
  );
}
