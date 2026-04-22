'use client';

import { AlertCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

interface Alert {
  id: string;
  type: 'danger' | 'warn' | 'info';
  title: string;
  meta: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const alertConfig = {
  danger: {
    bg: 'bg-gs-danger-soft',
    text: 'text-gs-danger',
    icon: AlertOctagon,
  },
  warn: {
    bg: 'bg-gs-warn-soft',
    text: 'text-gs-warn',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-gs-info-soft',
    text: 'text-gs-info',
    icon: Info,
  },
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <div className="bg-gs-panel border border-gs-line rounded-xl p-[18px] flex flex-col">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-gs-text-1">
          Alertas
        </h3>
        <span className="text-xs text-gs-text-3 font-semibold">
          {alerts.length} ativo{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alerts List */}
      <ul className="divide-y divide-gs-line">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <li
              key={alert.id}
              className="grid grid-cols-[28px_1fr] gap-[10px] py-[11px] first:pt-0 last:border-b-0 last:pb-0"
            >
              {/* Icon */}
              <div
                className={`w-[28px] h-[28px] rounded-md flex items-center justify-center flex-shrink-0 ${config.bg} ${config.text} border border-transparent`}
              >
                <Icon size={14} strokeWidth={2} />
              </div>

              {/* Content */}
              <div className="min-w-0">
                <p className="font-medium text-xs text-gs-text-1 leading-[1.35]">
                  {alert.title}
                </p>
                <p className="text-xs text-gs-text-3 mt-[3px]">{alert.meta}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
