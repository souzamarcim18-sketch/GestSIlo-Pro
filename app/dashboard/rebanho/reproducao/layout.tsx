import { TabsNav } from './TabsNav';
import { SyncStatusBadge } from '@/components/rebanho/reproducao/SyncStatusBadge';
import { ReproducaoSyncProvider } from '@/components/rebanho/reproducao/ReproducaoSyncProvider';

export default function ReproducaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReproducaoSyncProvider>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/40 bg-muted/20">
          <div className="flex-1">
            <TabsNav />
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
