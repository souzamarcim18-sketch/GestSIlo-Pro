'use client';

import { useState, useEffect } from 'react';
import { SiloCard } from '@/components/dashboard/SiloCard';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { DistributionChart } from '@/components/dashboard/DistributionChart';
import { KPICard } from '@/components/dashboard/KPICard';
import { OperationsList } from '@/components/dashboard/OperationsList';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { ActivityTable } from '@/components/dashboard/ActivityTable';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [silos, setSilos] = useState<any[]>([]);
  const [productionChartData, setProductionChartData] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading || !fazendaId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch silos
        const { data: silosData, error: silosError } = await supabase
          .from('silos')
          .select('*')
          .eq('fazenda_id', fazendaId)
          .limit(3);

        if (silosError) {
          console.error('Erro Supabase silos:', silosError);
          throw silosError;
        }

        if (!silosData || silosData.length === 0) {
          console.log('Nenhum silo encontrado para fazenda:', fazendaId);
          setSilos([]);
          setLoading(false);
          return;
        }

        // Fetch movimentações
        const siloIds = silosData.map(s => s.id);
        const { data: movsData, error: movsError } = await supabase
          .from('movimentacoes_silo')
          .select('*')
          .in('silo_id', siloIds);

        // Processar silos
        const processedSilos = (silosData || []).map((silo: any) => {
          const movimentacoes = (movsData || []).filter((m: any) => m.silo_id === silo.id);
          const estoque = movimentacoes.reduce((acc: number, m: any) => {
            const qtd = parseFloat(m.quantidade) || 0;
            return acc + (m.tipo?.toLowerCase().includes('entrada') ? qtd : -qtd);
          }, 0);

          const capacidade = parseFloat(silo.capacidade_ton_mv) || parseFloat(silo.volume_ensilado_ton_mv) || 1;
          const ocupancy = Math.round((Math.max(estoque, 0) / capacidade) * 100);

          return {
            name: silo.nome || 'Silo sem nome',
            code: silo.codigo || 'SIL-0000',
            crop: silo.cultura || 'Não especificada',
            status: ocupancy > 80 ? 'active' : ocupancy > 60 ? 'warning' : 'active',
            occupancyPercent: Math.min(ocupancy, 100),
            msPercent: 72,
            countdownSeconds: 45821,
          };
        });

        setSilos(processedSilos);

        // Fetch monthly consumption data
        if (movsData && movsData.length > 0) {
          const monthNames = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'];
          const monthlyData: Record<string, number> = {};

          movsData.forEach((mov: any) => {
            if (mov.tipo?.toLowerCase().includes('saída') || mov.tipo?.toLowerCase().includes('descarga')) {
              const date = new Date(mov.data_movimentacao || mov.created_at);
              const monthIndex = date.getMonth();
              const monthName = monthNames[monthIndex];
              const quantity = parseFloat(mov.quantidade) || 0;
              monthlyData[monthName] = (monthlyData[monthName] || 0) + quantity;
            }
          });

          const lastSixMonths = monthNames.slice(-6);
          const chartData = lastSixMonths.map(month => ({
            month,
            value: Math.round(monthlyData[month] || 0)
          }));

          setProductionChartData(chartData);
        }
      } catch (error) {
        console.error('Erro ao carregar silos:', error);
        setSilos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fazendaId, authLoading]);

  const calculateKPIs = () => {
    const totalSilos = silos.length;
    const avgOccupancy = silos.length > 0
      ? Math.round(silos.reduce((sum, s) => sum + s.occupancyPercent, 0) / silos.length)
      : 0;
    const avgMS = silos.length > 0
      ? Math.round(silos.reduce((sum, s) => sum + s.msPercent, 0) / silos.length)
      : 0;

    return [
      { label: 'Silos Ativos', value: String(totalSilos), unit: 'und', delta: 0, trend: 'up' as const, sparklineData: [] },
      { label: 'Capacidade Utilizada', value: String(avgOccupancy), unit: '%', delta: 0, trend: 'up' as const, sparklineData: [] },
      { label: 'Qualidade M.S. Média', value: String(avgMS), unit: '%', delta: 0, trend: 'down' as const, sparklineData: [] },
      { label: 'Entradas (7d)', value: '0', unit: 't', delta: 0, trend: 'up' as const, sparklineData: [] },
      { label: 'Saídas (7d)', value: '0', unit: 't', delta: 0, trend: 'up' as const, sparklineData: [] },
      { label: 'Eficiência', value: '0', unit: '%', delta: 0, trend: 'up' as const, sparklineData: [] },
    ];
  };

  const kpis = calculateKPIs();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-6 space-y-6 bg-gs-bg">
      <div className="space-y-6">
            {/* Hero Silo Cards - Responsivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px]">
              {silos.map((silo) => (<SiloCard key={silo.code} {...silo} />))}
            </div>

            {/* Charts Row - Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-[14px]">
              <ProductionChart data={productionChartData} delta={0} total={`${productionChartData.reduce((acc, d) => acc + d.value, 0)} t`} />
              <DistributionChart total="0 t" segments={[]} season="Safra 25/26" />
            </div>

            {/* KPI Strip - Responsivo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[14px]">
              {kpis.map((kpi, idx) => (<KPICard key={idx} {...kpi} />))}
            </div>

            {/* Operations & Alerts - Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px]">
              <div className="lg:col-span-2">
                <OperationsList operations={operations} />
              </div>
              <AlertsPanel alerts={alerts} />
            </div>

            <ActivityTable activities={activityLog} />
      </div>
    </div>
  );
}
