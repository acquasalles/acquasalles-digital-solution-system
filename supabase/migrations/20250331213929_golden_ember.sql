/*
  # Fix authentication session handling and add detailed debugging
  
  1. Changes
    - Add function to check authentication status
    - Update debug function with session details
    - Add session validation to policies
    
  2. Security
    - Maintain existing security model
    - Add session validation
*/

-- Drop existing function before recreating with new return type
DROP FUNCTION IF EXISTS debug_client_access(bigint);

-- Function to check authentication status
CREATE OR REPLACE FUNCTION check_auth_session()
RETURNS TABLE (
  has_valid_session boolean,
  current_user_id uuid,
  role_name text,
  session_claims jsonb
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.role() = 'authenticated' as has_valid_session,
    auth.uid() as current_user_id,
    auth.role() as role_name,
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb as session_claims;
END;
$$ LANGUAGE plpgsql;

-- Recreate debug function with session information
CREATE OR REPLACE FUNCTION debug_client_access(client_id_param bigint)
RETURNS TABLE (
  has_access boolean,
  is_admin_user boolean,
  user_id_value uuid,
  client_exists boolean,
  assignment_exists boolean,
  session_valid boolean,
  role_name text,
  session_claims jsonb
) SECURITY DEFINER AS $$
DECLARE
  _user_id uuid;
  _is_admin boolean;
  _session_valid boolean;
  _role_name text;
  _session_claims jsonb;
BEGIN
  -- Get session information
  SELECT 
    has_valid_session,
    current_user_id,
    role_name,
    session_claims
  INTO 
    _session_valid,
    _user_id,
    _role_name,
    _session_claims
  FROM check_auth_session();
  
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
    ) as assignment_exists,
    -- Session information
    _session_valid as session_valid,
    _role_name as role_name,
    _session_claims as session_claims;
END;
$$ LANGUAGE plpgsql;

-- Update policies to ensure valid session
DROP POLICY IF EXISTS "Admin full access on clientes" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;

CREATE POLICY "Admin full access on clientes"
ON clientes
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' AND is_admin()
);

CREATE POLICY "Users read assigned clients"
ON clientes
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND (NOT is_admin()) 
  AND EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id
    AND client_users.user_id = auth.uid()
  )
);