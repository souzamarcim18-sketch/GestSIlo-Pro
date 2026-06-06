import { requirePlano } from '@/lib/auth/guards';

export default async function ProdutosLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('produtos');
  return <>{children}</>;
}
