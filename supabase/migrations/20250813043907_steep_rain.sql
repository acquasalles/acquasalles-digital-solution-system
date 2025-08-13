/*
  # Add RLS policies for ponto_de_coleta table

  1. Security Policies
    - Add INSERT policy for admins and authorized users
    - Add UPDATE policy for admins and authorized users  
    - Add DELETE policy for admins and authorized users
  
  2. Access Control
    - Admins can perform all operations
    - Regular users can only manage points for clients they are assigned to
    - Maintains data security through client_users relationship
*/

-- Add INSERT policy for ponto_de_coleta
CREATE POLICY "Admins and authorized users can insert collection points"
  ON ponto_de_coleta
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR (
      EXISTS (
        SELECT 1 
        FROM client_users 
        WHERE client_users.client_id = ponto_de_coleta.cliente_id 
        AND client_users.user_id = auth.uid()
      )
    )
  );

-- Add UPDATE policy for ponto_de_coleta  
CREATE POLICY "Admins and authorized users can update collection points"
  ON ponto_de_coleta
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR (
      EXISTS (
        SELECT 1 
        FROM client_users 
        WHERE client_users.client_id = ponto_de_coleta.cliente_id 
        AND client_users.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_admin() OR (
      EXISTS (
        SELECT 1 
        FROM client_users 
        WHERE client_users.client_id = ponto_de_coleta.cliente_id 
        AND client_users.user_id = auth.uid()
      )
    )
  );

-- Add DELETE policy for ponto_de_coleta
CREATE POLICY "Admins and authorized users can delete collection points"
  ON ponto_de_coleta
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR (
      EXISTS (
        SELECT 1 
        FROM client_users 
        WHERE client_users.client_id = ponto_de_coleta.cliente_id 
        AND client_users.user_id = auth.uid()
      )
    )
  );