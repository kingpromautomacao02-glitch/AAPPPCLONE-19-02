/*
  # Create clients table

  1. New Tables
    - `clients`
      - `id` (text, primary key)
      - `owner_id` (uuid, not null, references users)
      - `name` (text, not null)
      - `email` (text, default empty)
      - `phone` (text, default empty)
      - `category` (text, default empty)
      - `address` (text, default empty)
      - `contact_person` (text, default empty)
      - `requesters` (jsonb, default empty array)
      - `cnpj` (text, default empty)
      - `created_at` (text)
      - `deleted_at` (text, nullable)
  2. Security
    - Enable RLS on `clients` table
    - Users can only access their own clients
    - Users can create clients assigned to themselves
    - Users can update their own clients
    - Users can delete their own clients
  3. Indexes
    - Index on owner_id for fast lookups
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  category text DEFAULT '',
  address text DEFAULT '',
  contact_person text DEFAULT '',
  requesters jsonb DEFAULT '[]'::jsonb,
  cnpj text DEFAULT '',
  created_at text,
  deleted_at text
);

CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
