-- Migration: Create AuditLog table
-- This migration bootstraps the simplest audit trail for Alfred.
-- Apply with your preferred migration runner or `psql -f` once the backend exists.

BEGIN;

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "Id" SERIAL PRIMARY KEY,
    "EntityName" VARCHAR(128) NOT NULL,
    "Action" VARCHAR(64) NOT NULL,
    "Timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UserId" UUID NULL,
    "Details" JSONB NULL
);

CREATE INDEX IF NOT EXISTS "IDX_AuditLog_EntityName" ON "AuditLog" ("EntityName");
CREATE INDEX IF NOT EXISTS "IDX_AuditLog_Timestamp" ON "AuditLog" ("Timestamp");

COMMIT;
