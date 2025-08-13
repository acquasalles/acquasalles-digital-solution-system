/*
  # Sistema de Gerenciamento de Roles de Usuários

  1. Funções RPC
    - `get_users_with_roles()` - Lista usuários com suas roles e clientes
    - `update_user_role()` - Atualiza role do usuário
    - `get_user_role()` - Obtém role atual do usuário

  2. Permissões
    - Apenas admins podem gerenciar roles
    - Funcionalidade segura e auditável
*/

-- Função para listar usuários com roles e clientes atribuídos
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_role text,
  is_admin boolean,
  client_count bigint,
  clients jsonb
) SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email as user_email,
    COALESCE(au.raw_app_meta_data->>'role', 'user') as user_role,
    COALESCE((au.raw_app_meta_data->>'is_admin')::boolean, false) as is_admin,
    COUNT(DISTINCT cu.client_id) as client_count,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', c.id,
          'name', c.razao_social,
          'city', c.cidade
        )
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'::jsonb
    ) as clients
  FROM auth.users au
  LEFT JOIN client_users cu ON cu.user_id = au.id
  LEFT JOIN clientes c ON c.id = cu.client_id
  WHERE au.email IS NOT NULL
  GROUP BY au.id, au.email, au.raw_app_meta_data
  ORDER BY au.email;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar role do usuário
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text, make_admin boolean DEFAULT false)
RETURNS boolean SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  target_user_exists boolean;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Verificar se o usuário alvo existe
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO target_user_exists;
  IF NOT target_user_exists THEN
    RAISE EXCEPTION 'Target user does not exist.';
  END IF;

  -- Validar role
  IF new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role. Must be "admin" or "user".';
  END IF;

  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  -- Impedir que o usuário altere sua própria role
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot modify your own role.';
  END IF;

  -- Atualizar metadata do usuário
  UPDATE auth.users 
  SET 
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', new_role,
      'is_admin', make_admin,
      'updated_at', now(),
      'updated_by', current_user_id
    )
  WHERE id = target_user_id;

  -- Log da alteração (opcional - pode ser implementado em uma tabela de auditoria)
  RAISE NOTICE 'User role updated: user_id=%, new_role=%, is_admin=%, updated_by=%', 
    target_user_id, new_role, make_admin, current_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para obter role de um usuário específico
CREATE OR REPLACE FUNCTION get_user_role(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_role text,
  is_admin boolean
) SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se não especificado, usar usuário atual
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;

  -- Se não for admin e estiver consultando outro usuário, negar acesso
  IF target_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Can only view own role or admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email as user_email,
    COALESCE(au.raw_app_meta_data->>'role', 'user') as user_role,
    COALESCE((au.raw_app_meta_data->>'is_admin')::boolean, false) as is_admin
  FROM auth.users au
  WHERE au.id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para funções
GRANT EXECUTE ON FUNCTION get_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;