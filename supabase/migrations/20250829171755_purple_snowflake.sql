```sql
-- Remove the ambiguous function that takes a boolean 'make_admin' parameter
DROP FUNCTION IF EXISTS public.update_user_role(target_user_id uuid, new_role text, make_admin boolean);

-- Re-create or replace the correct function to ensure it's the only one with this name and signature
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    current_app_metadata jsonb;
BEGIN
    -- Ensure only admin can call this function
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND (raw_app_meta_data->>'is_admin')::boolean = true) THEN
        RAISE EXCEPTION 'Permission denied: Only administrators can update user roles.';
    END IF;

    -- Validate new_role
    IF new_role NOT IN ('admin', 'user') THEN
        RAISE EXCEPTION 'Invalid role. Must be "admin" or "user".';
    END IF;

    -- Get current app_metadata
    SELECT raw_app_meta_data INTO current_app_metadata FROM auth.users WHERE id = target_user_id;

    -- If raw_app_meta_data is null, initialize it as an empty JSONB object
    IF current_app_metadata IS NULL THEN
        current_app_metadata := '{}'::jsonb;
    END IF;

    -- Update is_admin flag in app_metadata
    -- The 'true' argument ensures the key is created if it doesn't exist
    current_app_metadata := jsonb_set(current_app_metadata, '{is_admin}', (new_role = 'admin')::text::jsonb, true);

    -- Update user's app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = current_app_metadata
    WHERE id = target_user_id;
END;
$$;
```