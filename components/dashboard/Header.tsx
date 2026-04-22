'use client';

import { Search, Bell, Plus } from 'lucide-react';

interface HeaderProps {
  greeting: string;
  message: string;
}

export function Header({ greeting, message }: HeaderProps) {
  return (
    <header className="bg-gs-bg border-b border-gs-line px-6 py-[22px] flex items-center justify-between">
      {/* Left */}
      <div>
        <h1 className="font-display text-[22px] font-bold text-gs-text-1 leading-none tracking-[-0.01em]">
          {greeting}
        </h1>
        <p className="text-xs text-gs-text-2 mt-1">{message}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gs-text-3" />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-full bg-gs-panel border border-gs-line rounded-md px-3 py-2 pl-8 text-xs text-gs-text-1 placeholder-gs-text-3 focus:outline-none focus:border-gs-mint"
          />
        </div>

        {/* Notification */}
        <button className="relative w-9 h-9 flex items-center justify-center bg-gs-panel border border-gs-line rounded-md text-gs-text-3 hover:text-gs-text-1 transition-colors">
          <Bell size={16} />
          <span className="absolute top-[8px] right-[9px] w-[6px] h-[6px] bg-red-500 rounded-full" />
        </button>

        {/* Primary CTA */}
        <button className="flex items-center gap-2 bg-gs-mint text-[#062411] text-xs font-bold px-4 py-2 rounded-full shadow-glow-mint-lg hover:brightness-110 transition-all">
          <Plus size={14} />
          Nova Entrada
        </button>
      </div>
    </header>
  );
}
