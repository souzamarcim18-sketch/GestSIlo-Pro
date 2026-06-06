import { requirePlano } from '@/lib/auth/guards';

export default async function BalancoForrageiroLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('balanco_forrageiro');
  return <>{children}</>;
}
