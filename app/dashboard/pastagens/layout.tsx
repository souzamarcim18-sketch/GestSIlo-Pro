import { requirePlano } from '@/lib/auth/guards';

export default async function PastagensLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('pastagens');
  return <>{children}</>;
}
