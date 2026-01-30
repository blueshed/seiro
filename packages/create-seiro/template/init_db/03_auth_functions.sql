-- Auth functions

CREATE OR REPLACE FUNCTION cmd_auth_register(data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
BEGIN
  INSERT INTO users (email, password)
  VALUES (
    data->>'email',
    crypt(data->>'password', gen_salt('bf'))
  )
  RETURNING id, email, created_at INTO v_user;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'email', v_user.email,
    'created_at', v_user.created_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email already registered';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cmd_auth_login(data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, email, created_at INTO v_user
  FROM users
  WHERE email = data->>'email'
    AND password = crypt(data->>'password', password);

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'email', v_user.email,
    'created_at', v_user.created_at
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION query_auth_profile(p_user_id INT, params JSONB DEFAULT '{}')
RETURNS SETOF JSONB AS $$
  SELECT jsonb_build_object(
    'id', id,
    'email', email,
    'created_at', created_at
  ) FROM users WHERE id = p_user_id;
$$ LANGUAGE sql;
