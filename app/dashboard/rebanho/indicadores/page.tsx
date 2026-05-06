import { Suspense } from 'react';
import IndicadoresClient from './IndicadoresClient';
import IndicadoresSkeleton from './components/IndicadoresSkeleton';

export const metadata = {
  title: 'Indicadores Zootécnicos | GestSilo Pro',
};

export default function IndicadoresPage() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Indicadores Zootécnicos</h1>
        <p className="text-sm text-gray-600">Acompanhe o desempenho do rebanho e análise de produtividade</p>
      </header>

      <Suspense fallback={<IndicadoresSkeleton />}>
        <IndicadoresClient />
      </Suspense>
    </div>
  );
}
