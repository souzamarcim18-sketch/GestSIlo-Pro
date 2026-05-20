'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AnotacoesFiltersProps {
  onSearchChange?: (search: string) => void;
  onCategoriaChange?: (categoria: string | null) => void;
  onPrioridadeChange?: (prioridade: string | null) => void;
  onResolvidaChange?: (resolvida: string | null) => void;
}

export default function AnotacoesFilters({
  onSearchChange,
  onCategoriaChange,
  onPrioridadeChange,
  onResolvidaChange,
}: AnotacoesFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Input
        placeholder="Buscar anotações..."
        onChange={(e) => onSearchChange?.(e.target.value)}
        className="text-sm"
      />

      <Select onValueChange={onCategoriaChange}>
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas</SelectItem>
          <SelectItem value="duvida">Dúvida</SelectItem>
          <SelectItem value="observacao_campo">Observação de Campo</SelectItem>
          <SelectItem value="sugestao">Sugestão</SelectItem>
          <SelectItem value="outro">Outro</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={onPrioridadeChange}>
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={onResolvidaChange}>
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas</SelectItem>
          <SelectItem value="pendentes">Pendentes</SelectItem>
          <SelectItem value="resolvidas">Resolvidas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
