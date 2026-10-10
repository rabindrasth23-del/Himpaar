-- pgledger setup migration
-- Installs pgledger (MIT) and pgsql-ulid (BSD-3-Clause) in the pgledger schema.
-- See third_party/pgledger/PATCHES.md for details.
-- Pinned commits:
--   pgledger:  d591b7693a89ddcdb527c2e59f4f702983235f69
--   pgsql-ulid: 5382a491ac1f00d7cd2bcc9981b951177835bdcd

-- Use SET LOCAL so settings don't leak to subsequent migrations
SET LOCAL lock_timeout = '5s';

-- ═══════════════════════════════════════════════════════════════════
-- 1. Create pgledger schema
-- ═══════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS pgledger;
SET LOCAL search_path = pgledger, pg_catalog, pg_temp;

-- ═══════════════════════════════════════════════════════════════════
-- 2. pgsql-ulid functions (BSD-3-Clause, scoville/pgsql-ulid)
--    Vendored from third_party/pgsql-ulid/
-- ═══════════════════════════════════════════════════════════════════

-- ulid-to-uuid.sql
CREATE OR REPLACE FUNCTION pgledger.parse_ulid(ulid text) RETURNS bytea AS $$
DECLARE
  bytes bytea = E'\\x00000000 00000000 00000000 00000000';
  v     bytea;
  dec   bytea = '\x
    00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    00 01 02 03 04 05 06 07 08 09 00 00 00 00 00 00
    00 0A 0B 0C 0D 0E 0F 10 11 00 12 13 00 14 15 00
    16 17 18 19 1A 00 1B 1C 1D 1E 1F 00 00 00 00 00
    00 0A 0B 0C 0D 0E 0F 10 11 00 12 13 00 14 15 00
    16 17 18 19 1A 00 1B 1C 1D 1E 1F 00 00 00 00 00
  ';
BEGIN
  IF NOT ulid ~* '^[0-7][0-9ABCDEFGHJKMNPQRSTVWXYZ]{25}$' THEN
    RAISE EXCEPTION 'Invalid ULID: %', ulid;
  END IF;
  v = ulid::bytea;
  bytes = SET_BYTE(bytes, 0, (GET_BYTE(dec, GET_BYTE(v, 0)) << 5) | GET_BYTE(dec, GET_BYTE(v, 1)));
  bytes = SET_BYTE(bytes, 1, (GET_BYTE(dec, GET_BYTE(v, 2)) << 3) | (GET_BYTE(dec, GET_BYTE(v, 3)) >> 2));
  bytes = SET_BYTE(bytes, 2, (GET_BYTE(dec, GET_BYTE(v, 3)) << 6) | (GET_BYTE(dec, GET_BYTE(v, 4)) << 1) | (GET_BYTE(dec, GET_BYTE(v, 5)) >> 4));
  bytes = SET_BYTE(bytes, 3, (GET_BYTE(dec, GET_BYTE(v, 5)) << 4) | (GET_BYTE(dec, GET_BYTE(v, 6)) >> 1));
  bytes = SET_BYTE(bytes, 4, (GET_BYTE(dec, GET_BYTE(v, 6)) << 7) | (GET_BYTE(dec, GET_BYTE(v, 7)) << 2) | (GET_BYTE(dec, GET_BYTE(v, 8)) >> 3));
  bytes = SET_BYTE(bytes, 5, (GET_BYTE(dec, GET_BYTE(v, 8)) << 5) | GET_BYTE(dec, GET_BYTE(v, 9)));
  bytes = SET_BYTE(bytes, 6, (GET_BYTE(dec, GET_BYTE(v, 10)) << 3) | (GET_BYTE(dec, GET_BYTE(v, 11)) >> 2));
  bytes = SET_BYTE(bytes, 7, (GET_BYTE(dec, GET_BYTE(v, 11)) << 6) | (GET_BYTE(dec, GET_BYTE(v, 12)) << 1) | (GET_BYTE(dec, GET_BYTE(v, 13)) >> 4));
  bytes = SET_BYTE(bytes, 8, (GET_BYTE(dec, GET_BYTE(v, 13)) << 4) | (GET_BYTE(dec, GET_BYTE(v, 14)) >> 1));
  bytes = SET_BYTE(bytes, 9, (GET_BYTE(dec, GET_BYTE(v, 14)) << 7) | (GET_BYTE(dec, GET_BYTE(v, 15)) << 2) | (GET_BYTE(dec, GET_BYTE(v, 16)) >> 3));
  bytes = SET_BYTE(bytes, 10, (GET_BYTE(dec, GET_BYTE(v, 16)) << 5) | GET_BYTE(dec, GET_BYTE(v, 17)));
  bytes = SET_BYTE(bytes, 11, (GET_BYTE(dec, GET_BYTE(v, 18)) << 3) | (GET_BYTE(dec, GET_BYTE(v, 19)) >> 2));
  bytes = SET_BYTE(bytes, 12, (GET_BYTE(dec, GET_BYTE(v, 19)) << 6) | (GET_BYTE(dec, GET_BYTE(v, 20)) << 1) | (GET_BYTE(dec, GET_BYTE(v, 21)) >> 4));
  bytes = SET_BYTE(bytes, 13, (GET_BYTE(dec, GET_BYTE(v, 21)) << 4) | (GET_BYTE(dec, GET_BYTE(v, 22)) >> 1));
  bytes = SET_BYTE(bytes, 14, (GET_BYTE(dec, GET_BYTE(v, 22)) << 7) | (GET_BYTE(dec, GET_BYTE(v, 23)) << 2) | (GET_BYTE(dec, GET_BYTE(v, 24)) >> 3));
  bytes = SET_BYTE(bytes, 15, (GET_BYTE(dec, GET_BYTE(v, 24)) << 5) | GET_BYTE(dec, GET_BYTE(v, 25)));
  RETURN bytes;
