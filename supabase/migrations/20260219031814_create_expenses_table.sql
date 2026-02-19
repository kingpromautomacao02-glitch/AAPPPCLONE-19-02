/*
  # Create expenses table

  1. New Tables
    - `expenses`
      - `id` (text, primary key)
      - `owner_id` (uuid, not null, references users)
      - `category` (text, default empty)
      - `amount` (numeric, default 0)
      - `date` (text, not null)
      - `description` (text, default empty)
  2. Security
    - Enable RLS on `expenses` table
    - Users can only access their own expenses
  3. Indexes
    - Index on owner_id and date for fast filtered lookups
*/

CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text DEFAULT '',
  amount numeric DEFAULT 0,
  date text NOT NULL,
  description text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON expenses(owner_id, date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
