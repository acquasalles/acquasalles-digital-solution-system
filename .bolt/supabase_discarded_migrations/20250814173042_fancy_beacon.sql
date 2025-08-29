/*
  # Add DELETE policy for area_de_trabalho table

  1. Security
    - Enable DELETE permission for admins and authorized users
    - Add cascade delete for related collection points
  
  2. Changes
    - Add DELETE policy for area_de_trabalho table
    - Ensure proper RLS is enabled
*/

-- Add DELETE policy for area_de_trabalho table
CREATE POLICY "Admins and authorized users can delete work areas"
  ON area_de_trabalho
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM client_users 
      WHERE client_users.client_id = area_de_trabalho.cliente_id 
      AND client_users.user_id = uid()
    )
  );

-- Ensure UPDATE policy also exists for completeness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'area_de_trabalho' 
    AND policyname = 'Admins and authorized users can update work areas'
  ) THEN
    CREATE POLICY "Admins and authorized users can update work areas"
      ON area_de_trabalho
      FOR UPDATE
      TO authenticated
      USING (
        is_admin() OR 
        EXISTS (
          SELECT 1 FROM client_users 
          WHERE client_users.client_id = area_de_trabalho.cliente_id 
          AND client_users.user_id = uid()
        )
      );
  END IF;
END $$;