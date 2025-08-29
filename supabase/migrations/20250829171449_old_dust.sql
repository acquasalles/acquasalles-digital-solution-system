/*
  # Fix update_user_role function to persist role changes

  1. Updates
    - Recreates the update_user_role function with proper handling of null raw_app_meta_data
    - Ensures is_admin field is created and updated correctly
    - Adds proper error handling and validation

  2. Security
    - Maintains admin-only access restriction
    - Prevents self-modification of roles
    - Uses SECURITY DEFINER for auth.users access
*/

-- Drop and recreate the update_user_role function with proper persistence
DROP FUNCTION IF EXISTS public.update_user_role(uuid, text);

CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_meta jsonb;
    new_is_admin boolean;
BEGIN
    -- Check if current user is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can update user roles';
    END IF;
    
    -- Prevent users from modifying their own role
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Users cannot modify their own role';
    END IF;
    
    -- Validate new_role parameter
    IF new_role NOT IN ('admin', 'user') THEN
        RAISE EXCEPTION 'Invalid role. Must be "admin" or "user".';
    END IF;
    
    -- Convert role string to boolean
    new_is_admin := (new_role = 'admin');
    
    -- Get current raw_app_meta_data for the target user
    SELECT raw_app_meta_data INTO current_meta
    FROM auth.users
    WHERE id = target_user_id;
    
    -- Check if user exists
    IF current_meta IS NULL AND NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Initialize current_meta as empty JSON object if it's null
    IF current_meta IS NULL THEN
        current_meta := '{}'::jsonb;
    END IF;
    
    -- Update the user's raw_app_meta_data with the new is_admin value
    UPDATE auth.users 
    SET 
        raw_app_meta_data = jsonb_set(
            current_meta,
            '{is_admin}',
            to_jsonb(new_is_admin),
            true  -- create the key if it doesn't exist
        ),
        updated_at = now()
    WHERE id = target_user_id;
    
    -- Verify the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update user role';
    END IF;
    
    -- Log the role change for debugging
    RAISE NOTICE 'Successfully updated user % role to %', target_user_id, new_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;

-- Add a comment to the function
COMMENT ON FUNCTION public.update_user_role(uuid, text) IS 
'Updates a user role by modifying the is_admin field in raw_app_meta_data. Only admins can call this function and users cannot modify their own role.';