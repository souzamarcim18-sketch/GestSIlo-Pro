import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Reprodutor } from '@/lib/types/rebanho-reproducao';

interface ReprodutorPageProps {
  params: Promise<{
    id: string;
  }>;
}

// TODO: Substituir por query ao banco
const MOCK_REPRODUTOR: Record<string, Reprodutor> = {
  '1': {
    id: '1',
    fazenda_id: 'fazenda-1',
    nome: 'Touro Lider',
    tipo: 'touro',
    raca: 'Holandês',
    numero_registro: 'HOL123456',
    data_entrada: '2024-01-15',
    observacoes: 'Reprodutor de elite com desempenho excepcional',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const tiposMap = {
  touro: 'Touro',
  semen_ia: 'Sêmen IA',
  touro_teste: 'Touro Teste',
};

export default async function ReprodutorDetailPage({ params }: ReprodutorPageProps) {
  const { id } = await params;
  const reprodutor = MOCK_REPRODUTOR[id];

  if (!reprodutor) {
    notFound();
  }

  // TODO: Obter profile do AuthProvider
  const isAdmin = true;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/rebanho/reproducao/reprodutores">
          <Button variant="outline" size="sm" className="h-10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{reprodutor.nome}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tiposMap[reprodutor.tipo as keyof typeof tiposMap]}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" className="h-10">
                <Edit2 className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button variant="destructive" className="h-10">
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Raça</p>
            <p className="font-medium">{reprodutor.raca || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Número de Registro</p>
            <p className="font-medium">{reprodutor.numero_registro || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Data de Entrada</p>
            <p className="font-medium">
              {reprodutor.data_entrada
                ? new Date(reprodutor.data_entrada).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Criado em</p>
            <p className="font-medium">
              {new Date(reprodutor.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {reprodutor.observacoes && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Observações</p>
            <p className="whitespace-pre-wrap text-sm">{reprodutor.observacoes}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold">Coberturas Associadas</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma cobertura registrada ainda
        </p>
        {/* TODO: Adicionar lista de coberturas depois de implementar tabela */}
      </div>
    </div>
  );
}
