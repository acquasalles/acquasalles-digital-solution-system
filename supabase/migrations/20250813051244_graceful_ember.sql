/*
  # Melhorar políticas RLS para client_users
  
  1. Políticas
    - Garantir que usuários regulares só vejam clientes atribuídos
    - Melhorar performance das consultas
    - Adicionar logs para debug
    
  2. Segurança
    - Verificar se usuário tem acesso ao cliente
    - Políticas separadas para admin e usuários regulares
*/

-- Melhorar a política de leitura para usuários regulares
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;

CREATE POLICY "Users read assigned clients" ON clientes
  FOR SELECT
  TO authenticated
  USING (
    -- Admins podem ver todos os clientes
    is_admin() OR 
    -- Usuários regulares só veem clientes atribuídos
    (
      NOT is_admin() AND 
      EXISTS (
        SELECT 1 
        FROM client_users 
        WHERE client_users.client_id = clientes.id 
        AND client_users.user_id = auth.uid()
      )
    )
  );

-- Garantir que a política de leitura de client_users está otimizada
DROP POLICY IF EXISTS "Users read own assignments" ON client_users;

CREATE POLICY "Users read own assignments" ON client_users
  FOR SELECT
  TO authenticated
  USING (
    -- Admins podem ver todas as atribuições
    is_admin() OR 
    -- Usuários regulares só veem suas próprias atribuições
    (
      NOT is_admin() AND 
      user_id = auth.uid()
    )
  );

-- Adicionar índice para melhorar performance das consultas de client_users
CREATE INDEX IF NOT EXISTS idx_client_users_user_id_client_id 
ON client_users(user_id, client_id);

-- Adicionar índice para melhorar performance das consultas de clientes
CREATE INDEX IF NOT EXISTS idx_clientes_id_razao_social 
ON clientes(id, razao_social);