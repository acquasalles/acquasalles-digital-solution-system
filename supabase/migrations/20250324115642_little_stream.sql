/*
  # Fix admin access to all clients

  1. Changes
    - Drop and recreate RLS policies with proper admin access
    - Ensure admin users can see all clients regardless of assignments
    - Maintain regular user access to assigned clients only
    
  2. Security
    - Keep RLS enabled
    - Maintain data isolation for non-admin users
*/

-- First verify and create the is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> 'is_admin')::boolean,
      false
    );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;
DROP POLICY IF EXISTS "Admin users can create client assignments" ON client_users;
DROP POLICY IF EXISTS "Admin users can delete client assignments" ON client_users;
DROP POLICY IF EXISTS "Users can read own client assignments or admins can read all" ON client_users;

-- Recreate policies for clientes
CREATE POLICY "Admin full access"
ON clientes
FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users read assigned clients"
ON clientes
FOR SELECT
TO authenticated
USING (
  NOT is_admin() AND EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id
    AND client_users.user_id = auth.uid()
  )
);

-- Recreate policies for client_users
CREATE POLICY "Admin full access on client_users"
ON client_users
FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users read own assignments"
ON client_users
FOR SELECT
TO authenticated
USING (
  NOT is_admin() AND user_id = auth.uid()
);

-- Ensure the specific user has admin privileges
DO $$
BEGIN
  -- Update both metadata fields to ensure admin status
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object('is_admin', true),
      raw_user_meta_data = jsonb_build_object('is_admin', true)
  WHERE email = 'luciano.ramo76@gmail.com';
END $$;