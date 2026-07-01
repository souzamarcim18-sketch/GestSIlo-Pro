import { redirect } from 'next/navigation';

// Os Indicadores foram absorvidos pelos painéis de espécie (Leite × Corte)
// como aba "Indicadores". Mantido como redirect para links antigos.
export default function IndicadoresPage() {
  redirect('/dashboard/rebanho/leiteira');
}
