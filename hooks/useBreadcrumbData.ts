'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Tipagem para dados de breadcrumb
 */
export interface BreadcrumbSegment {
  label: string;
  href: string;
  id?: string;
  isLoading?: boolean;
}

/**
 * Hook para buscar dados dinâmicos de breadcrumb
 *
 * Estratégia:
 * - Analisa o pathname para determinar a rota
 * - Busca nomes amigáveis no Supabase quando necessário
 * - Implementa cache simples (evita re-fetch)
 * - Retorna array de segmentos com label, href e id
 *
 * Exemplo:
 *   /dashboard → [{ label: "Dashboard", href: "/dashboard" }]
 *   /dashboard/silos → [{ label: "Silos", href: "/dashboard/silos" }]
 *   /dashboard/silos/uuid → [{ label: "Silos", href: "/dashboard/silos" }, { label: "Silo 01", href: "/dashboard/silos/uuid" }]
 *   /dashboard/silos/uuid/movimentacoes → [{ label: "Silos", ... }, { label: "Silo 01", ... }, { label: "Movimentações", ... }]
 */
export function useBreadcrumbData(): BreadcrumbSegment[] {
  const pathname = usePathname();
  const { fazendaId } = useAuth();
  const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      const parts = pathname.split('/').filter(Boolean);

      if (parts.length === 0) {
        setSegments([]);
        return;
      }

      const breadcrumbs: BreadcrumbSegment[] = [];
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath += `/${part}`;

        // Skip 'dashboard' como breadcrumb (já mostrado como Home)
        if (part === 'dashboard') {
          continue;
        }

        // Detectar se é um UUID (padrão: 8-4-4-4-12 caracteres hexadecimais)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);

        if (isUuid) {
          // Tentar buscar nome do registro no banco
          const nome = await fetchNameForId(part, parts[i - 1], fazendaId, cacheRef);
          const formattedLabel = nome || part;
          breadcrumbs.push({
            label: formattedLabel,
            href: currentPath,
            id: part,
            isLoading: !nome,
          });
        } else {
          // É um módulo (silos, talhoes, frota, etc.)
          const formattedLabel = formatModuleLabel(part);
          breadcrumbs.push({
            label: formattedLabel,
            href: currentPath,
          });
        }
      }

      setSegments(breadcrumbs);
    };

    generateBreadcrumbs();
  }, [pathname, fazendaId]);

  return segments;
}

/**
 * Busca nome amigável para um ID (UUID)
 * Mapeia a tabela correta baseado no segmento anterior
 */
async function fetchNameForId(
  id: string,
  context: string,
  fazendaId: string | null,
  cacheRef: React.MutableRefObject<Map<string, string>>
): Promise<string | null> {
  if (!fazendaId) return null;

  try {
    // Verificar cache primeiro
    const cached = cacheRef.current.get(id);
    if (cached) return cached;

    // Mapeamento: contexto (rota anterior) → tabela + campo de nome
    const tableMap: Record<string, { table: string; nameField: string }> = {
      silos: { table: 'silos', nameField: 'nome' },
      talhoes: { table: 'talhoes', nameField: 'nome' },
      frota: { table: 'maquinas', nameField: 'nome' },
      insumos: { table: 'insumos', nameField: 'nome' },
      financeiro: { table: 'financeiro', nameField: 'descricao' },
      maquinas: { table: 'maquinas', nameField: 'nome' },
    };

    const config = tableMap[context];
    if (!config) {
      // Se não souber o contexto, não buscar
      return null;
    }

    const { data, error } = await supabase
      .from(config.table)
      .select(config.nameField)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();

    if (error || !data) {
      console.warn(`[Breadcrumb] Não encontrado: ${context}/${id}`, error);
      return null;
    }

    const nome = data[config.nameField as keyof typeof data] as string | null;

    // Armazenar no cache
    if (nome) {
      cacheRef.current.set(id, nome);
    }

    return nome || null;
  } catch (err) {
    console.error('[Breadcrumb] Erro ao buscar nome:', err);
    return null;
  }
}

/**
 * Formata labels de slugs
 */
function formatModuleLabel(slug: string): string {
  const slugMap: Record<string, string> = {
    silos: 'Silos',
    talhoes: 'Talhões',
    frota: 'Frota',
    financeiro: 'Financeiro',
    insumos: 'Insumos',
    calculadoras: 'Calculadoras',
    relatorios: 'Relatórios',
    'planejamento-silagem': 'Planejamento Silagem',
    historico: 'Histórico',
    configuracoes: 'Configurações',
    calendario: 'Calendário',
    onboarding: 'Onboarding',
  };
  return slugMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}
