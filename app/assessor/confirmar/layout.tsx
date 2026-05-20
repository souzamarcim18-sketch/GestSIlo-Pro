import { Suspense } from 'react';

export default function ConfirmarLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      {children}
    </Suspense>
  );
}
