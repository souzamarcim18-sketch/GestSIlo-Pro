'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const PIN_STORAGE_KEY = 'gestsilo:sidebar:pinned';

function readPinnedPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PIN_STORAGE_KEY) === 'true';
  } catch {
    // localStorage indisponível (modo privado) — mantém o padrão recolhido.
    return false;
  }
}

interface SidebarContextValue {
  /** true quando a sidebar deve estar fixada aberta pelo usuário (persistido). */
  pinned: boolean;
  /** Alterna o pin e persiste em localStorage. */
  togglePinned: () => void;
  /** true enquanto o mouse está sobre a sidebar. */
  hovered: boolean;
  setHovered: (v: boolean) => void;
  /** Sidebar expandida = fixada OU em hover. Fonte única para sidebar e main. */
  expanded: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer: lê a preferência uma vez. O servidor renderiza recolhida
  // (false) e o cliente hidrata com o valor real — o layout normal só renderiza
  // após o gate de auth, então não há flash de conteúdo perceptível.
  const [pinned, setPinned] = useState(readPinnedPreference);
  const [hovered, setHovered] = useState(false);

  const togglePinned = useCallback(() => {
    setPinned((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(PIN_STORAGE_KEY, String(next));
      } catch {
        // ignora falha de persistência
      }
      return next;
    });
  }, []);

  const expanded = pinned || hovered;

  return (
    <SidebarContext.Provider value={{ pinned, togglePinned, hovered, setHovered, expanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar deve ser usado dentro de <SidebarProvider>');
  }
  return ctx;
}

/**
 * Versão tolerante: retorna null fora do provider (ex.: Sidebar dentro do
 * Sheet mobile, que não usa SidebarProvider). Não lança.
 */
export function useSidebarOptional(): SidebarContextValue | null {
  return useContext(SidebarContext);
}
