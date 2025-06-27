/*
  # Update policies for service role and public access
  
  1. Changes
    - Add public access policy for clientes table
    - Simplify service role access check
    - Update debug function to check public access
    
  2. Security
    - Keep RLS enabled
    - Allow public read access to clientes table
    - Maintain service role access
    - Keep user-level security for web app modifications
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
  raw_jwt text,
  is_service_role boolean,
  is_public boolean
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(auth.role() = 'authenticated' OR current_setting('role', true) = 'service_role', false) as session_valid,
    auth.uid() as user_id,
    auth.role() as auth_role,
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb as auth_claims,
    NULLIF(current_setting('request.jwt.raw', true), '') as raw_jwt,
    current_setting('role', true) = 'service_role' as is_service_role,
    auth.role() = 'anon' as is_public;
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
  uid_direct uuid,
  is_service_role boolean,
  is_public boolean
) SECURITY DEFINER AS $$
DECLARE
  _user_id uuid;
  _is_admin boolean;
  _session_valid boolean;
  _role_name text;
  _session_claims jsonb;
  _raw_jwt text;
  _is_service_role boolean;
  _is_public boolean;
BEGIN
  -- Get session information with explicit checks
  SELECT 
    s.session_valid,
    s.user_id,
    s.auth_role,
    s.auth_claims,
    s.raw_jwt,
    s.is_service_role,
    s.is_public
  INTO 
    _session_valid,
    _user_id,
    _role_name,
    _session_claims,
    _raw_jwt,
    _is_service_role,
    _is_public
  FROM check_auth_session() s;
  
  -- Get admin status
  _is_admin := is_admin();
  
  RETURN QUERY
  SELECT 
    -- Final access result
    _is_service_role OR _is_public OR COALESCE(_is_admin, false) OR EXISTS (
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
    auth.uid() as uid_direct,
    -- Role checks
    _is_service_role as is_service_role,
    _is_public as is_public;
END;
$$ LANGUAGE plpgsql;

-- Update policies to allow public and service role access
DROP POLICY IF EXISTS "Admin full access on clientes" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;
DROP POLICY IF EXISTS "Service role access" ON clientes;
DROP POLICY IF EXISTS "Public read access" ON clientes;

-- Policy for public read access
CREATE POLICY "Public read access"
ON clientes
FOR SELECT
TO public
USING (true);

-- Policy for service role access
CREATE POLICY "Service role access"
ON clientes
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

-- Policy for admin access
CREATE POLICY "Admin full access on clientes"
ON clientes
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND is_admin()
);

-- Policy for regular user access
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