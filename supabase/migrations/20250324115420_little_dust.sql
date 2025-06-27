/*
  # Fix admin access policies

  1. Changes
    - Drop and recreate RLS policies to ensure proper admin access
    - Simplify admin checks in policies
    - Add explicit admin policies for all tables
    
  2. Security
    - Maintain RLS enabled on all tables
    - Ensure admin users have full access
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can read all clients" ON clientes;
DROP POLICY IF EXISTS "Users can read assigned clients or admins can read all" ON clientes;

-- Create new simplified policies for clientes
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
  EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id
    AND client_users.user_id = auth.uid()
  )
);

-- Ensure admin status is properly set
DO $$
BEGIN
  -- Update the user's admin status
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN 
        jsonb_build_object('is_admin', true)
      ELSE 
        raw_app_meta_data || jsonb_build_object('is_admin', true)
    END,
    raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        jsonb_build_object('is_admin', true)
      ELSE 
        raw_user_meta_data || jsonb_build_object('is_admin', true)
    END
  WHERE email = 'luciano.ramo76@gmail.com';

  -- Also set it in both locations to ensure it's picked up
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || 
    jsonb_build_object(
      'role', 'admin',
      'is_admin', true
    )
  WHERE email = 'luciano.ramo76@gmail.com';
END $$;