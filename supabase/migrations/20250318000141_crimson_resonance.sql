/*
  # Add admin functionality and update policies

  1. Security Updates
    - Add policies for admin users to access all clients
    - Update existing policies to allow admin access
    - Add admin check function for reusability
*/

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    coalesce(
      current_setting('request.jwt.claims', true)::json->>'is_admin',
      'false'
    )::boolean
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the policy for reading clients to include admin access
DROP POLICY IF EXISTS "Users can read assigned clients" ON clientes;
CREATE POLICY "Users can read assigned clients or admins can read all"
  ON clientes
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = clientes.id
      AND client_users.user_id = auth.uid()
    )
  );

-- Update client_users policies to allow admin access
DROP POLICY IF EXISTS "Users can read own client assignments" ON client_users;
CREATE POLICY "Users can read own client assignments or admins can read all"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admin users can create client assignments" ON client_users;
CREATE POLICY "Admin users can create client assignments"
  ON client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin users can delete client assignments" ON client_users;
CREATE POLICY "Admin users can delete client assignments"
  ON client_users
  FOR DELETE
  TO authenticated
  USING (is_admin());