import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Uso: npx ts-node --project tsconfig.json scripts/criar-admin.ts
// Requer no .env.local:
//   ADMIN_NOME="Marcio"
//   ADMIN_EMAIL_INICIAL=seu@email.com
//   ADMIN_SENHA_INICIAL=sua-senha-forte

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const nome = process.env.ADMIN_NOME;
  const email = process.env.ADMIN_EMAIL_INICIAL;
  const senha = process.env.ADMIN_SENHA_INICIAL;

  if (!nome || !email || !senha) {
    console.error(
      'Defina ADMIN_NOME, ADMIN_EMAIL_INICIAL e ADMIN_SENHA_INICIAL no .env.local'
    );
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const { error } = await supabase
    .from('gestsilo_admins')
    .insert({ nome, email, senha_hash: senhaHash });

  if (error) {
    console.error('Erro ao criar admin:', error.message);
    process.exit(1);
  }

  console.log(`Admin criado com sucesso: ${email}`);
}

main();
