import { requirePlano } from '@/lib/auth/guards';

export default async function TalhoesLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('talhoes');
  return <>{children}</>;
}
