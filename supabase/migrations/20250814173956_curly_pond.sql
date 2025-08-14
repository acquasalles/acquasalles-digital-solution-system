/*
  # Fix area_de_trabalho DELETE policy

  1. Security
    - Add DELETE policy for area_de_trabalho table
    - Allow admins and authorized users to delete work areas
    - Use proper Supabase auth functions

  2. Changes
    - Create DELETE policy using auth.uid() instead of uid()
    - Allow users who are admins OR assigned to the client
    - Ensure UPDATE policy exists for consistency
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
      AND client_users.user_id = auth.uid()
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
          AND client_users.user_id = auth.uid()
        )
      )
      WITH CHECK (
        is_admin() OR 
        EXISTS (
          SELECT 1 FROM client_users 
          WHERE client_users.client_id = area_de_trabalho.cliente_id 
          AND client_users.user_id = auth.uid()
        )
      );
  END IF;
END $$;