# Módulo de Rebanho — Visão Geral

## Objetivo
Permitir cadastro vivo do rebanho da fazenda, com lançamento contínuo
de eventos (nascimento, pesagem, cobertura, prenhez, parto, secagem,
morte, venda) para servir como fonte de dados real para o módulo de
Planejamento de Silagem e futuros módulos zootécnicos.

A premissa central: o produtor cadastra o rebanho uma vez (ou importa
via planilha) e, a partir daí, apenas registra eventos no dia a dia.
O sistema mantém o estado do rebanho atualizado automaticamente.

## Público-alvo
Produtores brasileiros com rebanho leiteiro ou de
corte

## Escopo geral
- Cadastro individual de animais manual ou com importação CSV
- Sistema de eventos (event sourcing simplificado)
- Categorização automática por idade, sexo e eventos
- Lotes de manejo (agrupamento lógico)
- Genealogia básica (mãe e pai)
- Integração com Planejamento de Silagem
- Indicadores zootécnicos básicos

## Fora de escopo (versão atual)
- Reconhecimento facial / IoT / brincos eletrônicos
- Sanidade detalhada (vacinas, medicamentos individuais)
- Controle leiteiro individual diário
- Genética avançada / cruzamento dirigido
- Comercialização / leilões

## Fases de entrega

### Fase 1 — Fundação
Cadastro de animais e lotes, eventos básicos (nascimento, pesagem,
morte, venda, transferência de lote), importação CSV.

### Fase 2 — Reprodução
Eventos reprodutivos (cobertura, diagnóstico de prenhez, parto,
secagem), calendário reprodutivo, categorização automática.

### Fase 3 — Integração com Planejamento de Silagem
Wizard de silagem consome dados reais do rebanho com projeção
temporal. Modo simulação preserva dados originais.

### Fase 4 — Indicadores Zootécnicos
GMD, taxa de natalidade, intervalo entre partos, mortalidade,
dashboard zootécnico, relatórios.

## Restrições técnicas (inegociáveis)
- Seguir CLAUDE.md em todos os aspectos
- RLS ativo em todas as tabelas
- fazenda_id preenchido via trigger (nunca no payload)
- Sem select('*')
- Compatível com PWA offline (eventos em fila quando offline)
- Mobile-first nas telas de lançamento de evento
- Tipagem estrita (sem any)

## Critérios de sucesso global
- Produtor consegue cadastrar 100 animais em menos de 30 minutos
  (via CSV)
- Lançamento de evento no curral em até 3 toques (mobile)
- Planejamento de silagem 100% automatizado a partir do rebanho
- Suite de testes mantém 100% de aprovação
