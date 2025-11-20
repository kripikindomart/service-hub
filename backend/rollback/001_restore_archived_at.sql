-- Rollback Script 001: Restore archivedAt fields
-- Purpose: Restore archivedAt columns in case of rollback
-- Use only if migration 001_remove_archived_at.sql needs to be reverted
-- Date: 2024-11-20

-- Log rollback start
CREATE TABLE IF NOT EXISTS rollback_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rollback_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS'
);

INSERT INTO rollback_log (rollback_name, status) VALUES ('001_restore_archived_at', 'SUCCESS');

-- Restore archivedAt columns to User model
ALTER TABLE users ADD COLUMN archived_at TIMESTAMP NULL;

-- Restore archivedAt columns to Role model
ALTER TABLE roles ADD COLUMN archived_at TIMESTAMP NULL;

-- Restore archivedAt columns to Organization model
ALTER TABLE organizations ADD COLUMN archived_at TIMESTAMP NULL;

-- Restore archivedAt columns to Menu model
ALTER TABLE menus ADD COLUMN archived_at TIMESTAMP NULL;

-- Restore archivedAt columns to UserAssignment model
ALTER TABLE user_assignments ADD COLUMN archived_at TIMESTAMP NULL;

-- Restore indexes (optional - only if performance critical)
CREATE INDEX users_archived_at_idx ON users(archived_at);
CREATE INDEX roles_archived_at_idx ON roles(archived_at);
CREATE INDEX organizations_archived_at_idx ON organizations(archived_at);
CREATE INDEX menus_archived_at_idx ON menus(archived_at);
CREATE INDEX user_assignments_archived_at_idx ON user_assignments(archived_at);

-- Verify restoration
SELECT 'users table' as table_name, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'archived_at'
UNION ALL
SELECT 'roles table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'archived_at'
UNION ALL
SELECT 'organizations table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'archived_at'
UNION ALL
SELECT 'menus table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'archived_at'
UNION ALL
SELECT 'user_assignments table', COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_assignments' AND COLUMN_NAME = 'archived_at';

-- Log completion
UPDATE rollback_log SET status = 'SUCCESS' WHERE rollback_name = '001_restore_archived_at';

SELECT 'Rollback 001: Restore archivedAt fields completed successfully' as message;