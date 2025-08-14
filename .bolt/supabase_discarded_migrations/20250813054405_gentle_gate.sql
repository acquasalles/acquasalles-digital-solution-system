/*
  # Fix get_users_with_roles function type mismatch

  1. Function Fix
    - Cast auth.users.email to text type to match return signature
    - Resolve "character varying(255) does not match expected type text" error
  
  2. Changes
    - Update get_users_with_roles function with proper type casting
*/

-- Fix the get_users_with_roles function to properly cast email column
create or replace function get_users_with_roles()
returns table (
  id uuid,
  email text,
  is_admin boolean
) language sql security definer as $$
  select 
    au.id,
    au.email::text,
    coalesce(u.is_admin, false) as is_admin
  from auth.users au
  left join users u on u.id = au.id
$$;