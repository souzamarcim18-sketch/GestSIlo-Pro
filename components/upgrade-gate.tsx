'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { usePlano } from '@/hooks/use-plano';
import { PLANOS, type PlanoSlug } from '@/lib/planos';

interface UpgradeGateProps {
  modulo: string;
  planoMinimo: PlanoSlug;
  children: React.ReactNode;
}

export function UpgradeGate({ modulo, planoMinimo, children }: UpgradeGateProps) {
  const { permiteModulo } = usePlano();

  if (permiteModulo(modulo)) {
    return <>{children}</>;
  }

  const nomePlano = PLANOS[planoMinimo].nome;

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8 rounded-lg border border-border bg-surface">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        Disponível no plano {nomePlano}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[36ch] mb-6">
        Faça upgrade do seu plano para acessar este recurso e muito mais.
      </p>
      <Link href="/#planos" className={buttonVariants({ variant: 'default' })}>
        Ver planos
      </Link>
    </div>
  );
}
