/*
  # Fix service role access and public read policies
  
  1. Changes
    - Add public read access policy for clientes table
    - Add service role access policy for all tables
    - Ensure proper access for authenticated users
    
  2. Security
    - Maintain RLS enabled
    - Allow public read access where needed
    - Grant full access to service role
*/

-- Drop existing policies for clientes table
DROP POLICY IF EXISTS "Public read access" ON clientes;
DROP POLICY IF EXISTS "Service role access" ON clientes;
DROP POLICY IF EXISTS "Admin full access on clientes" ON clientes;
DROP POLICY IF EXISTS "Users read assigned clients" ON clientes;

-- Recreate policies for clientes table
CREATE POLICY "Public read access"
ON clientes
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role access"
ON clientes
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

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
  NOT is_admin() AND EXISTS (
    SELECT 1
    FROM client_users
    WHERE client_users.client_id = clientes.id
    AND client_users.user_id = auth.uid()
  )
);

-- Drop existing service role policies before recreating
DROP POLICY IF EXISTS "Service role access on area_de_trabalho" ON area_de_trabalho;
DROP POLICY IF EXISTS "Service role access on ponto_de_coleta" ON ponto_de_coleta;
DROP POLICY IF EXISTS "Service role access on medicao" ON medicao;
DROP POLICY IF EXISTS "Service role access on medicao_items" ON medicao_items;
DROP POLICY IF EXISTS "Service role access on tipos_medicao" ON tipos_medicao;

-- Add service role access to all related tables
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

CREATE POLICY "Service role access on tipos_medicao"
ON tipos_medicao
FOR ALL
USING (current_setting('role'::text, true) = 'service_role'::text);

-- Drop existing public read policy for tipos_medicao
DROP POLICY IF EXISTS "Public read access on tipos_medicao" ON tipos_medicao;

-- Add public read access to tipos_medicao
CREATE POLICY "Public read access on tipos_medicao"
ON tipos_medicao
FOR SELECT
TO public
USING (true);