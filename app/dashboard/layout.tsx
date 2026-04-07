import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen relative overflow-hidden">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r border-green-100">
        <Sidebar />
      </div>
      <main className="md:pl-72 h-full overflow-y-auto flex flex-col">
        <Header />
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
