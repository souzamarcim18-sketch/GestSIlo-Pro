/**
 * Testes RLS para Indicadores Rebanho — T47
 * ~6 testes contra BANCO DE TESTE REAL (não mocks)
 *
 * IMPORTANTE: Estes testes requerem:
 * - SUPABASE_TEST_URL (projeto de teste)
 * - SUPABASE_TEST_ANON_KEY
 * - Usuários de teste criados com diferentes roles
 * - skip() se variáveis não disponíveis
 */

import { describe, it, expect, beforeAll, afterAll, skip } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const TEST_ENABLED =
  !!process.env.SUPABASE_TEST_URL && !!process.env.SUPABASE_TEST_ANON_KEY;

describe.skipIf(!TEST_ENABLED)(
  'RLS — Indicadores Rebanho (Banco de Teste Real)',
  () => {
    let adminClient: SupabaseClient;
    let operadorClient: SupabaseClient;
    let visualizadorClient: SupabaseClient;

    const FAZENDA_TEST_A = '10000000-0000-0000-0000-000000000001';
    const FAZENDA_TEST_B = '20000000-0000-0000-0000-000000000002';

    const USUARIOS_TESTE = {
      admin: {
        email: 'admin-t47@test.gestsilo.local',
        password: 'TestAdmin123!@#',
        role: 'Administrador',
      },
      operador: {
        email: 'operador-t47@test.gestsilo.local',
        password: 'TestOperador456!@#',
        role: 'Operador',
      },
      visualizador: {
        email: 'visualizador-t47@test.gestsilo.local',
        password: 'TestVisu789!@#',
        role: 'Visualizador',
      },
    };

    beforeAll(async () => {
      // Conectar como admin (service role) para criar dados de teste
      adminClient = createClient(
        process.env.SUPABASE_TEST_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_TEST_ANON_KEY!,
        { auth: { persistSession: false } }
      );

      // Criar usuários de teste se não existirem
      for (const [role, user] of Object.entries(USUARIOS_TESTE)) {
        const { data: existente } = await adminClient.auth.admin.listUsers();
        const jaExiste = existente?.users?.some(
          (u) => u.email === user.email
        );

        if (!jaExiste) {
          const { error } = await adminClient.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              perfil: user.role,
              fazenda_id: role === 'admin' ? FAZENDA_TEST_A : FAZENDA_TEST_A,
            },
          });
          if (error) console.warn(`Erro criando ${role}:`, error);
        }
      }

      // Conectar como operador
      const { data: opData, error: opError } = await createClient(
        process.env.SUPABASE_TEST_URL!,
        process.env.SUPABASE_TEST_ANON_KEY!
      ).auth.signInWithPassword({
        email: USUARIOS_TESTE.operador.email,
        password: USUARIOS_TESTE.operador.password,
      });

      if (!opError && opData?.session) {
        operadorClient = createClient(
          process.env.SUPABASE_TEST_URL!,
          process.env.SUPABASE_TEST_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${opData.session.access_token}`,
              },
            },
          }
        );
      }

      // Conectar como visualizador
      const { data: visData, error: visError } = await createClient(
        process.env.SUPABASE_TEST_URL!,
        process.env.SUPABASE_TEST_ANON_KEY!
      ).auth.signInWithPassword({
        email: USUARIOS_TESTE.visualizador.email,
        password: USUARIOS_TESTE.visualizador.password,
      });

      if (!visError && visData?.session) {
        visualizadorClient = createClient(
          process.env.SUPABASE_TEST_URL!,
          process.env.SUPABASE_TEST_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${visData.session.access_token}`,
              },
            },
          }
        );
      }

      // Inserir dados de teste
      await adminClient.from('fazendas').insert([
        {
          id: FAZENDA_TEST_A,
          nome: 'Fazenda Teste A (T47)',
          tipo_exploracao: 'MISTO',
        },
        {
          id: FAZENDA_TEST_B,
          nome: 'Fazenda Teste B (T47)',
          tipo_exploracao: 'CORTE',
        },
      ]);
    });

    afterAll(async () => {
      // Limpeza: deletar dados de teste
      // (em produção, isso seria gerenciado por migrations/fixtures)
    });

    describe('Operador: Leitura (SELECT) Permitida', () => {
      it('operador pode ler animais da sua fazenda', async () => {
        const { data, error } = await operadorClient
          .from('animais')
          .select('id, brinco, categoria')
          .eq('fazenda_id', FAZENDA_TEST_A)
          .limit(1);

        // RLS permite SELECT para operador
        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('operador pode ler eventos da sua fazenda', async () => {
        const { data, error } = await operadorClient
          .from('eventos_rebanho')
          .select('id, tipo, data_evento')
          .eq('fazenda_id', FAZENDA_TEST_A)
          .limit(1);

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('operador pode ler pesos da sua fazenda', async () => {
        const { data, error } = await operadorClient
          .from('pesos_animal')
          .select('id, peso_kg, data_pesagem')
          .eq('fazenda_id', FAZENDA_TEST_A)
          .limit(1);

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });
    });

    describe('Operador: Escrita Bloqueada por RLS', () => {
      it('operador NÃO pode INSERT em reprodutores (admin-only)', async () => {
        const { error } = await operadorClient.from('reprodutores').insert({
          fazenda_id: FAZENDA_TEST_A,
          nome: 'Touro Teste',
          raca: 'Holandês',
          status: 'Ativo',
        });

        // RLS: reprodutores_insert requer sou_admin()
        expect(error).toBeDefined();
        expect(error?.code).toMatch(/PGRST120|23502/); // RLS violation ou constraint
      });

      it('operador NÃO pode UPDATE evento de descarte (admin-only)', async () => {
        // Primeiro, criar evento como admin
        const { data: eventoCriado } = await adminClient
          .from('eventos_rebanho')
          .insert({
            fazenda_id: FAZENDA_TEST_A,
            animal_id: '10000000-0000-0000-0000-000000000001',
            tipo: 'descarte',
            data_evento: '2026-02-15',
            observacoes: 'Original',
          })
          .select()
          .single();

        if (!eventoCriado?.id) return;

        // Tentar UPDATE como operador
        const { error } = await operadorClient
          .from('eventos_rebanho')
          .update({ observacoes: 'Modificado por operador' })
          .eq('id', eventoCriado.id);

        // RLS: eventos_update para descarte requer sou_admin()
        expect(error).toBeDefined();
        expect(error?.code).toMatch(/PGRST120|23502/);
      });

      it('operador NÃO pode DELETE animais', async () => {
        const { error } = await operadorClient
          .from('animais')
          .delete()
          .eq('id', '10000000-0000-0000-0000-000000000001');

        // RLS: animais_delete requer sou_admin()
        expect(error).toBeDefined();
        expect(error?.code).toMatch(/PGRST120|23502/);
      });
    });

    describe('Visualizador: Acesso Restrito', () => {
      it('visualizador pode ler animais (read-only)', async () => {
        const { data, error } = await visualizadorClient
          .from('animais')
          .select('id, brinco')
          .eq('fazenda_id', FAZENDA_TEST_A)
          .limit(1);

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('visualizador NÃO pode INSERT eventos', async () => {
        const { error } = await visualizadorClient
          .from('eventos_rebanho')
          .insert({
            fazenda_id: FAZENDA_TEST_A,
            animal_id: '10000000-0000-0000-0000-000000000001',
            tipo: 'parto',
            data_evento: '2026-02-15',
          });

        // RLS: eventos_insert requer operador+
        expect(error).toBeDefined();
        expect(error?.code).toMatch(/PGRST120|23502/);
      });

      it('visualizador NÃO pode UPDATE peso_animal', async () => {
        const { error } = await visualizadorClient
          .from('pesos_animal')
          .update({ peso_kg: 999.9 })
          .eq('id', 'peso-teste-001');

        // RLS: pesos_animal_update requer operador+
        expect(error).toBeDefined();
        expect(error?.code).toMatch(/PGRST120|23502/);
      });
    });

    describe('Isolamento por Fazenda (Multi-Tenancy)', () => {
      it('operador da Fazenda A NÃO pode ler dados da Fazenda B', async () => {
        // Operador está autenticado com FAZENDA_TEST_A
        // Tenta ler da FAZENDA_TEST_B
        const { data, error } = await operadorClient
          .from('animais')
          .select('id')
          .eq('fazenda_id', FAZENDA_TEST_B)
          .limit(1);

        // RLS: deve filtrar automaticamente via get_minha_fazenda_id()
        if (data) {
          // Se retorna dados, deve estar vazio
          expect(data.length).toBe(0);
        } else if (error) {
          // Ou deve retornar erro
          expect(error.code).toMatch(/PGRST120/);
        }
      });

      it('SQL injection via fazenda_id NÃO é possível (prepared statements)', async () => {
        // Tentar injetar SQL no filtro
        const maliciousId =
          "'; DROP TABLE animais; --";

        const { data, error } = await operadorClient
          .from('animais')
          .select('id')
          .eq('fazenda_id', maliciousId);

        // Deve rejeitar (não matching UUID, ou RLS violation)
        // Não deve deletar table!
        expect(error || data?.length === 0).toBeTruthy();

        // Verificar que tabela ainda existe
        const { error: checkError } = await adminClient
          .from('animais')
          .select('id')
          .limit(1);

        expect(checkError).toBeNull(); // Table still exists
      });
    });

    describe('Admin: Acesso Completo', () => {
      it('admin pode ler dados de qualquer fazenda', async () => {
        const { data: dataA, error: errorA } = await adminClient
          .from('animais')
          .select('id')
          .eq('fazenda_id', FAZENDA_TEST_A);

        const { data: dataB, error: errorB } = await adminClient
          .from('animais')
          .select('id')
          .eq('fazenda_id', FAZENDA_TEST_B);

        expect(errorA).toBeNull();
        expect(errorB).toBeNull();
        expect(dataA).toBeDefined();
        expect(dataB).toBeDefined();
      });
    });
  }
);

/**
 * Notas:
 *
 * 1. Se SUPABASE_TEST_URL/KEY não definidas, testes são skipped automaticamente
 * 2. Testes reais validam:
 *    - RLS policies ativas em tabelas críticas
 *    - Isolamento por fazenda (multi-tenancy)
 *    - Proteção contra SQL injection
 *    - Roles (admin vs operador vs visualizador)
 *
 * 3. Para rodar localmente:
 *    export SUPABASE_TEST_URL="https://your-test-project.supabase.co"
 *    export SUPABASE_TEST_ANON_KEY="your-test-key"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *    npm run test tests/security/rebanho-indicadores-rls.test.ts
 */
