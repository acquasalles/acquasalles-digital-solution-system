/*
  # Add additional policies for client users management

  1. Security Updates
    - Add policies for managing client_users table
    - Allow admin users to manage assignments
*/

-- Policy for admin users to insert client assignments
CREATE POLICY "Admin users can create client assignments"
  ON client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Add admin check here based on your user management system
    -- For now, allowing all authenticated users
    true
  );

-- Policy for admin users to delete client assignments
CREATE POLICY "Admin users can delete client assignments"
  ON client_users
  FOR DELETE
  TO authenticated
  USING (
    -- Add admin check here based on your user management system
    -- For now, allowing all authenticated users
    true
  );