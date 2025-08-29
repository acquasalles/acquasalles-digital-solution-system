/*
  # User Management Functions

  This migration creates the necessary functions for user and role management in the application.

  ## New Functions
  1. `get_users_with_roles()` - Returns all users with their admin status
  2. `update_user_role(target_user_id, new_role)` - Updates a user's admin role
  3. `is_admin()` - Checks if the current user is an admin

  ## Security
  - Functions use SECURITY DEFINER to access auth.users table
  - Appropriate permissions granted to authenticated users
  - Admin checks implemented where necessary
*/

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
        false
    );
END;
$$;

-- Function to get all users with their roles
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
    id uuid,
    email text,
    is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins to call this function
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email::text,
        COALESCE((u.raw_app_meta_data->>'is_admin')::boolean, false) AS is_admin
    FROM
        auth.users u
    WHERE
        u.email IS NOT NULL
    ORDER BY
        u.email;
END;
$$;

-- Function to update a user's admin role
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id uuid,
    new_role boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_metadata jsonb;
BEGIN
    -- Only allow admins to call this function
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Don't allow users to change their own role
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot modify your own role.';
    END IF;

    -- Get current metadata
    SELECT raw_app_meta_data INTO current_metadata
    FROM auth.users
    WHERE id = target_user_id;

    -- Update the metadata with the new role
    IF current_metadata IS NULL THEN
        current_metadata := jsonb_build_object('is_admin', new_role);
    ELSE
        current_metadata := current_metadata || jsonb_build_object('is_admin', new_role);
    END IF;

    -- Update the user's metadata
    UPDATE auth.users
    SET raw_app_meta_data = current_metadata
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, boolean) TO authenticated;