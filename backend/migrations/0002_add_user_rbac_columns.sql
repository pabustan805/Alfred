-- Migration: Add RBAC columns to Users table
-- Adds role and folder_scope metadata for session-aware RBAC enforcement.
-- Apply with your migration runner after 0001_create_audit_log.sql.

BEGIN;

ALTER TABLE IF EXISTS "Users"
    ADD COLUMN IF NOT EXISTS "role" VARCHAR(16) NOT NULL DEFAULT 'viewer',
    ADD COLUMN IF NOT EXISTS "folder_scope" TEXT[] NULL;

CREATE INDEX IF NOT EXISTS "IDX_Users_Role" ON "Users" ("role");

COMMIT;
