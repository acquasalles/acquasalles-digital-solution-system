/*
  # Fix client access policies

  1. Changes
    - Drop and recreate RLS policies for clientes table
    - Ensure proper access for both admin and regular users
    - Fix policy conditions to properly handle bigint IDs
    
  2. Security
    - Maintain RLS enabled
    - Keep data isolation for non-admin users
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin full access" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;

-- Create new policies with proper type handling
CREATE POLICY "Admin full access on clientes"
ON clientes
FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users read assigned clients"
ON clientes
FOR SELECT
TO authenticated
USING (
  (NOT is_admin()) AND EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id
    AND client_users.user_id = auth.uid()
  )
);