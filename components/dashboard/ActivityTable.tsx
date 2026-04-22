'use client';

import { useState } from 'react';
import { Search, Filter, MoreVertical, Check } from 'lucide-react';

interface ActivityEntry {
  id: string;
  userInitials: string;
  userName: string;
  operation: string;
  location: string;
  status: 'success' | 'pending' | 'critical' | 'warning';
  value: string;
  timestamp: string;
}

interface ActivityTableProps {
  activities: ActivityEntry[];
}

const statusConfig = {
  success: { bg: 'bg-gs-mint-soft', text: 'text-gs-mint', label: 'Sucesso' },
  pending: { bg: 'bg-gs-info-soft', text: 'text-gs-info', label: 'Pendente' },
  critical: { bg: 'bg-gs-danger-soft', text: 'text-gs-danger', label: 'Crítico' },
  warning: { bg: 'bg-gs-warn-soft', text: 'text-gs-warn', label: 'Atenção' },
};

export function ActivityTable({ activities }: ActivityTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const updated = new Set(checkedRows);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setCheckedRows(updated);
  };

  return (
    <div className="bg-gs-panel border border-gs-line rounded-xl p-[18px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-gs-text-1">
          Histórico de Atividades
        </h3>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gs-text-3" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gs-panel-2 border border-gs-line rounded-md px-3 py-2 pl-8 text-xs text-gs-text-1 placeholder-gs-text-3 w-[220px] focus:outline-none focus:border-gs-mint"
            />
          </div>
          <button className="w-9 h-9 flex items-center justify-center text-gs-text-3 hover:text-gs-mint bg-gs-panel-2 border border-gs-line rounded-md transition-colors">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-[18px] px-[18px]">
        <table className="w-full border-collapse text-xs min-w-full">
          <thead>
            <tr className="border-b border-gs-line">
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-left w-[40px]">
                <input
                  type="checkbox"
                  className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-gs-line cursor-pointer"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCheckedRows(new Set(activities.map((a) => a.id)));
                    } else {
                      setCheckedRows(new Set());
                    }
                  }}
                />
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-left">
                Usuário
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-left">
                Operação
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-left">
                Local
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-left">
                Status
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-right">
                Valor
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-left">
                Hora
              </th>
              <th className="text-gs-text-3 font-semibold uppercase tracking-[0.06em] px-3 py-[10px] text-right w-[30px]"></th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const isChecked = checkedRows.has(activity.id);
              const statusCfg = statusConfig[activity.status];
              const isPositive = activity.value.startsWith('+');

              return (
                <tr
                  key={activity.id}
                  className="border-b border-gs-line hover:bg-gs-mint/[0.03] transition-colors last:border-b-0"
                >
                  <td className="px-3 py-[14px]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRow(activity.id)}
                      className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] accent-gs-mint cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-[14px] align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gs-mint-soft text-gs-mint font-semibold text-xs flex items-center justify-center">
                        {activity.userInitials}
                      </div>
                      <span className="text-gs-text-1 font-medium">{activity.userName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-[14px] text-gs-text-1 font-semibold">
                    {activity.operation}
                  </td>
                  <td className="px-3 py-[14px] text-gs-text-2">{activity.location}</td>
                  <td className="px-3 py-[14px]">
                    <span
                      className={`text-xs font-semibold px-[10px] py-[3px] rounded-full ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      {statusCfg.label}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-[14px] text-right font-semibold ${
                      isPositive ? 'text-gs-mint' : 'text-gs-danger'
                    }`}
                  >
                    {activity.value}
                  </td>
                  <td className="px-3 py-[14px] text-gs-text-2 font-mono text-[10px]">
                    {activity.timestamp}
                  </td>
                  <td className="px-3 py-[14px] text-right">
                    <button className="text-gs-text-3 hover:text-gs-text-1 cursor-pointer transition-colors">
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
