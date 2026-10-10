-- Create the restricted app role used by the running application.
-- The superuser (postgres) owns schemas and runs migrations.
-- himpaar_app gets only the privileges it needs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'himpaar_app') THEN
    CREATE ROLE himpaar_app LOGIN PASSWORD 'himpaar_app';
  END IF;
END $$;

-- App role can connect and use the public schema
GRANT CONNECT ON DATABASE himpaar TO himpaar_app;
GRANT USAGE ON SCHEMA public TO himpaar_app;

-- Default privileges: when postgres creates tables, himpaar_app can SELECT/INSERT/UPDATE/DELETE
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO himpaar_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO himpaar_app;
