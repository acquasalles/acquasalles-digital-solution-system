/*
  # Improve authentication checking and debugging
  
  1. Changes
    - Add more robust session validation
    - Update debug function to provide detailed auth info
    - Ensure proper type handling in policies
    
  2. Security
    - Maintain RLS security model
    - Add explicit auth checks
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS debug_client_access(bigint);
DROP FUNCTION IF EXISTS check_auth_session();

-- Enhanced session check function
CREATE OR REPLACE FUNCTION check_auth_session()
RETURNS TABLE (
  session_valid boolean,
  user_id uuid,
  auth_role text,
  auth_claims jsonb,
  raw_jwt text
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.role() IS NOT NULL AND auth.role() = 'authenticated' as session_valid,
    auth.uid() as user_id,
    auth.role() as auth_role,
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb as auth_claims,
    NULLIF(current_setting('request.jwt.raw', true), '') as raw_jwt;
END;
$$ LANGUAGE plpgsql;

-- Enhanced debug function
CREATE OR REPLACE FUNCTION debug_client_access(client_id_param bigint)
RETURNS TABLE (
  has_access boolean,
  is_admin_user boolean,
  user_id_value uuid,
  client_exists boolean,
  assignment_exists boolean,
  session_valid boolean,
  role_name text,
  session_claims jsonb,
  raw_jwt text,
  auth_role_direct text,
  uid_direct uuid
) SECURITY DEFINER AS $$
DECLARE
  _user_id uuid;
  _is_admin boolean;
  _session_valid boolean;
  _role_name text;
  _session_claims jsonb;
  _raw_jwt text;
BEGIN
  -- Get session information with explicit checks
  SELECT 
    s.session_valid,
    s.user_id,
    s.auth_role,
    s.auth_claims,
    s.raw_jwt
  INTO 
    _session_valid,
    _user_id,
    _role_name,
    _session_claims,
    _raw_jwt
  FROM check_auth_session() s;
  
  -- Get admin status
  _is_admin := is_admin();
  
  RETURN QUERY
  SELECT 
    -- Final access result
    COALESCE(_is_admin, false) OR EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = client_id_param 
      AND client_users.user_id = COALESCE(_user_id, auth.uid())
    ) as has_access,
    -- Individual checks
    COALESCE(_is_admin, false) as is_admin_user,
    COALESCE(_user_id, auth.uid()) as user_id_value,
    EXISTS (SELECT 1 FROM clientes WHERE id = client_id_param) as client_exists,
    EXISTS (
      SELECT 1 
      FROM client_users 
      WHERE client_users.client_id = client_id_param 
      AND client_users.user_id = COALESCE(_user_id, auth.uid())
    ) as assignment_exists,
    -- Session information
    COALESCE(_session_valid, false) as session_valid,
    _role_name as role_name,
    _session_claims as session_claims,
    _raw_jwt as raw_jwt,
    -- Direct auth checks
    auth.role() as auth_role_direct,
    auth.uid() as uid_direct;
END;
$$ LANGUAGE plpgsql;

-- Update policies with explicit auth checks
DROP POLICY IF EXISTS "Admin full access on clientes" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;

CREATE POLICY "Admin full access on clientes"
ON clientes
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND is_admin()
);

CREATE POLICY "Users read assigned clients"
ON clientes
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (NOT is_admin())
  AND EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id
    AND client_users.user_id = auth.uid()
  )
);