-- Migration 001: Remove redundant archivedAt fields
-- Purpose: Remove archivedAt columns that are redundant with deletedAt
-- Impact: User, Role, Organization, Menu models
-- Date: 2024-11-20

-- Set up migration tracking
CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS'
);

-- Log migration start
INSERT INTO migration_log (migration_name, status) VALUES ('001_remove_archived_at', 'SUCCESS');

-- Backup data before changes (optional but recommended)
CREATE TABLE users_backup_001 AS SELECT * FROM users;
CREATE TABLE roles_backup_001 AS SELECT * FROM roles;
CREATE TABLE organizations_backup_001 AS SELECT * FROM organizations;
CREATE TABLE menus_backup_001 AS SELECT * FROM menus;

-- Remove archivedAt columns from User model
ALTER TABLE users DROP COLUMN archived_at;

-- Remove archivedAt columns from Role model
ALTER TABLE roles DROP COLUMN archived_at;

-- Remove archivedAt columns from Organization model
ALTER TABLE organizations DROP COLUMN archived_at;

-- Remove archivedAt columns from Menu model
ALTER TABLE menus DROP COLUMN archived_at;

-- Drop related indexes that referenced archived_at
DROP INDEX IF EXISTS users_archived_at_idx ON users;
DROP INDEX IF EXISTS roles_archived_at_idx ON roles;
DROP INDEX IF EXISTS organizations_archived_at_idx ON organizations;
DROP INDEX IF EXISTS menus_archived_at_idx ON menus;

-- Verify changes
SELECT 'users table' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME LIKE '%archived%'
UNION ALL
SELECT 'roles table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME LIKE '%archived%'
UNION ALL
SELECT 'organizations table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME LIKE '%archived%'
UNION ALL
SELECT 'menus table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME LIKE '%archived%';

-- Log completion
UPDATE migration_log SET status = 'SUCCESS' WHERE migration_name = '001_remove_archived_at';

-- Success message
SELECT 'Migration 001: Remove archivedAt fields completed successfully' as message;