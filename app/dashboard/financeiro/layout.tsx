import { requirePlano } from '@/lib/auth/guards';

export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('financeiro');
  return <>{children}</>;
}