END
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pgledger.ulid_to_uuid(ulid text) RETURNS uuid AS $$
BEGIN
  RETURN encode(pgledger.parse_ulid(ulid), 'hex')::uuid;
END
$$ LANGUAGE plpgsql IMMUTABLE;

-- uuid-to-ulid.sql
CREATE OR REPLACE FUNCTION pgledger.format_ulid(bytes bytea) RETURNS text AS $$
DECLARE
  encoding   bytea = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  output     text  = '';
BEGIN
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 0) & 224) >> 5));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 0) & 31)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 1) & 248) >> 3));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 1) & 7) << 2) | ((GET_BYTE(bytes, 2) & 192) >> 6)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 2) & 62) >> 1));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 2) & 1) << 4) | ((GET_BYTE(bytes, 3) & 240) >> 4)));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 3) & 15) << 1) | ((GET_BYTE(bytes, 4) & 128) >> 7)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 4) & 124) >> 2));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 4) & 3) << 3) | ((GET_BYTE(bytes, 5) & 224) >> 5)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 5) & 31)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 6) & 248) >> 3));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 6) & 7) << 2) | ((GET_BYTE(bytes, 7) & 192) >> 6)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 7) & 62) >> 1));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 7) & 1) << 4) | ((GET_BYTE(bytes, 8) & 240) >> 4)));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 8) & 15) << 1) | ((GET_BYTE(bytes, 9) & 128) >> 7)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 9) & 124) >> 2));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 9) & 3) << 3) | ((GET_BYTE(bytes, 10) & 224) >> 5)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 10) & 31)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 11) & 248) >> 3));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 11) & 7) << 2) | ((GET_BYTE(bytes, 12) & 192) >> 6)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 12) & 62) >> 1));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 12) & 1) << 4) | ((GET_BYTE(bytes, 13) & 240) >> 4)));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 13) & 15) << 1) | ((GET_BYTE(bytes, 14) & 128) >> 7)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 14) & 124) >> 2));
  output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(bytes, 14) & 3) << 3) | ((GET_BYTE(bytes, 15) & 224) >> 5)));
  output = output || CHR(GET_BYTE(encoding, (GET_BYTE(bytes, 15) & 31)));
  RETURN output;
