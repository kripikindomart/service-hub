-- Migration 003: Remove role redundancy and add UI fields
-- Purpose: Remove unused weight and constraints fields, add priority, color, icon fields
-- Date: 2024-11-20

-- Log migration start
INSERT INTO migration_log (migration_name, status)
VALUES ('003_remove_role_redundancy', 'SUCCESS');

-- Backup existing role data
CREATE TABLE roles_backup_003 AS SELECT * FROM roles;

-- Remove unused fields
ALTER TABLE roles
DROP COLUMN weight,
DROP COLUMN constraints;

-- Add new UI enhancement fields
ALTER TABLE roles
ADD COLUMN priority INT DEFAULT 0 COMMENT 'Role display priority',
ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6' COMMENT 'Role color for UI',
ADD COLUMN icon VARCHAR(100) NULL COMMENT 'Role icon identifier';

-- Add indexes for new fields
CREATE INDEX idx_roles_priority ON roles(priority);
CREATE INDEX idx_roles_color ON roles(color);

-- Update existing roles with default values
UPDATE roles SET
  priority = CASE level
    WHEN 'SUPER_ADMIN' THEN 100
    WHEN 'ADMIN' THEN 80
    WHEN 'MANAGER' THEN 60
    WHEN 'USER' THEN 40
    WHEN 'GUEST' THEN 20
    ELSE 0
  END,
  color = CASE level
    WHEN 'SUPER_ADMIN' THEN '#DC2626'  -- Red
    WHEN 'ADMIN' THEN '#EA580C'      -- Orange
    WHEN 'MANAGER' THEN '#16A34A'    -- Green
    WHEN 'USER' THEN '#2563EB'      -- Blue
    WHEN 'GUEST' THEN '#6B7280'      -- Gray
    ELSE '#3B82F6'                  -- Default blue
  END,
  icon = CASE level
    WHEN 'SUPER_ADMIN' THEN 'shield'
    WHEN 'ADMIN' THEN 'crown'
    WHEN 'MANAGER' THEN 'briefcase'
    WHEN 'USER' THEN 'user'
    WHEN 'GUEST' THEN 'user-check'
    ELSE 'circle'
  END;

-- Verify migration results
SELECT
  'Role Migration Summary' as info,
  COUNT(*) as total_roles,
  COUNT(CASE WHEN is_system_role = true THEN 1 END) as system_roles,
  COUNT(CASE WHEN is_system_role = false THEN 1 END) as custom_roles,
  COUNT(CASE WHEN priority > 0 THEN 1 END) as roles_with_priority,
  COUNT(CASE WHEN color != '#3B82F6' THEN 1 END) as roles_with_custom_color,
  COUNT(CASE WHEN icon IS NOT NULL THEN 1 END) as roles_with_icon
FROM roles;

-- Log completion
UPDATE migration_log SET status = 'SUCCESS' WHERE migration_name = '003_remove_role_redundancy';

SELECT 'Migration 003: Role redundancy removal completed successfully' as message;