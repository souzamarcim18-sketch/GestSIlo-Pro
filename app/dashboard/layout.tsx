import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen relative overflow-hidden">

      {/* Sidebar — nav landmark */}
      <nav
        aria-label="Menu principal"
        className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r border-green-100"
      >
        <Sidebar />
      </nav>

      {/* Conteúdo principal */}
      <main className="md:pl-72 h-full overflow-y-auto flex flex-col">

        {/* Header — banner landmark */}
        <header role="banner">
          <Header />
        </header>

        {/* Conteúdo da página */}
        <div className="flex-1">
          <div className="px-6 pt-4">
            <Breadcrumbs />
          </div>
          {children}
        </div>

      </main>
    </div>
  );
}
