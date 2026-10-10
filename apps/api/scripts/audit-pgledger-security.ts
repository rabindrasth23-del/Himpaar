// Read-only catalog audit of pgledger function security on the MAIN database.
// Only SELECTs from pg_catalog; writes nothing.
import "dotenv/config";
import pg from "pg";

const c = new pg.Client({ connectionString: process.env["DATABASE_MIGRATE_URL"] });
await c.connect();
const { rows } = await c.query(`
  SELECT p.oid::regprocedure::text AS signature,
         p.prosecdef AS security_definer,
         array_to_string(p.proconfig, ', ') AS config,
         pg_get_userbyid(p.proowner) AS owner,
         COALESCE(array_to_string(p.proacl, ' '), '(default: PUBLIC EXECUTE)') AS acl,
         has_function_privilege('himpaar_app', p.oid, 'EXECUTE') AS app_can_exec
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'pgledger'
  ORDER BY p.prosecdef DESC, 1`);
console.table(rows);
const tbl = await c.query(`
  SELECT c.relname, c.relkind,
         has_table_privilege('himpaar_app', c.oid, 'SELECT') AS sel,
         has_table_privilege('himpaar_app', c.oid, 'INSERT') AS ins,
         has_table_privilege('himpaar_app', c.oid, 'UPDATE') AS upd,
         has_table_privilege('himpaar_app', c.oid, 'DELETE') AS del
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'pgledger' AND c.relkind IN ('r','v') ORDER BY 1`);
console.table(tbl.rows);
await c.end();
