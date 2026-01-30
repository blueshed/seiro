-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  origin TEXT NOT NULL,
  dest TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  carrier_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON shipments(user_id);
