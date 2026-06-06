import { requirePlano } from '@/lib/auth/guards';

export default async function MaoDeObraLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('mao_de_obra');
  return <>{children}</>;
}
