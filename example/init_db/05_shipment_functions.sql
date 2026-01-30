-- Shipment commands

CREATE OR REPLACE FUNCTION cmd_shipment_create(p_user_id INT, data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_id TEXT := substr(md5(random()::text), 1, 8);
  v_result JSONB;
BEGIN
  INSERT INTO shipments (id, user_id, origin, dest)
  VALUES (v_id, p_user_id, data->>'origin', data->>'dest')
  RETURNING jsonb_build_object(
    'id', id,
    'userId', user_id,
    'origin', origin,
    'dest', dest,
    'status', status,
    'carrierId', carrier_id
  ) INTO v_result;

  PERFORM pg_notify('shipment_created', v_result::text);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cmd_shipment_claim(p_user_id INT, data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE shipments
  SET status = 'claimed', carrier_id = data->>'carrierId', updated_at = now()
  WHERE id = data->>'id' AND status = 'pending'
  RETURNING jsonb_build_object(
    'id', id,
    'userId', user_id,
    'origin', origin,
    'dest', dest,
    'status', status,
    'carrierId', carrier_id
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Shipment not found or already claimed';
  END IF;

  PERFORM pg_notify('shipment_claimed', v_result::text);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cmd_shipment_deliver(p_user_id INT, data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE shipments
  SET status = 'delivered', updated_at = now()
  WHERE id = data->>'id' AND status = 'claimed'
  RETURNING jsonb_build_object(
    'id', id,
    'userId', user_id,
    'origin', origin,
    'dest', dest,
    'status', status,
    'carrierId', carrier_id
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Shipment not found or not claimed';
  END IF;

  PERFORM pg_notify('shipment_delivered', v_result::text);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Shipment queries

CREATE OR REPLACE FUNCTION query_shipments_all(p_user_id INT, params JSONB DEFAULT '{}')
RETURNS SETOF JSONB AS $$
  SELECT jsonb_build_object(
    'id', id,
    'userId', user_id,
    'origin', origin,
    'dest', dest,
    'status', status,
    'carrierId', carrier_id
  ) FROM shipments
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION query_shipments_by_status(p_user_id INT, params JSONB)
RETURNS SETOF JSONB AS $$
  SELECT jsonb_build_object(
    'id', id,
    'userId', user_id,
    'origin', origin,
    'dest', dest,
    'status', status,
    'carrierId', carrier_id
  ) FROM shipments
  WHERE user_id = p_user_id AND status = params->>'status'
  ORDER BY created_at DESC;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION query_shipment_by_id(p_user_id INT, params JSONB)
RETURNS SETOF JSONB AS $$
  SELECT jsonb_build_object(
    'id', id,
    'userId', user_id,
    'origin', origin,
    'dest', dest,
    'status', status,
    'carrierId', carrier_id
  ) FROM shipments
  WHERE user_id = p_user_id AND id = params->>'id';
$$ LANGUAGE sql;
