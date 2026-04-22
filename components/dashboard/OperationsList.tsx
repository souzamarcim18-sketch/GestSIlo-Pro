'use client';

import { ChevronRight } from 'lucide-react';

interface Badge {
  label: string;
  variant: 'success' | 'warn' | 'danger' | 'info' | 'neutral';
}

interface Operation {
  id: string;
  date: string;
  title: string;
  meta: string;
  badges: Badge[];
}

interface OperationsListProps {
  operations: Operation[];
}

const badgeConfig = {
  success: { bg: 'bg-gs-mint-soft', text: 'text-gs-mint' },
  warn: { bg: 'bg-gs-warn-soft', text: 'text-gs-warn' },
  danger: { bg: 'bg-gs-danger-soft', text: 'text-gs-danger' },
  info: { bg: 'bg-gs-info-soft', text: 'text-gs-info' },
  neutral: { bg: 'bg-white/[0.04]', text: 'text-gs-text-2' },
};

export function OperationsList({ operations }: OperationsListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
    };
  };

  return (
    <div className="bg-gs-panel border border-gs-line rounded-xl p-[18px] col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gs-text-3 uppercase tracking-[0.12em] font-semibold mb-1">
            Próximos 5 dias
          </p>
          <h3 className="font-display text-sm font-semibold text-gs-text-1">
            Operações Agendadas
          </h3>
        </div>
        <button className="text-gs-text-2 hover:text-gs-mint text-xs font-semibold flex items-center gap-1 transition-colors">
          Ver mais
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Operations List */}
      <ul className="divide-y divide-gs-line">
        {operations.map((op) => {
          const { day, month } = formatDate(op.date);
          return (
            <li key={op.id} className="grid grid-cols-[54px_1fr_auto] gap-3 py-[11px] first:pt-0 last:pb-0">
              {/* Date Chip */}
              <div className="text-center bg-gs-panel-2 border border-gs-line rounded-md px-[6px] py-[6px] h-fit">
                <div className="font-mono text-base font-bold text-gs-text-1 leading-none">
                  {day}
                </div>
                <div className="font-mono text-[9px] text-gs-text-3 uppercase tracking-[0.06em] mt-[2px]">
                  {month}
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="text-sm font-semibold text-gs-text-1">{op.title}</p>
                <p className="text-xs text-gs-text-3 mt-[2px]">{op.meta}</p>
              </div>

              {/* Badges */}
              <div className="flex gap-[6px] items-center h-fit">
                {op.badges.map((badge, idx) => {
                  const config = badgeConfig[badge.variant];
                  return (
                    <span
                      key={idx}
                      className={`text-xs font-semibold px-[10px] py-[3px] rounded-full ${config.bg} ${config.text} whitespace-nowrap`}
                    >
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
