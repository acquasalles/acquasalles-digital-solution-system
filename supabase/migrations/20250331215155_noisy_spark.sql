/*
  # Add service role policies and fix debug function
  
  1. Changes
    - Drop existing debug function before recreating
    - Add service role access policy to all tables
    - Add public read access to tipos_medicao table
    
  2. Security
    - Keep RLS enabled on all tables
    - Allow service role full access to all tables
    - Maintain existing user-level security
*/

-- First drop the existing function to avoid conflicts
DROP FUNCTION IF EXISTS debug_client_access(bigint);

-- Add service role policies to all tables
CREATE POLICY "Service role access on area_de_trabalho"
ON area_de_trabalho
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

CREATE POLICY "Service role access on ponto_de_coleta"
ON ponto_de_coleta
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

CREATE POLICY "Service role access on medicao"
ON medicao
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

CREATE POLICY "Service role access on medicao_items"
ON medicao_items
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

CREATE POLICY "Service role access on medicao_photos"
ON medicao_photos
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

CREATE POLICY "Service role access on tipos_medicao"
ON tipos_medicao
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

-- Add public read access to tipos_medicao
CREATE POLICY "Public read access on tipos_medicao"
ON tipos_medicao
FOR SELECT
TO public
USING (true);

-- Recreate the debug function with all checks
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
  is_public boolean,
  has_service_role_access boolean
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
    _is_public as is_public,
    -- Service role access check
    current_setting('role'::text, true) = 'service_role'::text as has_service_role_access;
END;
$$ LANGUAGE plpgsql;