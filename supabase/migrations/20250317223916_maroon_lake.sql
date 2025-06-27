/*
  # Add client users relationship and RLS policies

  1. New Tables
    - `client_users`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `client_id` (bigint, references clientes)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `clientes` and `client_users` tables
    - Add policies for authenticated users to read their assigned clients
    - Add policies for client_users management
*/

-- Enable RLS on existing clientes table
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Create client_users table
CREATE TABLE IF NOT EXISTS client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id bigint REFERENCES clientes NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Enable RLS on client_users table
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their assigned clients
CREATE POLICY "Users can read assigned clients"
  ON clientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = clientes.id
      AND client_users.user_id = auth.uid()
    )
  );

-- Policy for reading own client assignments
CREATE POLICY "Users can read own client assignments"
  ON client_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());