# Guia para Desconectar e Reconectar Supabase

## Como Desconectar do Projeto Atual

### Método 1: Usando a Interface do Sistema
1. Acesse a página de administração
2. Procure pelo painel "Status da Conexão Supabase" no topo da página
3. Clique no botão "Desconectar"
4. Confirme a ação quando solicitado

### Método 2: Manual
1. Abra o arquivo `.env` na raiz do projeto
2. Remova ou comente as linhas:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Limpe o cache do navegador (localStorage e sessionStorage)

## Como Conectar a um Novo Projeto

### Passo 1: Obter Credenciais do Novo Projeto
1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione ou crie um novo projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** (URL do projeto)
   - **anon public** key (chave anônima)

### Passo 2: Atualizar Configuração
1. Abra o arquivo `.env` na raiz do projeto
2. Atualize com os novos valores:
   ```env
   VITE_SUPABASE_URL=https://seu-novo-projeto-id.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-nova-chave-anonima
   ```

### Passo 3: Reconectar
1. Use o botão "Reconectar" na interface do sistema, ou
2. Recarregue a página manualmente

## Verificação da Conexão

Após reconectar, o sistema irá:
- ✅ Validar as novas credenciais
- ✅ Testar a conexão com o banco de dados
- ✅ Exibir o status da conexão
- ✅ Mostrar o ID do novo projeto

## Migração de Dados (Opcional)

Se você quiser migrar dados do projeto anterior:

1. **Exportar dados do projeto antigo:**
   - Use o Supabase Dashboard
   - Vá em Database → Backups
   - Faça download do backup

2. **Importar no novo projeto:**
   - No novo projeto, vá em Database
   - Use SQL Editor para executar scripts de migração
   - Ou use a funcionalidade de restore

## Estrutura do Banco de Dados

Este sistema espera as seguintes tabelas no Supabase:
- `clientes`
- `area_de_trabalho`
- `ponto_de_coleta`
- `medicao`
- `medicao_items`
- `medicao_photos`
- `tipos_medicao`
- `client_users`

Se o novo projeto não tiver essas tabelas, você precisará executar as migrações SQL que estão na pasta `supabase/migrations/`.

## Solução de Problemas

### Erro: "Invalid API key"
- Verifique se a VITE_SUPABASE_ANON_KEY está correta
- Confirme se o projeto está ativo no Supabase

### Erro: "Project not found"
- Verifique se a VITE_SUPABASE_URL está correta
- Confirme se o projeto existe e está acessível

### Erro: "Table doesn't exist"
- Execute as migrações SQL do projeto
- Ou crie as tabelas manualmente usando o SQL Editor

### Cache não limpo
- Abra as ferramentas de desenvolvedor (F12)
- Vá em Application → Storage
- Limpe localStorage e sessionStorage manualmente
- Recarregue a página

## Contato

Se precisar de ajuda adicional, verifique:
- Os logs do console do navegador (F12)
- O status da conexão na interface
- A documentação do Supabase