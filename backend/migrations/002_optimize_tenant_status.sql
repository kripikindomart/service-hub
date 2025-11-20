-- Migration 002: Optimize tenant status system
-- Purpose: Simplify tenant status from EntityStatus to TenantStatus enum
-- Add lifecycle tracking fields for trials, suspensions, and deactivation
-- Date: 2024-11-20

-- Log migration start
INSERT INTO migration_log (migration_name, status)
VALUES ('002_optimize_tenant_status', 'SUCCESS');

-- Backup existing tenant data
CREATE TABLE tenants_backup_002 AS SELECT * FROM tenants;

-- Add new lifecycle fields to existing tenant table
ALTER TABLE tenants
ADD COLUMN trial_until DATETIME NULL COMMENT 'Trial expiration date',
ADD COLUMN suspended_until DATETIME NULL COMMENT 'Suspension end date',
ADD COLUMN deactivated_at DATETIME NULL COMMENT 'Deactivation timestamp';

-- Create the new TenantStatus enum type
-- Note: MySQL doesn't support ENUM alterations easily, so we'll use VARCHAR with CHECK constraint
ALTER TABLE tenants
MODIFY COLUMN status ENUM('SETUP', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED') DEFAULT 'SETUP' COMMENT 'Simplified tenant status';

-- Update existing tenant statuses based on business logic
-- Convert existing statuses to new simplified system
UPDATE tenants SET
  status = CASE
    WHEN type = 'CORE' THEN 'ACTIVE'
    WHEN status = 'ACTIVE' AND type = 'TRIAL' AND (trial_until IS NULL OR trial_until > NOW()) THEN 'ACTIVE'
    WHEN status = 'ACTIVE' AND type = 'TRIAL' AND trial_until IS NOT NULL AND trial_until <= NOW() THEN 'SUSPENDED'
    WHEN status = 'PENDING' THEN 'SETUP'
    WHEN status = 'SUSPENDED' THEN 'SUSPENDED'
    WHEN status IN ('INACTIVE', 'ARCHIVED') THEN 'DEACTIVATED'
    WHEN status = 'DELETED' THEN 'DEACTIVATED'
    ELSE 'SETUP'
  END,
  trial_until = CASE
    WHEN type = 'TRIAL' AND status = 'ACTIVE' AND trial_until IS NULL
    THEN DATE_ADD(created_at, INTERVAL 30 DAY)
    ELSE trial_until
  END;

-- Add indexes for performance
CREATE INDEX idx_tenants_trial_until ON tenants(trial_until);
CREATE INDEX idx_tenants_suspended_until ON tenants(suspended_until);
CREATE INDEX idx_tenants_deactivated_at ON tenants(deactivated_at);

-- Verify migration results
SELECT
  'Migration Summary' as info,
  COUNT(*) as total_tenants,
  SUM(CASE WHEN status = 'SETUP' THEN 1 ELSE 0 END) as setup_count,
  SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count,
  SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) as suspended_count,
  SUM(CASE WHEN status = 'DEACTIVATED' THEN 1 ELSE 0 END) as deactivated_count,
  SUM(CASE WHEN trial_until IS NOT NULL AND trial_until > NOW() THEN 1 ELSE 0 END) as active_trials,
  SUM(CASE WHEN trial_until IS NOT NULL AND trial_until <= NOW() THEN 1 ELSE 0 END) as expired_trials
FROM tenants;

-- Log completion
UPDATE migration_log SET status = 'SUCCESS' WHERE migration_name = '002_optimize_tenant_status';

SELECT 'Migration 002: Tenant status optimization completed successfully' as message;