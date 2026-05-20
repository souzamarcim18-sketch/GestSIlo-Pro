#!/usr/bin/env node

/**
 * Script para testar integração com Resend
 * Uso: node scripts/test-resend.js
 */

const fs = require('fs');
const path = require('path');

// Ler .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const RESEND_API_KEY = envContent
  .split('\n')
  .find((line) => line.startsWith('RESEND_API_KEY='))
  ?.split('=')[1]
  ?.trim();

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY não está configurada em .env.local');
  process.exit(1);
}

async function testarResend() {
  try {
    console.log('🔍 Testando Resend API...\n');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Domínio de teste; em produção será noreply@gestsilo.com.br
        to: process.argv[2] || 'delivered@resend.dev',
        subject: 'Teste GestSilo - Link Mágico',
        html: `
          <h2>Email de Teste</h2>
          <p>Este é um email de teste da integração Resend com GestSilo Pro.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>Se você receber este email, a integração está funcionando! ✅</p>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar email:');
      console.error(data);
      process.exit(1);
    }

    console.log('✅ Email enviado com sucesso!');
    console.log('\nDetalhes:');
    console.log(`  ID: ${data.id}`);
    console.log(`  From: onboarding@resend.dev`);
    console.log(`  To: ${process.argv[2] || 'delivered@resend.dev'}`);
    console.log(`  Status: ${response.status}`);
    console.log('\n💡 Dica: Email de teste usando onboarding@resend.dev');
    console.log('   Para produção: configure seu domínio no Resend Dashboard')
    console.log('   Uso: node scripts/test-resend.js seu-email@exemplo.com');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testarResend();
