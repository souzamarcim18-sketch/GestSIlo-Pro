import { queryParametrosReprodutivos } from '@/lib/supabase/rebanho-reproducao';
import { sou_admin } from '@/lib/auth/helpers';
import { ParametrosReprodutivosForm } from '@/components/rebanho/reproducao/ParametrosReprodutivosForm';

export default async function ParametrosPage() {
  const [parametros, admin] = await Promise.all([
    queryParametrosReprodutivos.get(),
    sou_admin(),
  ]);

  return <ParametrosReprodutivosForm parametros={parametros} isAdmin={admin} />;
}
