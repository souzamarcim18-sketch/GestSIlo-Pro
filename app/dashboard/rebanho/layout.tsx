import { requirePlano } from '@/lib/auth/guards';

export default async function RebanhoLayout({ children }: { children: React.ReactNode }) {
  await requirePlano('rebanho');
  return <>{children}</>;
}
