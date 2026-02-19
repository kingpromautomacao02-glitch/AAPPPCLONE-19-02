/*
  # Create services table

  1. New Tables
    - `services`
      - `id` (text, primary key)
      - `owner_id` (uuid, not null, references users)
      - `client_id` (text, references clients)
      - `date` (text, not null)
      - `cost` (numeric, default 0)
      - `pickup_addresses` (jsonb, default empty array)
      - `delivery_addresses` (jsonb, default empty array)
      - `driver_fee` (numeric, default 0)
      - `requester_name` (text, default empty)
      - `payment_method` (text, default empty)
      - `paid` (boolean, default false)
      - `status` (text, default empty)
      - `waiting_time` (numeric, default 0)
      - `extra_fee` (numeric, default 0)
      - `manual_order_id` (text, default empty)
      - `total_distance` (numeric, default 0)
      - `deleted_at` (text, nullable)
  2. Security
    - Enable RLS on `services` table
    - Users can only access their own services
  3. Indexes
    - Index on owner_id and date for fast filtered lookups
*/

CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id text,
  date text NOT NULL,
  cost numeric DEFAULT 0,
  pickup_addresses jsonb DEFAULT '[]'::jsonb,
  delivery_addresses jsonb DEFAULT '[]'::jsonb,
  driver_fee numeric DEFAULT 0,
  requester_name text DEFAULT '',
  payment_method text DEFAULT '',
  paid boolean DEFAULT false,
  status text DEFAULT '',
  waiting_time numeric DEFAULT 0,
  extra_fee numeric DEFAULT 0,
  manual_order_id text DEFAULT '',
  total_distance numeric DEFAULT 0,
  deleted_at text
);

CREATE INDEX IF NOT EXISTS idx_services_owner_id ON services(owner_id);
CREATE INDEX IF NOT EXISTS idx_services_date ON services(date DESC);
CREATE INDEX IF NOT EXISTS idx_services_owner_date ON services(owner_id, date DESC);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own services"
  ON services FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
