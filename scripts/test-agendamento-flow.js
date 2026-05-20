#!/usr/bin/env node

/**
 * Script para testar o fluxo completo de agendamento com email
 * Simula: usuário cria agendamento → email é enviado → link mágico é gerado
 */

const fs = require('fs');
const path = require('path');

// Ler .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) =>
  envContent
    .split('\n')
    .find((line) => line.startsWith(`${key}=`))
    ?.split('=')[1]
    ?.trim();

const RESEND_API_KEY = getEnv('RESEND_API_KEY');
const JWT_SECRET = getEnv('JWT_SECRET');
const CONSULTOR_EMAIL = getEnv('NEXT_PUBLIC_CONSULTOR_EMAIL');
const APP_URL = getEnv('NEXT_PUBLIC_APP_URL');

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY não está configurada');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não está configurada');
  process.exit(1);
}

async function testarFluxoAgendamento() {
  console.log('🧪 TESTE DE FLUXO DE AGENDAMENTO\n');
  console.log('=' .repeat(60));

  try {
    // Simulando dados de agendamento
    const agendamentoId = '550e8400-e29b-41d4-a716-446655440000';
    const fazenda = { nome: 'Fazenda Teste' };
    const usuario = { nome: 'João Silva' };

    const agendamento = {
      id: agendamentoId,
      tipo: 'reuniao_video',
      data_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
      observacoes: 'Gostaria de discutir sobre adubação de silos',
    };

    console.log('\n📋 SIMULAÇÃO DE DADOS:');
    console.log(`  Agendamento ID: ${agendamento.id}`);
    console.log(`  Data/Hora: ${new Date(agendamento.data_agendada).toLocaleDateString('pt-BR')} ${new Date(agendamento.data_agendada).toLocaleTimeString('pt-BR')}`);
    console.log(`  Fazenda: ${fazenda.nome}`);
    console.log(`  Responsável: ${usuario.nome}`);
    console.log(`  Email destinatário: ${CONSULTOR_EMAIL}`);

    // ============================================================
    // PASSO 1: Gerar JWT (link mágico)
    // ============================================================
    console.log('\n\n🔐 PASSO 1: Gerando JWT para link mágico...');

    const jwt = require('jsonwebtoken');
    const tokenConfirmar = jwt.sign(
      {
        agendamento_id: agendamento.id,
        tipo: 'confirmar',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
      },
      JWT_SECRET
    );

    const linkConfirmar = `${APP_URL}/assessor/confirmar?token=${tokenConfirmar}&agendamento=${agendamento.id}`;

    console.log('✅ JWT gerado com sucesso');
    console.log(`  Token: ${tokenConfirmar.substring(0, 50)}...`);
    console.log(`  Válido por: 24 horas`);
    console.log(`  Link: ${linkConfirmar.substring(0, 80)}...`);

    // ============================================================
    // PASSO 2: Enviar email via Resend
    // ============================================================
    console.log('\n\n📧 PASSO 2: Enviando email via Resend...');

    const dataFormatada = new Date(agendamento.data_agendada).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const horaFormatada = new Date(agendamento.data_agendada).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const tipoIcon = agendamento.tipo === 'reuniao_video' ? '📹' : '☎️';
    const tipoLabel = agendamento.tipo === 'reuniao_video' ? 'Reunião por Vídeo' : 'Chamada Telefônica';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .actions { display: flex; gap: 10px; margin: 20px 0; }
          .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .btn-success { background: #22c55e; color: white; }
          .btn-danger { background: #ef4444; color: white; }
          .btn-info { background: #3b82f6; color: white; }
          .footer { font-size: 12px; color: #999; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Solicitação de Agendamento</h2>
            <p>Uma fazenda solicitou uma reunião com você.</p>
          </div>

          <div class="details">
            <p><strong>📅 Data:</strong> ${dataFormatada} às ${horaFormatada}</p>
            <p><strong>🏠 Fazenda:</strong> ${fazenda.nome}</p>
            <p><strong>👤 Responsável:</strong> ${usuario.nome}</p>
            <p><strong>${tipoIcon} Tipo:</strong> ${tipoLabel}</p>
            ${agendamento.observacoes ? `<p><strong>📝 Observações:</strong> ${agendamento.observacoes}</p>` : ''}
          </div>

          <div class="actions">
            <a href="${linkConfirmar}" class="btn btn-success">✅ Confirmar</a>
          </div>

          <p style="color: #666; font-size: 14px;">
            Clique no botão acima para confirmar o agendamento.
          </p>

          <div class="footer">
            <p>Link válido por 24 horas.</p>
            <p>© GestSilo Pro - Plataforma de Gestão Agrícola</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@gestsilo.com.br',
        to: CONSULTOR_EMAIL,
        subject: `Solicitação de Agendamento - ${fazenda.nome}`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar email:');
      console.error(data);
      process.exit(1);
    }

    console.log('✅ Email enviado com sucesso!');
    console.log(`  ID do email (Resend): ${data.id}`);
    console.log(`  Destinatário: ${CONSULTOR_EMAIL}`);
    console.log(`  Remetente: noreply@gestsilo.com.br`);

    // ============================================================
    // PASSO 3: Mostrar instruções
    // ============================================================
    console.log('\n\n✨ PRÓXIMOS PASSOS:');
    console.log('=' .repeat(60));
    console.log('\n1️⃣  Verifique o email em ' + CONSULTOR_EMAIL);
    console.log('   (pode levar alguns minutos)\n');

    console.log('2️⃣  Clique no link "✅ Confirmar" no email');
    console.log('   Você será redirecionado para:', `${APP_URL}/assessor/confirmar`);
    console.log('   O TOKEN estará na URL automaticamente\n');

    console.log('3️⃣  Na página de confirmação, você pode:');
    console.log('   ✅ Confirmar o agendamento');
    console.log('   ❌ Recusar com motivo');
    console.log('   🔄 Sugerir nova data\n');

    console.log('4️⃣  O usuário receberá notificação do status em tempo real\n');

    // ============================================================
    // RESUMO TÉCNICO
    // ============================================================
    console.log('\n📊 RESUMO TÉCNICO:');
    console.log('=' .repeat(60));
    console.log('\nEmail Structure:');
    console.log(`  From: noreply@gestsilo.com.br`);
    console.log(`  To: ${CONSULTOR_EMAIL}`);
    console.log(`  Subject: Solicitação de Agendamento - ${fazenda.nome}`);
    console.log(`  Template: HTML responsivo com buttons interativos`);

    console.log('\nLink Mágico (JWT):');
    console.log(`  Validade: 24 horas`);
    console.log(`  Algoritmo: HS256`);
    console.log(`  Payload: agendamento_id + tipo (confirmar/recusar/remarcar)`);

    console.log('\nFluxo de Confirmação:');
    console.log(`  1. Clique no link → Abre /assessor/confirmar?token=...&agendamento=...`);
    console.log(`  2. JWT é validado no cliente`);
    console.log(`  3. Agendamento é carregado via API GET /api/assessoria/agendamentos/[id]`);
    console.log(`  4. Usuário escolhe: Confirmar / Recusar / Remarcar`);
    console.log(`  5. Status é atualizado via Server Action (atualizarStatusAgendamentoAction)`);
    console.log(`  6. Email de confirmação é enviado para o usuário`);

    console.log('\n✅ TESTE COMPLETADO COM SUCESSO!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testarFluxoAgendamento();
