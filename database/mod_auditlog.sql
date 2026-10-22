-- Run this for existing database (before audit log functionality added)
-- to add compatibility with audit log!!
-- Note: ! Not needed if creating new database using current schema.sql !

ALTER TABLE AuditLogs
    ADD COLUMN resource_type VARCHAR(20) NULL AFTER action,
    ADD COLUMN resource_id INT NULL AFTER resource_type,
    ADD KEY idx_audit_logs_resource (resource_type, resource_id);
    