#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectId = process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error(
    '❌ SUPABASE_PROJECT_ID não foi definido em .env.local ou variáveis de ambiente'
  );
  console.error('Por favor, configure a variável e tente novamente.');
  console.error('Exemplo no .env.local: SUPABASE_PROJECT_ID=seu_project_id');
  process.exit(1);
}

try {
  console.log(
    `📦 Gerando tipos TypeScript para projeto Supabase: ${projectId}...`
  );

  const output = execSync(
    `supabase gen types typescript --project-id ${projectId}`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }
  );

  // Criar diretório types se não existir
  const typesDir = path.join(process.cwd(), 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  const outputPath = path.join(typesDir, 'supabase.ts');
  fs.writeFileSync(outputPath, output);

  console.log(`✅ Tipos gerados com sucesso em ${outputPath}`);
} catch (error) {
  if (error.status === 127) {
    console.error(
      '❌ Supabase CLI não encontrado. Instale com: npm install -g supabase'
    );
  } else {
    console.error('❌ Erro ao gerar tipos:', error.message);
  }
  process.exit(1);
}
