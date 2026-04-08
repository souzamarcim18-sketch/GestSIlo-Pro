# Meu App — Contexto para Revisão

## Stack
- Frontend: Next.js 14+ com App Router
- Banco de dados: Supabase (PostgreSQL)
- Deploy: Vercel
- Linguagem: TypeScript

## Estrutura principal
- `app/` → páginas e rotas (App Router)
- `components/` → componentes reutilizáveis
- `lib/` → utilitários e configurações
- `types/` → tipagens TypeScript
- `public/` → assets estáticos

## Foco desta análise
- Qualidade geral do código
- Bugs e comportamentos inesperados
- Boas práticas Next.js e React
- Segurança nas chamadas ao Supabase

## Regras — nunca faça
- Não altere arquivos .env
- Não altere next.config.js
- Não reescreva componentes inteiros sem ser pedido

## Comandos do projeto
- Rodar local: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
