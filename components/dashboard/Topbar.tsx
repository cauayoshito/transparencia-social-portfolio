type Props = {
  title?: string;
  subtitle?: string;
  onOpenMenu?: () => void;
};

export default function Topbar({
  title = "Transparência Social",
  subtitle = "Gestão de parcerias e prestação de contas.",
  onOpenMenu,
}: Props) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:h-16 lg:px-8 lg:py-0">
      <div className="flex min-h-[56px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:h-16">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {title}
            </h2>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <div className="relative hidden md:block md:w-[260px] lg:w-[320px]">
            <input
              placeholder="Buscar projetos..."
              className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-slate-100"
            aria-label="Notificações"
          >
            🔔
          </button>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-slate-100"
            aria-label="Mensagens"
          >
            💬
          </button>
        </div>
      </div>
    </header>
  );
}
