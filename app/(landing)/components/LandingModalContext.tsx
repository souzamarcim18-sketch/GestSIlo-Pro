'use client';

import { createContext, useContext, useState } from 'react';

export type ModalType = 'missao' | 'visao' | 'valores' | 'suporte' | 'privacidade' | 'termos' | null;

interface LandingModalContextValue {
  openModal: ModalType;
  setOpenModal: (modal: ModalType) => void;
}

const LandingModalContext = createContext<LandingModalContextValue | null>(null);

export function LandingModalProvider({ children }: { children: React.ReactNode }) {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  return (
    <LandingModalContext.Provider value={{ openModal, setOpenModal }}>
      {children}
    </LandingModalContext.Provider>
  );
}

export function useLandingModal() {
  const ctx = useContext(LandingModalContext);
  if (!ctx) {
    throw new Error('useLandingModal deve ser usado dentro de LandingModalProvider');
  }
  return ctx;
}
