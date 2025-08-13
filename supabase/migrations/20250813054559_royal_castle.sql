/*
  # Fix get_users_with_roles function type mismatch

  1. Drop existing function that has incorrect return type
  2. Recreate function with proper text casting for email column
  
  This resolves the error: "Returned type character varying(255) does not match expected type text in column 2"
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_users_with_roles();

-- Recreate the function with proper type casting
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  is_admin boolean
) 
LANGUAGE sql 
SECURITY definer 
AS $$
  SELECT 
    au.id,
    au.email::text,
    COALESCE(u.is_admin, false) as is_admin
  FROM auth.users au
  LEFT JOIN users u ON u.id = au.id
$$;