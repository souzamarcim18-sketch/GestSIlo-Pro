import { requirePlano } from '@/lib/auth/guards';

export default async function PlanejamentoComprasLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('planejamento_compras');
  return <>{children}</>;
}
