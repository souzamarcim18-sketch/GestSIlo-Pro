interface PageHeaderProps {
  /**
   * Ícone do módulo — o mesmo usado na Sidebar. Aceita ícones Lucide e
   * ícones customizados (ex.: CowIcon), por isso tipado apenas por `className`.
   */
  icon: React.ComponentType<{ className?: string }>;
  /** Título da página, no padrão "Gestão de X". */
  titulo: string;
  /** Ações à direita (botões, dropdowns). */
  children?: React.ReactNode;
}

/**
 * Cabeçalho padronizado das páginas principais de módulo.
 * Layout: [ícone da Sidebar] Título (branco) ............ [ações à direita].
 * Fonte única do padrão de cabeçalho — usado em Silos, Pastagens, Lavouras, Rebanho.
 */
export function PageHeader({ icon: Icon, titulo, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0" aria-hidden="true">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">{titulo}</h2>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
