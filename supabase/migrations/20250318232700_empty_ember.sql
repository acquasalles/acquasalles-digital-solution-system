/*
  # Add admin role management functionality

  1. New Functions
    - `set_admin_status`: Function to set a user's admin status
    - `get_admin_users`: Function to list all admin users

  2. Security
    - Only existing admin users can grant/revoke admin status
    - Functions are security definer to ensure proper access control
*/

-- Function to set admin status for a user
CREATE OR REPLACE FUNCTION public.set_admin_status(
  target_user_id uuid,
  is_admin_status boolean
)
RETURNS void AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can modify admin status';
  END IF;

  -- Update the user's metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN is_admin_status THEN 
        raw_app_meta_data || '{"is_admin": true}'::jsonb
      ELSE 
        raw_app_meta_data - 'is_admin'
    END
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all admin users
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  is_admin boolean
) AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view admin users';
  END IF;

  RETURN QUERY
  SELECT 
    id as user_id,
    email,
    COALESCE((raw_app_meta_data->>'is_admin')::boolean, false) as is_admin
  FROM auth.users
  WHERE raw_app_meta_data->>'is_admin' = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;