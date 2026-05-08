import { TabsNav } from './TabsNav';
import { SyncStatusBadge } from '@/components/rebanho/reproducao/SyncStatusBadge';
import { ReproducaoSyncProvider } from '@/components/rebanho/reproducao/ReproducaoSyncProvider';
import { queryRepetidoras } from '@/lib/supabase/rebanho-reproducao';
import { getCurrentFazendaId } from '@/lib/auth/helpers';

export default async function ReproducaoLayout({ children }: { children: React.ReactNode }) {
  const fazendaId = await getCurrentFazendaId();
  const repetidoras = await queryRepetidoras.list(fazendaId);
  const badgeRepetidoras = repetidoras.length;

  return (
    <ReproducaoSyncProvider>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/40 bg-muted/20">
          <div className="flex-1">
            <TabsNav badgeRepetidoras={badgeRepetidoras} />
          </div>
          <SyncStatusBadge />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </ReproducaoSyncProvider>
  );
}
