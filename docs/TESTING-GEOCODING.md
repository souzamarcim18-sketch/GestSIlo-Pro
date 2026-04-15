# 🧪 Guia de Teste: Geocoding + CityAutocomplete

## 1️⃣ Ambiente Local

### Iniciar o servidor
```bash
npm run dev
```

Acesso: http://localhost:3000

### Verificar console do servidor
A saída do Next.js mostrará logs do geocoding:
```
[geocoding/route] Nominatim: 15 resultados para "Belo"
[geocoding/route] 3 cidades retornadas após filtragem
```

---

## 2️⃣ Teste 1: API de Geocoding Diretamente

### Via Browser DevTools (Console)
```javascript
const res = await fetch('/api/geocoding?q=Ribeirao');
const data = await res.json();
console.log(data);
```

**Esperado:**
```json
[
  {
    "name": "Ribeirão Preto",
    "state": "São Paulo",
    "latitude": -21.1925,
    "longitude": -47.8060,
    "displayName": "Ribeirão Preto, São Paulo, Brasil"
  }
]
```

### Via curl (Terminal)
```bash
curl "http://localhost:3000/api/geocoding?q=Ribeirao"
```

---

## 3️⃣ Teste 2: Onboarding (Cadastro de Fazenda)

### Fluxo
1. Abrir: http://localhost:3000/dashboard/onboarding
2. Preencher "Nome da Fazenda" (ex: "Fazenda Teste")
3. No campo "Localização (Cidade)" digitar:
   - "Belo" → deve aparecer "Belo Horizonte, Minas Gerais, Brasil"
   - "Ribeirao" → deve aparecer "Ribeirão Preto, São Paulo, Brasil"
   - "Piracicaba" → deve aparecer a cidade em SP

### Esperado
- ✅ Dropdown aparece após 3 caracteres
- ✅ Cidades brasileiras aparecem com estado
- ✅ Ao clicar, campos de lat/lon são preenchidos silenciosamente
- ✅ Mensagem verde: "✓ Localização definida: ..."
- ✅ Ao clicar "Começar a usar", fazenda é criada com latitude/longitude

### Verificar no Supabase
```sql
SELECT nome, localizacao, latitude, longitude 
FROM fazendas 
ORDER BY created_at DESC 
LIMIT 1;

-- Deve retornar: 
-- nome: "Fazenda Teste"
-- localizacao: "Belo Horizonte, Minas Gerais, Brasil"
-- latitude: -19.928...
-- longitude: -43.940...
```

---

## 4️⃣ Teste 3: Configurações (Atualizar Localização)

### Fluxo
1. Fazer login
2. Ir para http://localhost:3000/dashboard/configuracoes
3. Clicar aba "Dados da Fazenda"
4. Ver campo "Localização (Cidade)"
5. Digitar "Sao Paulo" → deve listar cidades paulistas
6. Selecionar "São Paulo, São Paulo, Brasil"
7. Verificar campos read-only exibem:
   - Latitude: -23.5505...
   - Longitude: -46.6333...
8. Clicar "Salvar Dados"

### Esperado
- ✅ Toast: "Dados da fazenda atualizados!"
- ✅ No Supabase: latitude e longitude atualizados
- ✅ No Dashboard: WeatherWidget mostra previsão para SP

---

## 5️⃣ Teste 4: Dashboard Weather Widget

### Fluxo
1. Após criar/atualizar fazenda com coordenadas
2. Ir para http://localhost:3000/dashboard
3. Verificar Weather Widget (abaixo da saudação)

### Esperado
- ✅ Widget exibe clima atual da cidade
- ✅ Mostra previsão 3 dias
- ✅ Exibe alertas se houver (chuva, vento)
- ✅ "Atualizado X minutos atrás"
- ✅ Botão refresh funciona

---

## 6️⃣ Troubleshooting

### "Nenhuma cidade encontrada"

**Possíveis causas:**

1. **Nominatim offline**
   - Verificar: http://nominatim.openstreetmap.org/search?q=Belo&format=json
   - Se retorna erro, problema é no Nominatim (esperar)

2. **Query muito curta**
   - Requer **3+ caracteres**
   - "Sa" ❌ → "Sao" ✅

3. **Digitação incorreta**
   - Nominatim é sensível a acentuação
   - "Sao Paulo" ✅ (funciona sem acento)
   - "São Paulo" ✅ (funciona com acento também)

4. **Debug: Verificar logs do servidor**
   ```bash
   # Terminal onde npm run dev está rodando:
   [geocoding/route] Nominatim: 8 resultados para "Belo"
   [geocoding/route] 3 cidades retornadas após filtragem
   
   # Se disser "0 resultados retornados", o filtro está muito restritivo
   ```

### "Erro ao buscar cidades" (Toast de erro)

1. **Timeout (5s)**
   - Nominatim demorou muito
   - Tentar novamente em alguns segundos

2. **Erro 400**
   - Query muito curta ou inválida
   - Verificar console do browser

3. **Erro 503**
   - Nominatim indisponível
   - Usar endereço de fallback (ver seção abaixo)

---

## 7️⃣ Fallback (Se Nominatim Estiver Down)

### Para teste offline
Você pode mockar a resposta da API no browser:

```javascript
// No DevTools Console
fetch('/api/geocoding?q=teste').then(r => r.json()).then(d => {
  // Se retornar erro, é um problema real
  console.error('Geocoding Error:', d);
});
```

### Ou usar Postman
- URL: http://localhost:3000/api/geocoding?q=Ribeirao
- Method: GET
- Verificar response e status

---

## 8️⃣ Checklist Final

- [ ] API `/api/geocoding?q=Ribeirao` retorna array com cidades
- [ ] Onboarding: autocomplete funciona e salva lat/lon
- [ ] Configurações: pode atualizar cidade e ver coords
- [ ] Dashboard: WeatherWidget mostra previsão
- [ ] Lint: `npm run lint` ✅
- [ ] Build: `npm run build` ✅
- [ ] Nenhum erro no console do browser
- [ ] Nenhum `any` implícito no código

---

## 📝 Notas

- **Nominatim Cache:** API Route cache por 24h. Para limpar, usar `?q=DIFERENTE`
- **Rate Limit:** Nominatim: 1 req/segundo. Projeto implementa debounce 300ms
- **Idioma:** Nominatim retorna em português (Brasil/Brasil) com `Accept-Language: pt-BR`
- **Timezone:** Coordenadas estão em WGS84 (latitude -90 a 90, longitude -180 a 180)

---

## 🆘 Suporte

Se ainda não funcionar:

1. Verificar se pode acessar Nominatim diretamente:
   ```bash
   curl "https://nominatim.openstreetmap.org/search?q=Belo,Brasil&format=json&addressdetails=1"
   ```

2. Ativar logs detalhados na API Route (adicionar console.log)

3. Verificar `.env.local` tem todas as variáveis (OPENWEATHER_API_KEY é obrigatória)
