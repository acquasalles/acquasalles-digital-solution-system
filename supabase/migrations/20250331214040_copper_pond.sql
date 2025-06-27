/*
  # Fix ambiguous column reference in debug function
  
  1. Changes
    - Update check_auth_session function to use aliased columns
    - Update debug_client_access function to properly reference columns
    
  2. Security
    - Maintain existing security model
    - Keep all security checks in place
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS debug_client_access(bigint);
DROP FUNCTION IF EXISTS check_auth_session();

-- Function to check authentication status with aliased columns
CREATE OR REPLACE FUNCTION check_auth_session()
RETURNS TABLE (
  session_valid boolean,
  user_id uuid,
  auth_role text,
  auth_claims jsonb
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.role() = 'authenticated' as session_valid,
    auth.uid() as user_id,
    auth.role() as auth_role,
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb as auth_claims;
END;
$$ LANGUAGE plpgsql;

-- Recreate debug function with unambiguous column references
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
    s.session_valid,
    s.user_id,
    s.auth_role,
    s.auth_claims
  INTO 
    _session_valid,
    _user_id,
    _role_name,
    _session_claims
  FROM check_auth_session() s;
  
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