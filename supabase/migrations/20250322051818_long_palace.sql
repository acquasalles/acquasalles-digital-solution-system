/*
  # Add secure user list function

  1. New Functions
    - `get_users_list`: Function to safely get user list for admin users
    
  2. Security
    - Only admin users can access the function
    - Returns minimal user data (id, email)
*/

CREATE OR REPLACE FUNCTION public.get_users_list()
RETURNS TABLE (
  id uuid,
  email text
) SECURITY DEFINER AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u
  ORDER BY u.email;
END;
$$ LANGUAGE plpgsql;