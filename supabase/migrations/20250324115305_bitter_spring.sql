/*
  # Grant admin access to specific user

  1. Changes
    - Add admin role to user "luciano.ramo76@gmail.com"
    - Update RLS policies to allow admin access to all data
    
  2. Security
    - Enable RLS on all tables that need it
    - Add policies for admin access
*/

-- Function to get user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE auth.users.email = get_user_id_by_email.email;
  RETURN user_id;
END;
$$;

-- Set admin status for the specific user
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := get_user_id_by_email('luciano.ramo76@gmail.com');
  
  IF target_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      CASE 
        WHEN raw_app_meta_data IS NULL THEN 
          jsonb_build_object('is_admin', true)
        ELSE 
          raw_app_meta_data || jsonb_build_object('is_admin', true)
      END
    WHERE id = target_user_id;
  END IF;
END $$;

-- Update RLS policies for clientes table
CREATE POLICY "Admins can read all clients"
ON clientes
FOR SELECT
TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1
      FROM client_users
      WHERE client_users.client_id = clientes.id
      AND client_users.user_id = auth.uid()
    )
  )
);

-- Update RLS policies for client_users table
CREATE POLICY "Admins can read all client assignments"
ON client_users
FOR SELECT
TO authenticated
USING (is_admin() OR user_id = auth.uid());

-- Update RLS policies for area_de_trabalho table
ALTER TABLE area_de_trabalho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all work areas"
ON area_de_trabalho
FOR SELECT
TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1
      FROM client_users
      WHERE client_users.client_id = area_de_trabalho.cliente_id
      AND client_users.user_id = auth.uid()
    )
  )
);

-- Update RLS policies for ponto_de_coleta table
ALTER TABLE ponto_de_coleta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all collection points"
ON ponto_de_coleta
FOR SELECT
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

-- Update RLS policies for medicao table
ALTER TABLE medicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all measurements"
ON medicao
FOR SELECT
TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1
      FROM client_users
      WHERE client_users.client_id = medicao.cliente_id
      AND client_users.user_id = auth.uid()
    )
  )
);

-- Update RLS policies for medicao_items table
ALTER TABLE medicao_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all measurement items"
ON medicao_items
FOR SELECT
TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1
      FROM medicao m
      JOIN client_users cu ON cu.client_id = m.cliente_id
      WHERE m.id = medicao_items.medicao_id
      AND cu.user_id = auth.uid()
    )
  )
);

-- Update RLS policies for medicao_photos table
ALTER TABLE medicao_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all measurement photos"
ON medicao_photos
FOR SELECT
TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1
      FROM medicao_items mi
      JOIN medicao m ON m.id = mi.medicao_id
      JOIN client_users cu ON cu.client_id = m.cliente_id
      WHERE mi.id = medicao_photos.medicao_item_id
      AND cu.user_id = auth.uid()
    )
  )
);

-- Update RLS policies for tipos_medicao table
ALTER TABLE tipos_medicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all measurement types"
ON tipos_medicao
FOR SELECT
TO authenticated
USING (is_admin() OR true);  -- All authenticated users can read measurement types