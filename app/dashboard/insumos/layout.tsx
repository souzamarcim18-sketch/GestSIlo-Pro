import { requirePlano } from '@/lib/auth/guards';

export default async function InsumosLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('insumos');
  return <>{children}</>;
}
