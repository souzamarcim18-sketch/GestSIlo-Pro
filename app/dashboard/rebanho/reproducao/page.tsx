import { redirect } from 'next/navigation';

// A Reprodução foi absorvida pelos painéis de espécie (Leite × Corte) como aba.
// Mantido como redirect para compatibilidade de links antigos.
export default function ReproducaoPage() {
  redirect('/dashboard/rebanho/leiteira');
}