END
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pgledger.uuid_to_ulid(id uuid) RETURNS text AS $$
BEGIN
    RETURN pgledger.format_ulid(uuid_send(id));
END
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════════
-- 3. pgledger functions and tables (MIT, pgr0ss/pgledger)
--    Vendored from third_party/pgledger/pgledger.sql
--    Functions are schema-qualified to pgledger.
-- ═══════════════════════════════════════════════════════════════════

-- uuidv7 helpers
CREATE FUNCTION pgledger.pgledger_uuidv7_exists() RETURNS BOOL
AS $$
    SELECT EXISTS(SELECT * FROM pg_proc WHERE proname = 'uuidv7');
$$ LANGUAGE sql IMMUTABLE;

CREATE FUNCTION pgledger.pgledger_uuidv7_microsecond() RETURNS UUID
AS $$
    select encode(
        substring(int8send(floor(t_ms)::int8) from 3) ||
        int2send((7<<12)::int2 | ((t_ms-floor(t_ms))*4096)::int2) ||
        substring(uuid_send(gen_random_uuid()) from 9 for 8)
        , 'hex')::uuid
    from (select extract(epoch from clock_timestamp())*1000 as t_ms) s
$$ LANGUAGE sql VOLATILE;

CREATE FUNCTION pgledger.pgledger_uuidv7() RETURNS UUID
AS $$
DECLARE
    result uuid;
BEGIN
    IF pgledger.pgledger_uuidv7_exists() THEN
        EXECUTE 'select uuidv7()' INTO result;
        RETURN result;
    ELSE
        RETURN pgledger.pgledger_uuidv7_microsecond();
    END IF;
end
$$ LANGUAGE plpgsql VOLATILE;

CREATE FUNCTION pgledger.pgledger_generate_id(prefix TEXT) RETURNS TEXT
AS $$
    SELECT prefix || '_' || pgledger.uuid_to_ulid(pgledger.pgledger_uuidv7())
$$ LANGUAGE sql VOLATILE;

