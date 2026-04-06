import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 bg-sidebar">
        <Sidebar />
      </div>
      <main className="md:pl-72 pb-10">
        <Header />
        <div className="p-4 md:p-8">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}
