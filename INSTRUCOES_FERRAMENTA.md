# 🔧 Ferramenta de Diagnóstico - Instruções de Uso

## ✅ Correção Aplicada

O erro `supabase_js is not defined` foi corrigido! A ferramenta agora carrega a biblioteca corretamente.

## 🚀 Como Usar

### Passo 1: Iniciar o servidor
```bash
npm run dev
```

### Passo 2: Abrir a ferramenta no navegador
```
http://localhost:5173/test-specific-point.html
```

### Passo 3: Carregar credenciais (MAIS FÁCIL)
Clique no botão: **📁 Carregar do .env**

As credenciais serão carregadas automaticamente!

### Passo 4: Executar diagnóstico
Clique no botão: **▶️ Executar Todos**

## 📊 Interpretando os Resultados

A ferramenta vai mostrar logs coloridos:

### 🟢 Verde (Success)
```
✅ Ponto de coleta encontrado!
✅ Medições encontradas!
✅ Tipos válidos encontrados para gráfico!
```
**Significa:** Tudo está OK até aqui

### 🔴 Vermelho (Error)
```
❌ PROBLEMA: Nenhuma medição nos últimos 90 dias
❌ PROBLEMA: Apenas medições tipo "Foto"!
❌ PROBLEMA: Query do frontend retorna 0 medições
```
**Significa:** Problema identificado! Leia a mensagem

### 🟡 Amarelo (Warning)
```
⚠️ Execute o Teste 1 primeiro
💡 As medições podem estar mais antigas
💡 Adicione medições de tipos numéricos
```
**Significa:** Atenção ou sugestão

### 🔵 Azul (Info)
```
🔍 Teste 1: Verificando se o ponto existe...
📊 Total de medições encontradas: 15
   - pH: 10 (✅ VÁLIDO para gráfico)
```
**Significa:** Informação geral

## 🎯 Problemas Comuns e Soluções

### Problema 1: "Nenhuma medição nos últimos 90 dias"
**O que fazer:**
1. No frontend, ajuste o filtro de datas
2. Selecione um período maior (ex: 180 dias)
3. Ou adicione novas medições recentes

### Problema 2: "Apenas medições tipo 'Foto'"
**O que fazer:**
1. Adicione medições de outros tipos:
   - pH (valor entre 0-14)
   - Cloro (valor em mg/L)
   - Turbidez (valor em NTU)
   - Volume (valor em m³)
2. As fotos são exibidas em outra seção, não em gráficos

### Problema 3: "Query do frontend retorna 0 medições"
**O que fazer:**
1. Verifique se todas as medições têm `medicao_items` vinculados
2. Execute a Query 8 do `diagnostic-queries.sql` para encontrar medições órfãs
3. Vincule os items às medições

## 🔄 Botões da Ferramenta

| Botão | O que faz |
|-------|-----------|
| 1️⃣ Verificar se ponto existe | Valida que o ponto está cadastrado |
| 2️⃣ Buscar medições | Busca medições dos últimos 90 dias |
| 3️⃣ Verificar tipos | Mostra quais tipos de medição existem |
| 4️⃣ Simular query | Testa a query exata que o frontend usa |
| ▶️ Executar Todos | Roda todos os testes sequencialmente |
| 🗑️ Limpar | Limpa os resultados da tela |

## 💡 Dicas

1. **Sempre execute os testes na ordem** (1 → 2 → 3 → 4)
2. **Use "Executar Todos"** para fazer tudo de uma vez
3. **Leia as mensagens com 💡** - elas dão dicas de solução
4. **Se ver "Execute o Teste X primeiro"** - faça isso antes de continuar

## 🐛 Se a ferramenta não funcionar

1. **Console do navegador:** Pressione F12 e veja se há erros
2. **Credenciais:** Clique em "Carregar do .env" novamente
3. **Servidor:** Certifique-se que `npm run dev` está rodando
4. **CORS:** A ferramenta deve ser acessada via localhost:5173

## 📞 Ainda com problemas?

Se após usar a ferramenta você identificou o problema mas não sabe como resolver:

1. **Copie os logs** da ferramenta (Ctrl+A no painel de resultados, Ctrl+C)
2. **Tire um screenshot** da tela completa
3. **Relate qual teste falhou** e qual foi a mensagem vermelha

---

## ✅ Status da Correção

- [x] Erro `supabase_js is not defined` corrigido
- [x] Função de carregar credenciais implementada
- [x] Biblioteca Supabase carrega assincronamente
- [x] Credenciais pré-configuradas do .env
- [x] Tratamento de erros melhorado

**Agora você pode usar a ferramenta normalmente!** 🎉
