/*
# Add User Role Management Functions

1. Functions
   - `get_users_with_roles()` - Fetch all users with their current roles
   - `update_user_role()` - Update a user's admin status

2. Security
   - Only admins can call these functions
   - Proper error handling and validation
*/

-- Function to get all users with their roles
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  is_admin boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins to call this function
  SELECT 
    CASE 
      WHEN is_admin() THEN (
        SELECT u.id, u.email, COALESCE(u.raw_app_meta_data->>'is_admin', 'false')::boolean as is_admin
        FROM auth.users u
        WHERE u.deleted_at IS NULL
        ORDER BY u.email
      )
      ELSE NULL
    END;
$$;

-- Function to update user role
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_admin boolean;
BEGIN
  -- Check if current user is admin
  SELECT is_admin() INTO current_user_admin;
  
  IF NOT current_user_admin THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;
  
  -- Prevent self-demotion from admin
  IF target_user_id = auth.uid() AND new_role = false THEN
    RAISE EXCEPTION 'Cannot demote yourself from administrator role';
  END IF;
  
  -- Update the user's metadata
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
                         jsonb_build_object('is_admin', new_role)
  WHERE id = target_user_id;
  
  IF FOUND THEN
    RETURN true;
  ELSE
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Grant permissions to authenticated users (function security will handle authorization)
GRANT EXECUTE ON FUNCTION get_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(uuid, boolean) TO authenticated;