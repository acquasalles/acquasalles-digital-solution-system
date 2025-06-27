/*
  # Fix admin check function

  1. Updates
    - Update is_admin() function to check both camelCase and snake_case variants
    - Add check for raw_app_meta_data in addition to JWT claims
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  _raw_app_meta_data jsonb;
  _jwt_claims jsonb;
BEGIN
  -- Get the JWT claims
  _jwt_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  
  -- Get user metadata from JWT
  _raw_app_meta_data := COALESCE(_jwt_claims->'app_metadata', '{}'::jsonb);

  RETURN (
    -- Check both camelCase and snake_case variants in app_metadata
    COALESCE(_raw_app_meta_data->>'isAdmin', 'false')::boolean OR
    COALESCE(_raw_app_meta_data->>'is_admin', 'false')::boolean
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;