import { Badge } from '@/components/ui/badge';
import type { StatusCompra } from '@/lib/types/planejamento-compras';

interface StatusCompraBadgeProps {
  status: StatusCompra;
}

const CONFIG: Record<StatusCompra, { label: string; className: string }> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-[rgba(224,84,84,0.12)] text-red-400 border-[rgba(224,84,84,0.25)]',
  },
  comprado_parcialmente: {
    label: 'Parcialmente coberto',
    className: 'bg-[rgba(245,208,0,0.09)] text-[#f5d000] border-[rgba(245,208,0,0.2)]',
  },
  estoque_suficiente: {
    label: 'Estoque suficiente',
    className: 'bg-[rgba(0,196,90,0.09)] text-[#00c45a] border-[rgba(0,196,90,0.2)]',
  },
};

export default function StatusCompraBadge({ status }: StatusCompraBadgeProps) {
  const { label, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