-- Tables
CREATE TABLE pgledger.pgledger_accounts (
    id TEXT PRIMARY KEY DEFAULT pgledger.pgledger_generate_id('pgla'),
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    allow_negative_balance BOOLEAN NOT NULL,
    allow_positive_balance BOOLEAN NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE pgledger.pgledger_transfers (
    id TEXT PRIMARY KEY DEFAULT pgledger.pgledger_generate_id('pglt'),
    from_account_id TEXT NOT NULL REFERENCES pgledger.pgledger_accounts (id),
    to_account_id TEXT NOT NULL REFERENCES pgledger.pgledger_accounts (id),
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    CHECK (amount > 0 AND amount < 'Infinity'::NUMERIC AND from_account_id != to_account_id)
);

CREATE INDEX ON pgledger.pgledger_transfers (from_account_id);
CREATE INDEX ON pgledger.pgledger_transfers (to_account_id);
CREATE INDEX ON pgledger.pgledger_transfers (event_at);

CREATE TABLE pgledger.pgledger_entries (
    id TEXT PRIMARY KEY DEFAULT pgledger.pgledger_generate_id('pgle'),
    account_id TEXT NOT NULL REFERENCES pgledger.pgledger_accounts (id),
    transfer_id TEXT NOT NULL REFERENCES pgledger.pgledger_transfers (id),
    amount NUMERIC NOT NULL,
    account_previous_balance NUMERIC NOT NULL,
    account_current_balance NUMERIC NOT NULL,
    account_version BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ON pgledger.pgledger_entries (account_id);
CREATE INDEX ON pgledger.pgledger_entries (transfer_id);

-- Views
CREATE VIEW pgledger.pgledger_accounts_view AS
SELECT id, name, currency, balance, version, allow_negative_balance,
       allow_positive_balance, metadata, created_at, updated_at
FROM pgledger.pgledger_accounts;

CREATE VIEW pgledger.pgledger_transfers_view AS
SELECT id, from_account_id, to_account_id, amount, created_at, event_at, metadata
FROM pgledger.pgledger_transfers;

CREATE VIEW pgledger.pgledger_entries_view AS
SELECT e.id, e.account_id, e.transfer_id, e.amount,
       e.account_previous_balance, e.account_current_balance,
       e.account_version, e.created_at, t.event_at, t.metadata
FROM pgledger.pgledger_entries e
INNER JOIN pgledger.pgledger_transfers t ON e.transfer_id = t.id;

-- API functions
CREATE OR REPLACE FUNCTION pgledger.pgledger_create_account(
    name TEXT,
    currency TEXT,
    allow_negative_balance BOOLEAN DEFAULT TRUE,
    allow_positive_balance BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT NULL
)
RETURNS SETOF pgledger.PGLEDGER_ACCOUNTS_VIEW
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO pgledger.pgledger_accounts (name, currency, allow_negative_balance, allow_positive_balance, metadata, created_at, updated_at)
    VALUES (name, currency, allow_negative_balance, allow_positive_balance, metadata, now(), now())
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pgledger, pg_catalog, pg_temp;

CREATE OR REPLACE FUNCTION pgledger.pgledger_check_account_balance_constraints(account pgledger.PGLEDGER_ACCOUNTS) RETURNS VOID AS $$
BEGIN
    IF NOT account.allow_negative_balance AND (account.balance < 0) THEN
        RAISE EXCEPTION 'Account (id=%, name=%) does not allow negative balance', account.id, account.name;
    END IF;
    IF NOT account.allow_positive_balance AND (account.balance > 0) THEN
        RAISE EXCEPTION 'Account (id=%, name=%) does not allow positive balance', account.id, account.name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Composite type for batch transfers
CREATE TYPE pgledger.TRANSFER_REQUEST AS (
    from_account_id TEXT,
    to_account_id TEXT,
    amount NUMERIC
);

CREATE OR REPLACE FUNCTION pgledger.pgledger_create_transfer(
    from_account_id TEXT,
    to_account_id TEXT,
    amount NUMERIC,
    event_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT NULL
)
RETURNS SETOF pgledger.PGLEDGER_TRANSFERS_VIEW
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM pgledger.pgledger_create_transfers(
        transfer_requests => array[(from_account_id, to_account_id, amount)::pgledger.TRANSFER_REQUEST],
        event_at => event_at,
        metadata => metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pgledger, pg_catalog, pg_temp;

-- Variadic overload
CREATE OR REPLACE FUNCTION pgledger.pgledger_create_transfers(VARIADIC transfer_requests pgledger.TRANSFER_REQUEST[])
RETURNS SETOF pgledger.PGLEDGER_TRANSFERS_VIEW
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM pgledger.pgledger_create_transfers(transfer_requests);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pgledger, pg_catalog, pg_temp;

-- Main implementation
CREATE OR REPLACE FUNCTION pgledger.pgledger_create_transfers(
    transfer_requests pgledger.TRANSFER_REQUEST[],
    event_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT NULL
)
RETURNS SETOF pgledger.PGLEDGER_TRANSFERS_VIEW
AS $$
DECLARE
    transfer_request pgledger.transfer_request;
    transfer_ids TEXT[] := '{}';
    transfer_id TEXT;
    from_account pgledger.pgledger_accounts;
    to_account pgledger.pgledger_accounts;
    v_from_account_id TEXT;
    v_to_account_id TEXT;
    all_account_ids TEXT[] := '{}';
BEGIN
    IF transfer_requests IS NULL THEN
        RAISE EXCEPTION 'Transfer requests must not be null';
    END IF;

    FOREACH transfer_request IN ARRAY transfer_requests LOOP
        all_account_ids := array_append(all_account_ids, transfer_request.from_account_id);
        all_account_ids := array_append(all_account_ids, transfer_request.to_account_id);
    END LOOP;

    SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(all_account_ids) ORDER BY unnest)
    INTO all_account_ids;

    -- Lock all accounts in sorted order to prevent deadlocks
    FOREACH v_from_account_id IN ARRAY all_account_ids LOOP
        PERFORM pgledger.pgledger_accounts.id
        FROM pgledger.pgledger_accounts
        WHERE pgledger.pgledger_accounts.id = v_from_account_id
        FOR UPDATE;
    END LOOP;

    FOREACH transfer_request IN ARRAY transfer_requests LOOP
        IF transfer_request.amount IS NULL
            OR NOT (transfer_request.amount > 0 AND transfer_request.amount < 'Infinity'::NUMERIC) THEN
            RAISE EXCEPTION 'Amount (%) must be a positive finite number', transfer_request.amount;
        END IF;

        IF transfer_request.from_account_id IS NULL OR transfer_request.to_account_id IS NULL THEN
            RAISE EXCEPTION 'Account ids (from=%, to=%) must not be null',
                transfer_request.from_account_id, transfer_request.to_account_id;
        END IF;

        IF transfer_request.from_account_id = transfer_request.to_account_id THEN
            RAISE EXCEPTION 'Cannot transfer to the same account (id=%)', transfer_request.from_account_id;
        END IF;

        UPDATE pgledger.pgledger_accounts
        SET balance = balance - transfer_request.amount,
            version = version + 1,
            updated_at = now()
        WHERE pgledger.pgledger_accounts.id = transfer_request.from_account_id
        RETURNING * INTO from_account;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Account (id=%) does not exist', transfer_request.from_account_id;
        END IF;

        PERFORM pgledger.pgledger_check_account_balance_constraints(from_account);

        UPDATE pgledger.pgledger_accounts
        SET balance = balance + transfer_request.amount,
            version = version + 1,
            updated_at = now()
        WHERE pgledger.pgledger_accounts.id = transfer_request.to_account_id
        RETURNING * INTO to_account;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Account (id=%) does not exist', transfer_request.to_account_id;
        END IF;

        PERFORM pgledger.pgledger_check_account_balance_constraints(to_account);

        IF from_account.currency != to_account.currency THEN
            RAISE EXCEPTION 'Cannot transfer between different currencies (% and %)', from_account.currency, to_account.currency;
        END IF;

        INSERT INTO pgledger.pgledger_transfers (from_account_id, to_account_id, amount, created_at, event_at, metadata)
        VALUES (transfer_request.from_account_id, transfer_request.to_account_id, transfer_request.amount, now(), coalesce(event_at, now()), metadata)
        RETURNING pgledger.pgledger_transfers.id INTO transfer_id;

        transfer_ids := array_append(transfer_ids, transfer_id);

        INSERT INTO pgledger.pgledger_entries (account_id, transfer_id, amount, account_previous_balance, account_current_balance, account_version, created_at)
        VALUES (transfer_request.from_account_id, transfer_id, -transfer_request.amount, from_account.balance + transfer_request.amount, from_account.balance, from_account.version, now());

        INSERT INTO pgledger.pgledger_entries (account_id, transfer_id, amount, account_previous_balance, account_current_balance, account_version, created_at)
        VALUES (transfer_request.to_account_id, transfer_id, transfer_request.amount, to_account.balance - transfer_request.amount, to_account.balance, to_account.version, now());
    END LOOP;

    RETURN QUERY
    SELECT *
    FROM pgledger.pgledger_transfers_view
    WHERE id = ANY(transfer_ids)
    ORDER BY id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pgledger, pg_catalog, pg_temp;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Idempotency: UNIQUE partial index on transfer metadata
--    Prevents the same payment step from being posted twice.
-- ═══════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX idx_pgledger_transfers_payment_step
  ON pgledger.pgledger_transfers ((metadata->>'payment_id'), (metadata->>'step'))
  WHERE metadata ? 'payment_id';

-- ═══════════════════════════════════════════════════════════════════
-- 5. Protection triggers: block UPDATE/DELETE on immutable tables
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION pgledger.reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is blocked — ledger rows are immutable', TG_OP, TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- pgledger_transfers: block UPDATE and DELETE
CREATE TRIGGER trg_pgledger_transfers_no_update
  BEFORE UPDATE ON pgledger.pgledger_transfers
  FOR EACH ROW EXECUTE FUNCTION pgledger.reject_mutation();

CREATE TRIGGER trg_pgledger_transfers_no_delete
  BEFORE DELETE ON pgledger.pgledger_transfers
  FOR EACH ROW EXECUTE FUNCTION pgledger.reject_mutation();

-- pgledger_entries: block UPDATE and DELETE
CREATE TRIGGER trg_pgledger_entries_no_update
  BEFORE UPDATE ON pgledger.pgledger_entries
  FOR EACH ROW EXECUTE FUNCTION pgledger.reject_mutation();

CREATE TRIGGER trg_pgledger_entries_no_delete
  BEFORE DELETE ON pgledger.pgledger_entries
  FOR EACH ROW EXECUTE FUNCTION pgledger.reject_mutation();

-- pgledger_accounts: block DELETE only (UPDATE needed by pgledger functions)
CREATE TRIGGER trg_pgledger_accounts_no_delete
  BEFORE DELETE ON pgledger.pgledger_accounts
  FOR EACH ROW EXECUTE FUNCTION pgledger.reject_mutation();

-- ═══════════════════════════════════════════════════════════════════
-- 6. Role privileges (PATCHES.md 001-security-definer)
-- ═══════════════════════════════════════════════════════════════════

-- Ensure the app role exists (idempotent, matches docker/init-app-role.sql).
-- No password is set here: secrets never live in migrations. The password is
-- set out-of-band (docker/init-app-role.sql locally, ALTER ROLE on Neon).
-- Database name is resolved at runtime so this works on Docker and Neon.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'himpaar_app') THEN
    CREATE ROLE himpaar_app LOGIN;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO himpaar_app', current_database());
END $$;

-- Grant schema usage and SELECT to app role
GRANT USAGE ON SCHEMA pgledger TO himpaar_app;
GRANT SELECT ON ALL TABLES IN SCHEMA pgledger TO himpaar_app;

-- App tables (managed by Prisma in schema public): DML only, no DDL.
-- Insert-only tables are further protected by triggers in a later migration.
GRANT USAGE ON SCHEMA public TO himpaar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO himpaar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO himpaar_app;

-- Revoke ALL function privileges from PUBLIC, then grant only API functions
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgledger FROM PUBLIC;

-- Grant EXECUTE only on the 4 API entry-point functions
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_account(TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB) TO himpaar_app;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_transfer(TEXT, TEXT, NUMERIC, TIMESTAMPTZ, JSONB) TO himpaar_app;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_transfers(pgledger.TRANSFER_REQUEST[]) TO himpaar_app;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_transfers(pgledger.TRANSFER_REQUEST[], TIMESTAMPTZ, JSONB) TO himpaar_app;

-- ═══════════════════════════════════════════════════════════════════
-- 7. Platform-wide ledger accounts (created once)
-- ═══════════════════════════════════════════════════════════════════

SELECT pgledger.pgledger_create_account('platform:usd:external', 'USD', allow_negative_balance => true, allow_positive_balance => false);
SELECT pgledger.pgledger_create_account('platform:usd:fees', 'USD', allow_negative_balance => false, allow_positive_balance => true);
SELECT pgledger.pgledger_create_account('platform:fx:usd', 'USD', allow_negative_balance => false, allow_positive_balance => true);
SELECT pgledger.pgledger_create_account('platform:fx:npr', 'NPR', allow_negative_balance => true, allow_positive_balance => false);
SELECT pgledger.pgledger_create_account('platform:npr:bank', 'NPR', allow_negative_balance => false, allow_positive_balance => true);

-- Reset search_path
SET LOCAL search_path = public;
