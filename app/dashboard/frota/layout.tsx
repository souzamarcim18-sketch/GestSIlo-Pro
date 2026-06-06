import { requirePlano } from '@/lib/auth/guards';

export default async function FrotaLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('frota');
  return <>{children}</>;
}
