-- Rollback Script 003: Restore role fields
-- Purpose: Restore weight and constraints fields, remove new UI fields
-- Use only if migration 003_remove_role_redundancy.sql needs to be reverted
-- Date: 2024-11-20

-- Log rollback start
INSERT INTO rollback_log (rollback_name, status)
VALUES ('003_restore_role_fields', 'SUCCESS');

-- Remove new UI fields
ALTER TABLE roles
DROP COLUMN priority,
DROP COLUMN color,
DROP COLUMN icon;

-- Restore original fields
ALTER TABLE roles
ADD COLUMN weight INT DEFAULT 0 COMMENT 'Role weight (unused)',
ADD COLUMN constraints JSON NULL COMMENT 'Role constraints (unused)';

-- Drop indexes that were added
DROP INDEX IF EXISTS idx_roles_priority ON roles;
DROP INDEX IF EXISTS idx_roles_color ON roles;

-- Set default values for restored fields
UPDATE roles SET
  weight = 0,
  constraints = NULL;

-- Verify restoration
SELECT
  'Rollback Summary' as info,
  COUNT(*) as total_roles,
  COUNT(CASE WHEN weight = 0 THEN 1 END) as roles_with_default_weight,
  COUNT(CASE WHEN constraints IS NULL THEN 1 END) as roles_with_null_constraints
FROM roles;

-- Log completion
UPDATE rollback_log SET status = 'SUCCESS' WHERE rollback_name = '003_restore_role_fields';

SELECT 'Rollback 003: Role fields restored successfully' as message;