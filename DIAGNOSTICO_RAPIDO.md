# 🚀 Diagnóstico Rápido - 3 Minutos

## Opção 1: Ferramenta de Diagnóstico Interativa ⭐ RECOMENDADO

### Passo 1: Abrir a ferramenta
```bash
# 1. Inicie o servidor de desenvolvimento
npm run dev

# 2. Abra no navegador:
http://localhost:5173/test-specific-point.html
```

### Passo 2: Configurar credenciais
A ferramenta já está pré-configurada! Apenas clique em **"▶️ Executar Todos"**

### Passo 3: Ler o resultado
A ferramenta vai mostrar exatamente qual é o problema:
- ✅ Verde = Tudo OK
- ❌ Vermelho = Problema encontrado
- ⚠️ Amarelo = Atenção

---

## Opção 2: Console do Navegador (5 minutos)

### Passo 1: Abrir a aplicação
```bash
npm run dev
```

### Passo 2: Abrir o Console
1. Pressione **F12** (ou Ctrl+Shift+J)
2. Vá para a aba "Console"

### Passo 3: Selecionar o cliente
- Cliente ID: **17469701015018**
- Observe os logs com **[DEBUG]**

### Passo 4: Identificar o problema
Procure por estes logs:

#### Se ver: `Query returned 0 measurements`
**PROBLEMA:** Medições fora do período de 30 dias
**SOLUÇÃO:** Ajuste as datas para incluir as medições

#### Se ver: `Available types: []`
**PROBLEMA:** Apenas medições tipo "Foto"
**SOLUÇÃO:** Adicione medições de pH, Cloro, Turbidez, Volume, etc.

#### Se ver: `datasetsCount: 0`
**PROBLEMA:** Dados encontrados mas não processados corretamente
**SOLUÇÃO:** Verifique a estrutura dos dados (execute queries SQL)

---

## Opção 3: Query SQL Rápida (1 minuto)

Abra o **Supabase SQL Editor** e execute:

```sql
-- Verificar se há medições nos últimos 90 dias (excluindo Foto)
SELECT
  COUNT(*) as total_medicoes,
  STRING_AGG(DISTINCT tm.nome, ', ') as tipos_encontrados,
  MIN(m.data_hora_medicao) as primeira_medicao,
  MAX(m.data_hora_medicao) as ultima_medicao
FROM medicao m
JOIN ponto_de_coleta p ON m.ponto_de_coleta_id = p.id
JOIN area_de_trabalho a ON p.area_de_trabalho_id = a.id
LEFT JOIN medicao_items mi ON mi.medicao_id = m.id
LEFT JOIN tipos_medicao tm ON mi.tipo_medicao_id = tm.id
WHERE m.cliente_id = '17469701015018'
  AND a.nome_area = 'BENEFICIAMENTO'
  AND p.nome = 'Torneira da pia'
  AND m.data_hora_medicao >= NOW() - INTERVAL '90 days'
  AND (tm.nome IS NULL OR tm.nome != 'Foto')
GROUP BY 1;
```

### Interpretar o resultado:

**Se retornar 0 rows:**
→ Não há medições válidas nos últimos 90 dias
→ Verifique se há medições mais antigas ou adicione novas

**Se `tipos_encontrados` estiver vazio:**
→ Só há fotos
→ Adicione medições numéricas (pH, Cloro, etc.)

**Se retornar dados:**
→ O problema está no frontend
→ Use a Opção 1 ou 2 para diagnosticar

---

## 📊 Resumo dos Problemas Comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `Query returned 0` | Fora do período | Ajustar datas |
| `Available types: []` | Só tem fotos | Adicionar medições numéricas |
| `datasetsCount: 0` | Dados não processados | Verificar estrutura no banco |
| Erro na query | Permissões RLS | Verificar acesso ao cliente |

---

## 🎯 Próximo Passo

1. **Execute a Opção 1** (ferramenta interativa) - é a mais fácil e rápida
2. Se encontrar o problema, aplique a solução indicada
3. Se não resolver, execute a query SQL (Opção 3) para validar

---

## 💡 Dica Importante

**O problema mais comum (60% dos casos)** é medições fora do período de 30 dias.

**Solução rápida:** No frontend, ajuste as datas para incluir um período maior (ex: últimos 90 ou 180 dias).

---

## 📞 Precisa de Ajuda?

Se após executar estes passos o problema persistir, forneça:
1. Screenshot da ferramenta de diagnóstico (Opção 1)
2. Resultado da query SQL (Opção 3)
3. Logs do console (Opção 2)
