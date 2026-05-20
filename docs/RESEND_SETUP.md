# 📧 Configuração do Resend para GestSilo Pro

## Status Atual
- ✅ API Resend funcionando com domínio de teste (`onboarding@resend.dev`)
- ⏳ Domínio `gestsilo.com.br` aguardando configuração

## Passo 1: Acessar Dashboard Resend

1. Acesse https://resend.com/dashboard
2. Faça login com sua conta

## Passo 2: Adicionar o Domínio

1. No menu lateral, clique em **Domains**
2. Clique no botão **+ Add Domain**
3. Digite: `gestsilo.com.br`
4. Clique em **Add Domain**

## Passo 3: Configurar Registros DNS

Você verá 3 registros DNS para adicionar:

### Registros SPF
```
Type: TXT
Name: (deixar em branco ou @)
Value: v=spf1 include:resend.com ~all
```

### Registros DKIM
```
Type: CNAME
Name: default._domainkey
Value: (fornecido pelo Resend)
```

### Registros DMARC
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine
```

## Passo 4: Adicionar Registros no seu Provedor DNS

1. Acesse o painel de controle do seu provedor DNS (GoDaddy, Cloudflare, etc.)
2. Adicione cada registro conforme acima
3. Aguarde a propagação DNS (pode levar alguns minutos)

## Passo 5: Verificar no Resend

No dashboard Resend:
1. Volte para a página de Domains
2. Clique no domínio `gestsilo.com.br`
3. Clique em **Check DNS Configuration**
4. Aguarde a verificação ✅

## Passo 6: Usar em Produção

Após verificação:
- O email será enviado de: `noreply@gestsilo.com.br`
- Em produção, configure em Vercel:
  ```
  RESEND_API_KEY=<sua-chave>
  ```

## Teste Local

Para testar em desenvolvimento:
```bash
node scripts/test-resend.js seu-email@exemplo.com
```

### Comportamento Automático
- **Desenvolvimento** (`NODE_ENV=development`): `onboarding@resend.dev`
- **Produção** (`NODE_ENV=production`): `noreply@gestsilo.com.br`

## Troubleshooting

### "This API key is not authorized to send emails from..."
❌ Você tentou usar um domínio que não está verificado

✅ **Solução**: Configure o domínio no Resend conforme Passo 2-5 acima

### Email foi para spam
✅ Isto é normal em teste. Domínios verificados têm melhor taxa de entrega

### Não recebo emails de teste
- Verifique o email de destino
- Tente: `delivered@resend.dev` (email de teste do Resend)
- Aguarde 5-10 segundos

## Links Úteis

- [Resend Dashboard](https://resend.com/dashboard)
- [Documentação Resend](https://resend.com/docs)
- [Guia de Configuração de Domínios](https://resend.com/docs/dashboard/domains/setup)

## Próximo Passo

Após configurar o domínio, você pode:
1. ✅ Testar emails reais no GestSilo Pro
2. ✅ Consultor receberá links mágicos funcionais
3. ✅ Deploy em produção com email real
