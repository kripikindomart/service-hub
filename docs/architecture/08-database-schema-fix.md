# Database Schema Fix - Normalization of JSON Fields

## Overview

Dokumen ini memperbaiki arsitektur database dengan menghilangkan penggunaan JSON untuk data yang seharusnya dinormalisasi, khususnya untuk role-based access control (RBAC) dan permissions.

## Tabel yang Perlu Diperbaiki

### 1. Roles Table - Permissions Normalization

**Current Schema (❌ Menggunakan JSON):**
```sql
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('SYSTEM', 'TENANT', 'CUSTOM') NOT NULL,
  level ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'GUEST') DEFAULT 'USER',
  tenant_id VARCHAR(36),
  is_system_role BOOLEAN DEFAULT FALSE,
  is_default_role BOOLEAN DEFAULT FALSE,
  max_users INT DEFAULT NULL,
  -- ❌ PROBLEM: Using JSON array for permissions
  permissions JSON,
  parent_role_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_role_id) REFERENCES roles(id)
);
```

**Fixed Schema (✅ Normalized):**
```sql
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('SYSTEM', 'TENANT', 'CUSTOM') NOT NULL,
  level ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'GUEST') DEFAULT 'USER',
  tenant_id VARCHAR(36),
  is_system_role BOOLEAN DEFAULT FALSE,
  is_default_role BOOLEAN DEFAULT FALSE,
  max_users INT DEFAULT NULL,
  parent_role_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_role_name_tenant (name, tenant_id),
  INDEX idx_role_type (type),
  INDEX idx_role_level (level),
  INDEX idx_role_tenant (tenant_id),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_role_id) REFERENCES roles(id)
);

-- ✅ NEW: Role Permissions Junction Table
CREATE TABLE role_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  role_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by VARCHAR(36),

  UNIQUE KEY unique_role_permission (role_id, permission_id),
  INDEX idx_role_permission_role (role_id),
  INDEX idx_role_permission_permission (permission_id),

  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

### 2. Permissions Table (New)

```sql
CREATE TABLE permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL UNIQUE,
  resource VARCHAR(100) NOT NULL,        -- e.g., "user", "tenant", "service"
  action VARCHAR(50) NOT NULL,           -- e.g., "create", "read", "update", "delete"
  scope ENUM('OWN', 'TENANT', 'ALL') DEFAULT 'TENANT',
  description TEXT,
  category VARCHAR(100),                 -- e.g., "core", "service", "admin"
  is_system_permission BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_permission_resource (resource),
  INDEX idx_permission_action (action),
  INDEX idx_permission_scope (scope),
  INDEX idx_permission_category (category),

  UNIQUE KEY unique_permission_action_resource (resource, action, scope)
);

-- ✅ NEW: Permission Conditions Table (for complex permission rules)
CREATE TABLE permission_conditions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  permission_id VARCHAR(36) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,    -- e.g., "field_based", "time_based", "location_based"
  condition_key VARCHAR(100) NOT NULL,   -- e.g., "department", "business_hours"
  condition_operator VARCHAR(20) NOT NULL, -- e.g., "equals", "in", "between"
  condition_value TEXT,                   -- JSON value for complex conditions
  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  INDEX idx_condition_permission (permission_id),
  INDEX idx_condition_type (condition_type)
);
```

### 3. Service Endpoints Table - Required Permissions Normalization

**Current Schema (❌ Menggunakan JSON):**
```sql
CREATE TABLE service_endpoints (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  service_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
  path VARCHAR(500) NOT NULL,
  request_schema JSON,
  response_schema JSON,
  requires_auth BOOLEAN DEFAULT TRUE,
  -- ❌ PROBLEM: Using JSON array for required permissions
  required_permissions JSON,
  rate_limit INT DEFAULT 100,
  timeout_ms INT DEFAULT 30000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_service_endpoint (service_id, method, path),
  INDEX idx_endpoint_service (service_id),
  INDEX idx_endpoint_method (method),

  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);
