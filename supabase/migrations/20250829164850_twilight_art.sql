/*
  # Fix get_users_with_roles function return types

  1. Problem
    - Function declares return type as 'text' for email column
    - But auth.users.email is actually 'character varying(255)'
    - This causes a type mismatch error

  2. Solution
    - Recreate function with correct return types matching auth.users schema
    - Use varchar instead of text for email column
    - Ensure all types match exactly with auth.users table structure

  3. Security
    - Maintains SECURITY DEFINER for proper access to auth.users
    - Keeps proper permissions for authenticated users
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_users_with_roles();

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
    id uuid,
    email character varying(255), -- Match auth.users.email type exactly
    is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email,
        COALESCE((u.raw_app_meta_data->>'is_admin')::boolean, false) AS is_admin
    FROM
        auth.users u
    WHERE
        u.email IS NOT NULL
    ORDER BY
        u.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_users_with_roles() IS 'Returns all users with their admin status. Requires admin privileges to execute.';