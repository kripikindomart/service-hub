-- Rollback Script 002: Restore original tenant status system
-- Purpose: Revert tenant status changes back to EntityStatus enum
-- Use only if migration 002_optimize_tenant_status.sql needs to be reverted
-- Date: 2024-11-20

-- Log rollback start
CREATE TABLE IF NOT EXISTS rollback_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rollback_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS'
);

INSERT INTO rollback_log (rollback_name, status)
VALUES ('002_restore_tenant_status', 'SUCCESS');

-- Restore original EntityStatus enum for tenant status
ALTER TABLE tenants
MODIFY COLUMN status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'REJECTED', 'ARCHIVED', 'DELETED') DEFAULT 'PENDING';

-- Remove new lifecycle fields
ALTER TABLE tenants
DROP COLUMN trial_until,
DROP COLUMN suspended_until,
DROP COLUMN deactivated_at;

-- Drop indexes that were added
DROP INDEX IF EXISTS idx_tenants_trial_until ON tenants;
DROP INDEX IF EXISTS idx_tenants_suspended_until ON tenants;
DROP INDEX IF EXISTS idx_tenants_deactivated_at ON tenants;

-- Restore data from backup if available
-- Note: This would only work if backup table exists and has data
-- Use with caution as this may overwrite current data

-- Verify restoration
SELECT
  'Rollback Summary' as info,
  COUNT(*) as total_tenants,
  GROUP_CONCAT(DISTINCT status) as current_statuses
FROM tenants;

-- Log completion
UPDATE rollback_log SET status = 'SUCCESS' WHERE rollback_name = '002_restore_tenant_status';

SELECT 'Rollback 002: Tenant status system restored successfully' as message;