```

**Fixed Schema (✅ Normalized):**
```sql
CREATE TABLE service_endpoints (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  service_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
  path VARCHAR(500) NOT NULL,
  request_schema JSON,                    -- ✅ OK: Schema definition needs JSON
  response_schema JSON,                   -- ✅ OK: Schema definition needs JSON
  requires_auth BOOLEAN DEFAULT TRUE,
  rate_limit INT DEFAULT 100,
  timeout_ms INT DEFAULT 30000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_service_endpoint (service_id, method, path),
  INDEX idx_endpoint_service (service_id),
  INDEX idx_endpoint_method (method),

  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- ✅ NEW: Endpoint Permissions Junction Table
CREATE TABLE endpoint_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  endpoint_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,       -- Whether this permission is mandatory
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_endpoint_permission (endpoint_id, permission_id),
  INDEX idx_endpoint_permission_endpoint (endpoint_id),
  INDEX idx_endpoint_permission_permission (permission_id),

  FOREIGN KEY (endpoint_id) REFERENCES service_endpoints(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

### 4. User Tenants Table - Custom Permissions Normalization

**Current Schema (❌ Menggunakan JSON):**
```sql
CREATE TABLE user_tenants (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_by VARCHAR(36),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  tenant_preferences JSON,                -- ✅ OK: User preferences can use JSON
  -- ❌ PROBLEM: Using JSON array for custom permissions
  custom_permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_tenant (user_id, tenant_id),
  INDEX idx_user_tenant_user (user_id),
  INDEX idx_user_tenant_tenant (tenant_id),
  INDEX idx_user_tenant_role (role_id),
  INDEX idx_user_tenant_status (status),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);
```

**Fixed Schema (✅ Normalized):**
```sql
CREATE TABLE user_tenants (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_by VARCHAR(36),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  tenant_preferences JSON,                -- ✅ OK: User preferences can use JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_tenant (user_id, tenant_id),
  INDEX idx_user_tenant_user (user_id),
  INDEX idx_user_tenant_tenant (tenant_id),
  INDEX idx_user_tenant_role (role_id),
  INDEX idx_user_tenant_status (status),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- ✅ NEW: User Custom Permissions Junction Table
CREATE TABLE user_custom_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_tenant_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  granted_by VARCHAR(36),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_granted BOOLEAN DEFAULT TRUE,        -- Can be used to explicitly deny permissions
  reason TEXT,                            -- Reason for custom permission

  UNIQUE KEY unique_user_tenant_permission (user_tenant_id, permission_id),
  INDEX idx_user_custom_user_tenant (user_tenant_id),
  INDEX idx_user_custom_permission (permission_id),

  FOREIGN KEY (user_tenant_id) REFERENCES user_tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

### 5. System Configurations Table - Access Permissions Normalization

**Current Schema (❌ Menggunakan JSON):**
```sql
CREATE TABLE system_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSON,                              -- ✅ OK: Configuration values can be complex JSON
  description TEXT,
  type ENUM('SYSTEM', 'TENANT', 'SERVICE', 'USER') NOT NULL DEFAULT 'SYSTEM',
  scope VARCHAR(100),
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  -- ❌ PROBLEM: Using JSON array for access permissions
  access_permissions JSON,
  validation_schema JSON,                  -- ✅ OK: Validation schema needs JSON
  default_value JSON,                      -- ✅ OK: Default values can be JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  updated_by VARCHAR(36),

  INDEX idx_config_key (key),
  INDEX idx_config_type (type),
  INDEX idx_config_scope (scope),

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

**Fixed Schema (✅ Normalized):**
```sql
CREATE TABLE system_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSON,                              -- ✅ OK: Configuration values can be complex JSON
  description TEXT,
  type ENUM('SYSTEM', 'TENANT', 'SERVICE', 'USER') NOT NULL DEFAULT 'SYSTEM',
  scope VARCHAR(100),
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  validation_schema JSON,                  -- ✅ OK: Validation schema needs JSON
  default_value JSON,                      -- ✅ OK: Default values can be JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  updated_by VARCHAR(36),

  INDEX idx_config_key (key),
  INDEX idx_config_type (type),
  INDEX idx_config_scope (scope),

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- ✅ NEW: Configuration Access Permissions Junction Table
CREATE TABLE config_access_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  config_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  permission_type ENUM('READ', 'WRITE', 'DELETE') NOT NULL,
  granted_by VARCHAR(36),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_config_role_permission (config_id, role_id, permission_type),
  INDEX idx_config_access_config (config_id),
  INDEX idx_config_access_role (role_id),

  FOREIGN KEY (config_id) REFERENCES system_configs(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

## Summary of Changes

### Tabel yang Diperbaiki:
1. **Roles Table** - Menghapus `permissions JSON`, diganti dengan tabel `role_permissions`
2. **Service Endpoints Table** - Menghapus `required_permissions JSON`, diganti dengan tabel `endpoint_permissions`
3. **User Tenants Table** - Menghapus `custom_permissions JSON`, diganti dengan tabel `user_custom_permissions`
4. **System Configurations Table** - Menghapus `access_permissions JSON`, diganti dengan tabel `config_access_permissions`

### Tabel Baru yang Ditambahkan:
1. **permissions** - Master tabel untuk semua permissions
2. **permission_conditions** - Untuk permission rules yang kompleks
3. **role_permissions** - Junction table antara roles dan permissions
4. **endpoint_permissions** - Junction table antara service endpoints dan permissions
5. **user_custom_permissions** - Junction table untuk user-specific permissions
6. **config_access_permissions** - Junction table untuk configuration access control

### JSON yang Tetap Dipertahankan (✅ Valid Usage):
1. **Users.preferences** - User preferences membutuhkan struktur yang fleksibel
2. **Users.profile_metadata** - Profile metadata bisa beragam
3. **Tenants.settings, feature_flags, integrations** - Configuration yang kompleks
4. **Services.form_schema, menu_schema, auth_config** - Dynamic schema definition
5. **Service Endpoints.request_schema, response_schema** - API schema definition
6. **Tenant Services.custom_settings, custom_menu_config** - Custom configuration
7. **System Configurations.value, validation_schema, default_value** - Configuration values

## Benefits of Normalization

### 1. **Query Performance**
- Index-based joins instead of JSON array searches
- Better query optimization by database engine
- Faster permission checking

### 2. **Data Integrity**
- Foreign key constraints prevent orphaned records
- Proper referential integrity
- No invalid permission references

### 3. **Scalability**
- Efficient for large datasets
- Better support for complex permission hierarchies
- Easier to implement permission inheritance

### 4. **Maintainability**
- Clear schema relationships
- Easier to debug permission issues
- Better data governance

### 5. **Security**
- Granular control over permission grants
- Audit trail for permission assignments
- Easier to implement permission revocation

## Migration Strategy

### Step 1: Create New Tables
```sql
-- Create permissions table
CREATE TABLE permissions (...);

-- Create permission conditions table
CREATE TABLE permission_conditions (...);

-- Create junction tables
CREATE TABLE role_permissions (...);
CREATE TABLE endpoint_permissions (...);
CREATE TABLE user_custom_permissions (...);
CREATE TABLE config_access_permissions (...);
```

### Step 2: Migrate Data from JSON
```sql
-- Migrate role permissions
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT
    r.id as role_id,
    p.id as permission_id,
    r.created_at as granted_at
FROM roles r
CROSS JOIN JSON_TABLE(
    r.permissions,
    '$[*]' COLUMNS (permission_name VARCHAR(255) PATH '$')
) AS jt
JOIN permissions p ON p.name = jt.permission_name;

-- Similar migration for other tables...
```

### Step 3: Drop JSON Columns
```sql
-- Remove JSON columns after successful migration
ALTER TABLE roles DROP COLUMN permissions;
ALTER TABLE service_endpoints DROP COLUMN required_permissions;
ALTER TABLE user_tenants DROP COLUMN custom_permissions;
ALTER TABLE system_configs DROP COLUMN access_permissions;
```

### Step 4: Update Application Code
- Update ORM models to use normalized relationships
- Modify permission checking logic
- Update API responses to use joined data

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Status**: Ready for Implementation