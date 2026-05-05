'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoriaProjetada, RebanhoProjetado } from '@/lib/types/rebanho';

interface RebanhoProjetadoProps {
  projecao: RebanhoProjetado;
  modoManual: boolean;
  onChange?: (categorias: CategoriaProjetada[]) => void;
}

export function RebanhoProjetadoComponent({
  projecao,
  modoManual,
  onChange,
}: RebanhoProjetadoProps) {
  const [categoriasEditadas, setCategoriasEditadas] = useState<
    Record<string, number>
  >({});

  const handleQuantidadeChange = (id: string, novaQuantidade: number) => {
    const novasEditadas = { ...categoriasEditadas, [id]: novaQuantidade };
    setCategoriasEditadas(novasEditadas);

    const novasCategorias = projecao.categorias.map((cat) =>
      cat.id === id
        ? {
            ...cat,
            quantidade_projetada: novaQuantidade,
            variacao: novaQuantidade - cat.quantidade_atual,
          }
        : cat
    );
    onChange?.(novasCategorias);
  };

  const displayCategorias = modoManual
    ? projecao.categorias.map((cat) => ({
        ...cat,
        quantidade_projetada:
          categoriasEditadas[cat.id] ?? cat.quantidade_projetada,
      }))
    : projecao.categorias;

  const totalAnimais = displayCategorias.reduce(
    (sum, cat) => sum + cat.quantidade_projetada,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {modoManual ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Ajuste manual
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Dados reais projetados
          </Badge>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="text-right font-semibold">
                Quantidade
              </TableHead>
              <TableHead className="text-right font-semibold">
                Peso médio (kg)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayCategorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell className="font-medium">{categoria.nome}</TableCell>
                <TableCell className="text-right">
                  {modoManual ? (
                    <Input
                      type="number"
                      min="0"
                      value={categoria.quantidade_projetada}
                      onChange={(e) =>
                        handleQuantidadeChange(
                          categoria.id,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-24 text-right"
                    />
                  ) : (
                    <span>{categoria.quantidade_projetada}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-gray-500">
                  —
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totalAnimais}</TableCell>
              <TableCell className="text-right">—</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
