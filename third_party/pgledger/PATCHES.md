# Patches to pgledger

Vendored from commit `d591b7693a89ddcdb527c2e59f4f702983235f69` (Oct 9, 2026).
Upstream: https://github.com/pgr0ss/pgledger
Licence: MIT

## pgsql-ulid dependency

Vendored from commit `5382a491ac1f00d7cd2bcc9981b951177835bdcd`.
Upstream: https://github.com/scoville/pgsql-ulid
Licence: BSD-3-Clause

## 001-security-definer.patch

Applied in the Prisma migration SQL (not in the vendored source file).

**Changed functions:** `pgledger_create_account`, `pgledger_create_transfer`,
`pgledger_create_transfers` (both overloads — VARIADIC and array).

**Change:** Added `SECURITY DEFINER SET search_path = pgledger, pg_catalog, pg_temp`
to the 4 API entry-point functions.

**Reason:** The app role (`himpaar_app`) has only `EXECUTE` on pgledger functions
and `SELECT` on pgledger tables. Without `SECURITY DEFINER`, the functions cannot
`INSERT`/`UPDATE` the tables they manage. The fixed `search_path` prevents
search_path injection attacks.

**Helpers unchanged:** `pgledger_generate_id`, `pgledger_uuidv7`,
`pgledger_uuidv7_microsecond`, `pgledger_uuidv7_exists`,
`pgledger_check_account_balance_constraints` remain `SECURITY INVOKER` (default).
They inherit the caller's search_path and effective user when called from within
a `SECURITY DEFINER` function.

**Additional privilege hardening:**
```sql
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgledger FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_account(...) TO himpaar_app;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_transfer(...) TO himpaar_app;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_transfers(...) TO himpaar_app;
GRANT EXECUTE ON FUNCTION pgledger.pgledger_create_transfers(VARIADIC ...) TO himpaar_app;
```

Upstream issue: none filed (pgledger assumes callers have full privileges).
