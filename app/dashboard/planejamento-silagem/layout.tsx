import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planejamento de Silagem',
  description: 'Wizard para planejamento de produção de silagem',
};

export default function PlanejamentoSilagemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {children}
    </div>
  );
}
