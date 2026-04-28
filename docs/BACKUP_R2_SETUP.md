# 🛡️ Setup: Backup Automatizado com Cloudflare R2 (LGPD)

Este documento guia a configuração do Cloudflare R2 para receber backups automáticos do banco de dados GestSilo Pro.

## 📋 Pré-requisitos

- Conta Cloudflare ativa (plano free é suficiente para backups)
- Acesso ao repositório GitHub com permissão de admin
- Acesso ao Supabase para obter string de conexão DB
- Email configurado para receber notificações de falha

---

## Passo 1️⃣: Criar Bucket no Cloudflare R2

### 1.1 Acessar Dashboard do Cloudflare

1. Acesse [dashboard.cloudflare.com](https://dashboard.cloudflare.com)
2. Faça login com sua conta
3. No menu esquerdo, clique em **Storage** → **R2**

### 1.2 Criar novo bucket

1. Clique no botão **Create bucket**
2. **Bucket name**: `gestsilo-backups` (ou nome de sua preferência, sem espaços)
3. **Region**: Selecione a região mais próxima (ex: `wnam` para América do Norte, `weur` para Europa)
4. Deixe todas as outras opções no padrão
5. Clique **Create bucket**

✅ Seu bucket está pronto!

---

## Passo 2️⃣: Gerar Credenciais de API

### 2.1 Criar API Token do R2

1. No dashboard do Cloudflare, vá em **My Profile** (canto superior direito)
2. Clique em **API Tokens**
3. Clique em **Create Token**

### 2.2 Configurar permissões

1. **Template**: Selecione **Edit Cloudflare R2**
   - Ou crie um template customizado com:
     - **Permission**: `Object.List`, `Object.Read`, `Object.Write`, `Object.Delete` (todas as operações do R2)
     - **Resources**: Seu bucket `gestsilo-backups`

2. **TTL**: 1 year (ou sua preferência de renovação)

3. Clique **Continue to summary** → **Create Token**

### 2.3 Copiar credenciais

Você receberá um token assim:
```
v1.0_abcdef123456...
```

⚠️ **Copie e guarde este token em um lugar seguro** — você não poderá vê-lo novamente.

---

## Passo 3️⃣: Gerar Chave de Acesso S3 para R2

### 3.1 Acessar R2 API Tokens

1. Vá para **R2** → **Settings** (ou clique em seu bucket → **Settings**)
2. Role até **R2 API Token**
3. Clique em **Create API token**

### 3.2 Selecionar tipo de acesso

- **Type**: `S3 API token`
- **Name**: `GestSilo Backup` (nome descritivo)
- **TTL**: 1 year (ou sua preferência)
- **Permissions**: 
  - ✅ `Object.List`
  - ✅ `Object.Read`
  - ✅ `Object.Write`
  - ✅ `Object.Delete`

### 3.3 Criar token

Clique em **Create API token** e você receberá:

```json
{
  "access_key_id": "abc123def456...",
  "secret_access_key": "xyz789qwe123...",
  "endpoint": "https://abc123.r2.cloudflarestorage.com"
}
```

⚠️ **Copie estes dados** — a chave secreta não aparecerá novamente.

---

## Passo 4️⃣: Obter String de Conexão Supabase

### 4.1 Acessar Supabase

1. Vá para [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto GestSilo
3. Clique em **Settings** (engrenagem no menu esquerdo)
4. Vá até **Database** → **Connection string**

### 4.2 Copiar URL

Você verá algo como:
```
postgresql://postgres:seu_password@db.supabaseproject.com:5432/postgres
```

⚠️ **Copie a URL inteira** — inclui sua senha de acesso ao banco.

---

## Passo 5️⃣: Configurar Secrets no GitHub

### 5.1 Acessar repositório GitHub

1. Vá para seu repositório GestSilo no GitHub
2. Clique em **Settings** (abinha do repositório)
3. No menu esquerdo: **Secrets and variables** → **Actions**

### 5.2 Criar cada secret

Clique em **New repository secret** para cada uma:

#### Secret 1: `SUPABASE_DB_URL`
- **Name**: `SUPABASE_DB_URL`
- **Value**: `postgresql://postgres:seu_password@db.supabaseproject.com:5432/postgres`
- Clique **Add secret**

#### Secret 2: `R2_ACCESS_KEY_ID`
- **Name**: `R2_ACCESS_KEY_ID`
- **Value**: `abc123def456...` (seu access_key_id do R2)
- Clique **Add secret**

#### Secret 3: `R2_SECRET_ACCESS_KEY`
- **Name**: `R2_SECRET_ACCESS_KEY`
- **Value**: `xyz789qwe123...` (sua secret_access_key do R2)
- Clique **Add secret**

#### Secret 4: `R2_ENDPOINT`
- **Name**: `R2_ENDPOINT`
- **Value**: `https://abc123.r2.cloudflarestorage.com`
- Clique **Add secret**

#### Secret 5: `R2_BUCKET`
- **Name**: `R2_BUCKET`
- **Value**: `gestsilo-backups` (o nome do seu bucket)
- Clique **Add secret**

#### Secret 6: `BACKUP_ALERT_EMAIL`
- **Name**: `BACKUP_ALERT_EMAIL`
- **Value**: `seu_email@example.com` (email para receber alertas de falha)
- Clique **Add secret**

#### Secret 7: `MAIL_SERVER`
- **Name**: `MAIL_SERVER`
- **Value**: `smtp.resend.com` ou seu servidor SMTP
- Clique **Add secret**

#### Secret 8: `MAIL_PORT`
- **Name**: `MAIL_PORT`
- **Value**: `587`
- Clique **Add secret**

#### Secret 9: `MAIL_USER`
- **Name**: `MAIL_USER`
- **Value**: `noreply@seu_dominio.com` ou seu usuário SMTP
- Clique **Add secret**

#### Secret 10: `MAIL_PASSWORD`
- **Name**: `MAIL_PASSWORD`
- **Value**: Sua senha/API key SMTP
- Clique **Add secret**

✅ Todos os secrets estão configurados!

---

## Passo 6️⃣: Testar o Workflow

### 6.1 Disparar manualmente

1. No GitHub, vá para **Actions**
2. Selecione **Backup Automatizado DB (LGPD)**
3. Clique em **Run workflow** → **Run workflow**

### 6.2 Monitorar execução

1. Espere a execução (deve demorar 1-5 minutos)
2. Se ✅ passar: Parabéns! Seu backup foi criado no R2
3. Se ❌ falhar: Verifique o log de erro e corrija o secret faltando

### 6.3 Verificar arquivo no R2

1. Vá para seu bucket no Cloudflare: **R2** → **gestsilo-backups**
2. Você deve ver uma pasta **backups/** com arquivo tipo `backup_20260428_030000.sql.gz`

---

## 🛡️ Segurança & Boas Práticas

### Proteção de Dados

- ✅ **Encrypt at rest**: Cloudflare R2 criptografa automaticamente
- ✅ **Isolation**: Apenas GitHub Actions tem acesso via secrets
- ✅ **LGPD Compliance**: Backups fora da Vercel, em nuvem secundária

### Rotação de Credenciais

Recomenda-se a cada 90 dias:

1. Gere um novo R2 API Token
2. Atualize o secret no GitHub
3. Delete o token antigo no Cloudflare

### Recuperação de Dados

Se precisar restaurar um backup:

```bash
# 1. Download do backup
aws s3 cp s3://gestsilo-backups/backups/backup_20260428_030000.sql.gz . \
  --endpoint-url https://abc123.r2.cloudflarestorage.com \
  --region auto

# 2. Descompactar
gunzip backup_20260428_030000.sql.gz

# 3. Restaurar no Supabase
psql "postgresql://postgres:senha@db.supabaseproject.com:5432/postgres" < backup_20260428_030000.sql
```

---

## 📊 Cronograma de Backup

O workflow está configurado para rodar:

- **Quando**: Todo **domingo às 3h UTC** (00:00 horário de Brasília)
- **Frequência**: Semanal
- **Formato**: Comprimido gzip (reduz tamanho em ~90%)
- **Retenção**: Configure conforme necessário no Cloudflare R2 (Life Cycle Rules)

### Exemplo de retenção (30 dias)

1. Vá para seu bucket R2
2. **Settings** → **Lifecycle rules**
3. **Delete objects** depois de 30 dias
4. Aplique à pasta `/backups/*`

---

## 🆘 Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| `pg_dump: command not found` | PostgreSQL client não instalado | Workflow instala automaticamente (ubuntu-latest) |
| `AccessDenied` no R2 | Credenciais inválidas ou token expirado | Regenere o R2 API Token |
| `Connection refused` ao Supabase | URL inválida ou senha errada | Verifique `SUPABASE_DB_URL` no secret |
| `SMTP authentication failed` | Credenciais de email inválidas | Teste seu servidor SMTP manualmente |
| Arquivo não aparece em R2 | Rclone não foi configurado corretamente | Verifique endpoint R2 e bucket name |

---

## 📝 Checklist Final

- [ ] Bucket R2 criado (`gestsilo-backups`)
- [ ] R2 API Token gerado e copiado
- [ ] Todos os 10 secrets adicionados no GitHub
- [ ] Workflow disparado manualmente com sucesso
- [ ] Arquivo `.sql.gz` visível no R2
- [ ] Email de notificação testado (opcional)
- [ ] Rotina semanal ativa (próximo backup: domingo)

---

## 📚 Referências

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Rclone Cloudflare Setup](https://rclone.org/s3/#cloudflare-r2)
- [PostgreSQL pg_dump Manual](https://www.postgresql.org/docs/current/app-pgdump.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [LGPD Lei 13.709/2018](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

**Última atualização**: 28/04/2026  
**Versão**: 1.0  
**Responsável**: DevOps / Admin
