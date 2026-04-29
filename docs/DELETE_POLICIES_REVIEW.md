# 🔍 Revisão Futura — Políticas de DELETE com Novo Perfil "Gerente"

> **Data:** 29/04/2026  
> **Contexto:** Se o perfil `"Gerente"` for adicionado ao banco de dados e às policies RLS  
> **Status:** ⚠️ PENDENTE — Revisar estes 6 arquivos

---

## Mudanças Necessárias

Se a policy RLS for atualizada para:
```sql
-- Antes (apenas Admin):
silos_delete_admin_gerente
talhoes_delete_admin_gerente
-- etc.

-- Depois (Admin + Gerente):
-- Policy RLS já aceita Gerente
```

Os 6 arquivos abaixo devem mudar de:
```typescript
{profile?.perfil === 'Administrador' && (
  <Button variant="destructive">Deletar</Button>
)}
```

Para:
```typescript
{(profile?.perfil === 'Administrador' || profile?.perfil === 'Gerente') && (
  <Button variant="destructive">Deletar</Button>
)}
```

---

## Arquivos a Revisar

### 1. `app/dashboard/silos/[id]/page.tsx`
- **Linha:** ~191
- **Trecho atual:** `{profile?.perfil === 'Administrador' && (`
- **Atualizar para:** `{(profile?.perfil === 'Administrador' || profile?.perfil === 'Gerente') && (`

### 2. `app/dashboard/talhoes/components/TalhaoDetailHeader.tsx`
- **Linha:** ~64
- **Trecho atual:** `{profile?.perfil === 'Administrador' && (`
- **Atualizar para:** `{(profile?.perfil === 'Administrador' || profile?.perfil === 'Gerente') && (`

### 3. `app/dashboard/talhoes/components/tabs/TalhaoResumoTab.tsx`
- **Linha:** ~195
- **Trecho atual:** `{profile?.perfil === 'Administrador' && (`
- **Atualizar para:** `{(profile?.perfil === 'Administrador' || profile?.perfil === 'Gerente') && (`

### 4. `app/dashboard/financeiro/page.tsx`
- **Linha:** ~439
- **Trecho atual:** `{profile?.perfil === 'Administrador' && (`
- **Atualizar para:** `{(profile?.perfil === 'Administrador' || profile?.perfil === 'Gerente') && (`

### 5. `app/dashboard/frota/components/FrotaCadastro.tsx`
- **Linha:** ~135
- **Trecho atual:** `{profile?.perfil === 'Administrador' && (`
- **Atualizar para:** `{(profile?.perfil === 'Administrador' || profile?.perfil === 'Gerente') && (`

### 6. `app/dashboard/configuracoes/page.tsx`
- **Linha:** ~432
- **Trecho atual:** `{userProfile?.perfil === 'Administrador' && (`
- **Atualizar para:** `{(userProfile?.perfil === 'Administrador' || userProfile?.perfil === 'Gerente') && (`

---

## ✅ Checklist de Execução

Quando o perfil "Gerente" for adicionado:

- [ ] Atualizar RLS policies no Supabase (se não estiverem já atualizadas)
- [ ] Revisar e editar os 6 arquivos acima
- [ ] Testar DELETE com perfil Gerente (`npm run test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Commit com mensagem: `fix: permite DELETE para admin/gerente em 6 arquivos (P6)`

---

## 📝 Notas

- A maioria dos arquivos usa `profile?.perfil` (do hook `useAuth`)
- `configuracoes/page.tsx` usa `userProfile?.perfil` (vem de `useAuth` também)
- Todas as condições devem ser atualizadas **simultaneamente** para evitar inconsistência de UX
