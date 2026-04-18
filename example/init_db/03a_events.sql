-- Durable event log. cmd_* functions insert here and pg_notify('events', id::text);
-- a single LISTEN events connection in the server fetches the row and fans out.
CREATE TABLE IF NOT EXISTS events (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  user_id    INT,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type_id ON events (type, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events (user_id, id DESC)
  WHERE user_id IS NOT NULL;

-- Append an event and notify the 'events' channel with the new id.
CREATE OR REPLACE FUNCTION emit_event(p_type TEXT, p_user_id INT, p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO events (type, user_id, payload)
  VALUES (p_type, p_user_id, p_payload)
  RETURNING id INTO v_id;

  PERFORM pg_notify('events', v_id::text);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
