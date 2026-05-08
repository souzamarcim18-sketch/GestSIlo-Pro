'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { Reprodutor, CoberturaDoReprodutorRow } from '@/lib/types/rebanho-reproducao';

const tiposMap: Record<string, string> = {
  touro: 'Touro',
  semen_ia: 'Sêmen IA',
  touro_teste: 'Touro Teste',
};

const tipoCoberturaMap: Record<string, string> = {
  monta_natural: 'Monta Natural',
  ia_convencional: 'IA Convencional',
  iatf: 'IATF',
  tetf: 'TETF',
  fiv: 'FIV',
  repasse: 'Repasse',
};

interface ReprodutorDetailClientProps {
  reprodutor: Reprodutor;
  coberturas: CoberturaDoReprodutorRow[];
}

export default function ReprodutorDetailClient({ reprodutor, coberturas }: ReprodutorDetailClientProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === 'Administrador';

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
              {tiposMap[reprodutor.tipo] ?? reprodutor.tipo}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Link href={`/dashboard/rebanho/reproducao/reprodutores/${reprodutor.id}/editar`}>
                <Button variant="outline" className="h-10">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Coberturas Associadas</h2>
          <Badge variant="secondary">{coberturas.length}</Badge>
        </div>

        {coberturas.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma cobertura registrada para este reprodutor.
          </p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Tipo de Cobertura</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coberturas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {new Date(c.data_evento).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {c.animais
                      ? [c.animais.brinco, c.animais.nome].filter(Boolean).join(' — ')
                      : c.animal_id}
                  </TableCell>
                  <TableCell>
                    {c.tipo_cobertura ? (tipoCoberturaMap[c.tipo_cobertura] ?? c.tipo_cobertura) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.observacoes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
