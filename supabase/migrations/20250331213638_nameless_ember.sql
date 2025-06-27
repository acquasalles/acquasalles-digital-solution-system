/*
  # Debug specific client access issue
  
  1. Changes
    - Add function to check access for specific client
    - Add logging for policy evaluation
    - Ensure proper type handling for bigint IDs
    
  2. Security
    - Maintain existing security model
    - Add diagnostic capabilities
*/

-- Function to check access for specific client
CREATE OR REPLACE FUNCTION debug_client_access(client_id_param bigint)
RETURNS TABLE (
  has_access boolean,
  is_admin_user boolean,
  user_id_value uuid,
  client_exists boolean,
  assignment_exists boolean
) SECURITY DEFINER AS $$
DECLARE
  _user_id uuid;
  _is_admin boolean;
BEGIN
  -- Get current user ID
  _user_id := auth.uid();
  
  -- Get admin status
  _is_admin := is_admin();
  
  RETURN QUERY
  SELECT 
    -- Final access result
    (_is_admin OR EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = client_id_param 
      AND client_users.user_id = _user_id
    )) as has_access,
    -- Individual checks
    _is_admin as is_admin_user,
    _user_id as user_id_value,
    EXISTS (SELECT 1 FROM clientes WHERE id = client_id_param) as client_exists,
    EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = client_id_param 
      AND client_users.user_id = _user_id
    ) as assignment_exists;
END;
$$ LANGUAGE plpgsql;

-- Recreate policies with explicit type casting
DROP POLICY IF EXISTS "Admin full access on clientes" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;

CREATE POLICY "Admin full access on clientes"
ON clientes
FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users read assigned clients"
ON clientes
FOR SELECT
TO authenticated
USING (
  (NOT is_admin()) AND EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id::bigint
    AND client_users.user_id = auth.uid()
  )
);