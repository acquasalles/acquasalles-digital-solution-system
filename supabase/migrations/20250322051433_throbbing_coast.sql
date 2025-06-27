/*
  # Fix admin check functionality

  1. Updates
    - Update is_admin() function to properly check user metadata
    - Add function to check raw user metadata
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  _user_id uuid;
  _is_admin boolean;
BEGIN
  -- Get the user ID from the JWT
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check the user's raw_app_meta_data directly
  SELECT (raw_app_meta_data->>'is_admin')::boolean
  INTO _is_admin
  FROM auth.users
  WHERE id = _user_id;

  RETURN COALESCE(_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;