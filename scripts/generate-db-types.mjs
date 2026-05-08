#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Carrega .env.local manualmente (Node não faz isso automaticamente)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const projectId = process.env.SUPABASE_PROJECT_ID;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectId) {
  console.error('❌ SUPABASE_PROJECT_ID não foi definido em .env.local');
  process.exit(1);
}

if (!accessToken) {
  console.error('❌ SUPABASE_ACCESS_TOKEN não foi definido em .env.local');
  console.error('Gere um em: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

try {
  console.log(`📦 Gerando tipos TypeScript para projeto: ${projectId}...`);

  const output = execSync(
    `npx supabase gen types typescript --project-id ${projectId} --schema public`,
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: accessToken,
      },
    }
  );

  const typesDir = path.join(process.cwd(), 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  const outputPath = path.join(typesDir, 'supabase.ts');
  fs.writeFileSync(outputPath, output);

  console.log(`✅ Tipos gerados com sucesso em ${outputPath}`);
} catch (error) {
  if (error.status === 127) {
    console.error('❌ Supabase CLI não encontrado. Rode: npm install --save-dev supabase');
  } else {
    console.error('❌ Erro ao gerar tipos:', error.message);
  }
  process.exit(1);
}
