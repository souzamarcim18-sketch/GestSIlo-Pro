import { notFound } from 'next/navigation';
import { queryReprodutores, queryEventosRebanho } from '@/lib/supabase/rebanho-reproducao';
import ReprodutorDetailClient from './ReprodutorDetailClient';

interface ReprodutorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ReprodutorDetailPage({ params }: ReprodutorPageProps) {
  const { id } = await params;

  const [reprodutor, coberturas] = await Promise.all([
    queryReprodutores.getById(id),
    queryEventosRebanho.listCoberturasPorReprodutorId(id),
  ]);

  if (!reprodutor) {
    notFound();
  }

  return <ReprodutorDetailClient reprodutor={reprodutor} coberturas={coberturas} />;
}
