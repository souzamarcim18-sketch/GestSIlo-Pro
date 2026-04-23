'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PackageOpen, ArrowRight, Wheat, Beef, Leaf, BarChart3 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

const features = [
  {
    icon: Wheat,
    title: 'Grãos e Cereais',
    description: 'Controle de estoque de milho, soja, sorgo e outros grãos produzidos na propriedade.',
  },
  {
    icon: Beef,
    title: 'Produtos de Origem Animal',
    description: 'Registros de leite, ovos, mel e outros produtos gerados pelo rebanho.',
  },
  {
    icon: Leaf,
    title: 'Forragens e Pastagens',
    description: 'Gestão de feno, palha e outros subprodutos vegetais (exceto silagem, que tem módulo próprio).',
  },
  {
    icon: BarChart3,
    title: 'Relatórios de Produção',
    description: 'Histórico de produção, variações de estoque e análise de rendimento por período.',
  },
];

export default function ProdutosPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-muted/30">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <PackageOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gestão de estoque dos produtos produzidos na propriedade</p>
        </div>
      </div>

      {/* Em desenvolvimento */}
      <Card className="rounded-2xl shadow-sm border-primary/20 bg-primary/5">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <PackageOpen className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Módulo em desenvolvimento</h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              O módulo de Produtos estará disponível em breve. Aqui você poderá controlar o estoque
              de tudo que é produzido na sua propriedade — grãos, forragens, produtos de origem animal
              e mais — de forma integrada com o restante da plataforma.
            </p>
            <p className="text-xs text-muted-foreground">
              A silagem continua gerenciada pelo módulo de Silos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview das funcionalidades */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">O que estará disponível</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="rounded-2xl shadow-sm opacity-60">
              <CardContent className="p-5 flex gap-4 items-start">
                <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Link para módulo de insumos como referência */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground text-sm">Precisa controlar insumos?</p>
            <p className="text-xs text-muted-foreground mt-1">
              O módulo de Insumos já está disponível para gestão do que é utilizado na produção.
            </p>
          </div>
          <Link
            href="/dashboard/insumos"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Ver Insumos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </CardContent>
      </Card>

    </div>
  );
}
