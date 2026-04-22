'use client';

import { Droplet } from 'lucide-react';

interface SiloCardProps {
  name: string;
  code: string;
  crop: string;
  status: 'active' | 'warning' | 'danger';
  occupancyPercent: number;
  msPercent: number;
  countdownSeconds: number;
}

export function SiloCard({
  name,
  code,
  crop,
  status,
  occupancyPercent,
  msPercent,
  countdownSeconds,
}: SiloCardProps) {
  const statusConfig = {
    active: { bg: 'bg-gs-mint-soft', text: 'text-gs-mint', label: 'Ativo' },
    warning: { bg: 'bg-gs-warn-soft', text: 'text-gs-warn', label: 'Atenção' },
    danger: { bg: 'bg-gs-danger-soft', text: 'text-gs-danger', label: 'Crítico' },
  };

  const config = statusConfig[status];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-gs-panel border border-gs-line rounded-xl p-4 sm:p-[18px] flex flex-col gap-3 sm:gap-[14px] h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-[34px] h-[34px] bg-gs-panel-2 border border-gs-line rounded-md flex items-center justify-center text-gs-mint">
            <Droplet size={18} />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-gs-text-1 leading-none">
              {name}
            </h3>
            <p className="text-xs text-gs-text-3 mt-1">{code}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-[10px] py-[3px] rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Occupancy */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs text-gs-text-2">Ocupação</label>
            <span className="font-display font-semibold text-sm text-gs-text-1">
              {occupancyPercent}
              <span className="text-xs font-normal text-gs-text-3 ml-1">%</span>
            </span>
          </div>
          <div className="relative h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gs-mint/30 to-gs-mint rounded-full shadow-glow-mint"
              style={{ width: `${occupancyPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[6px] h-[6px] bg-gs-mint rounded-full shadow-glow-mint blur-sm"
              style={{ left: `${occupancyPercent}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>

        {/* MS% */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs text-gs-text-2">M.S.</label>
            <span className="font-display font-semibold text-sm text-gs-text-1">
              {msPercent}
              <span className="text-xs font-normal text-gs-text-3 ml-1">%</span>
            </span>
          </div>
          <div className="relative h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gs-mint/30 to-gs-mint rounded-full shadow-glow-mint"
              style={{ width: `${msPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[6px] h-[6px] bg-gs-mint rounded-full shadow-glow-mint blur-sm"
              style={{ left: `${msPercent}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gs-line">
        <span className="font-mono text-sm font-semibold text-gs-text-1">
          Abertura em {formatTime(countdownSeconds)}
        </span>
        <button className={`text-xs font-bold px-[14px] py-[6px] rounded-full transition-all ${
          status === 'danger'
            ? 'bg-gs-danger text-white hover:brightness-110'
            : 'bg-gs-mint text-[#062411] shadow-glow-mint-lg hover:brightness-110'
        }`}>
          Abrir
        </button>
      </div>
    </div>
  );
}
