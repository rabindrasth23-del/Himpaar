// Prisma 7 configuration for Himpaar
// Migrations use DATABASE_MIGRATE_URL (superuser/owner) for schema changes.
// The app uses DATABASE_URL (himpaar_app role) with restricted privileges.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // prisma migrate uses this — superuser for CREATE SCHEMA, CREATE ROLE, etc.
    url: process.env["DATABASE_MIGRATE_URL"] ?? process.env["DATABASE_URL"],
  },
});
