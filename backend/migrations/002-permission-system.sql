-- Service Hub 2.0 Migration: Permission System
-- Migration: 002-permission-system.sql
-- Description: Create tables for hierarchical permission system with RBAC and ABAC

-- ========================================
-- PERMISSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY DEFAULT concat('perm_', uuid_generate_v4()),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'TENANT' CHECK (scope IN ('GLOBAL', 'TENANT', 'SERVICE', 'MODULE', 'DATA')),
    category VARCHAR(100) NOT NULL,
    conditions JSONB, -- Conditions for attribute-based access control
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ROLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY DEFAULT concat('role_', uuid_generate_v4()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'CUSTOM' CHECK (type IN ('SYSTEM', 'CUSTOM')),
    scope VARCHAR(20) NOT NULL DEFAULT 'TENANT' CHECK (scope IN ('GLOBAL', 'TENANT', 'SERVICE', 'MODULE')),
    is_system BOOLEAN DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission names
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_role_name_scope UNIQUE (name, scope)
);

-- ========================================
-- USER ROLES TABLE (Role Assignments)
-- ========================================
CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY DEFAULT concat('ur_', uuid_generate_v4()),
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    tenant_id TEXT, -- NULL for global/system roles
    assigned_by TEXT NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED')),
    context JSONB DEFAULT '{}', -- Additional context for conditional permissions

    CONSTRAINT unique_user_role UNIQUE (user_id, role_id, tenant_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT check_expires_after_assigned CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

-- ========================================
-- TENANT ROLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_roles (
    id TEXT PRIMARY KEY DEFAULT concat('tr_', uuid_generate_v4()),
    tenant_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    customized_name VARCHAR(255),
    customized_permissions JSONB, -- Override role permissions for this tenant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_tenant_role UNIQUE (tenant_id, role_id),
    CONSTRAINT fk_tenant_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ========================================
-- PERMISSION CONDITIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS permission_conditions (
    id TEXT PRIMARY KEY DEFAULT concat('pc_', uuid_generate_v4()),
    permission_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than', 'contains', 'starts_with', 'ends_with')),
    field VARCHAR(100) NOT NULL,
    value JSONB,
    logical_operator VARCHAR(10) DEFAULT 'AND' CHECK (logical_operator IN ('AND', 'OR')),
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_permission_conditions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ========================================
-- ROLE PERMISSION MAPPINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY DEFAULT concat('rp_', uuid_generate_v4()),
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_by TEXT,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    conditions JSONB,

    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT check_expires_after_granted CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- ========================================
-- PERMISSION CACHING TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS permission_cache (
    id TEXT PRIMARY KEY DEFAULT concat('pcache_', uuid_generate_v4()),
    user_id TEXT NOT NULL,
    tenant_id TEXT,
    permission_hash TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_tenant_cache UNIQUE (user_id, tenant_id),
    CONSTRAINT fk_permission_cache_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_type ON roles(type);
CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);

-- User Roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON user_roles(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at);

-- Tenant Roles indexes
CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant_id ON tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_roles_role_id ON tenant_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_tenant_roles_is_active ON tenant_roles(is_active);

-- Permission Conditions indexes
CREATE INDEX IF NOT EXISTS idx_permission_conditions_permission_id ON permission_conditions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_conditions_name ON permission_conditions(name);

-- Role Permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_expires_at ON role_permissions(expires_at);

-- Permission Cache indexes
CREATE INDEX IF NOT EXISTS idx_permission_cache_user_id ON permission_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_cache_tenant_id ON permission_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permission_cache_permission_hash ON permission_cache(permission_hash);
CREATE INDEX IF NOT EXISTS idx_permission_cache_expires_at ON permission_cache(expires_at);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE
    ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE
    ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_roles_updated_at BEFORE UPDATE
    ON tenant_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE PERMISSION DATA
-- ========================================

-- Global Platform Permissions
INSERT INTO permissions (name, display_name, description, resource, action, scope, category, status) VALUES
('platform:admin', 'Platform Administrator', 'Full platform administration access', 'platform', 'admin', 'GLOBAL', 'Platform', 'ACTIVE'),
('service:create', 'Create Service', 'Create new service definitions', 'service', 'create', 'GLOBAL', 'Service Management', 'ACTIVE'),
('service:manage', 'Manage Service', 'Manage all service definitions', 'service', 'manage', 'GLOBAL', 'Service Management', 'ACTIVE'),
('tenant:create', 'Create Tenant', 'Create new tenants', 'tenant', 'create', 'GLOBAL', 'Tenant Management', 'ACTIVE'),
('tenant:manage', 'Manage Tenant', 'Manage all tenants', 'tenant', 'manage', 'GLOBAL', 'Tenant Management', 'ACTIVE'),
('billing:manage', 'Manage Billing', 'Manage billing and subscriptions', 'billing', 'manage', 'GLOBAL', 'Billing', 'ACTIVE'),
('system:configure', 'Configure System', 'Configure system settings', 'system', 'configure', 'GLOBAL', 'System', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- Service-Level Permissions
INSERT INTO permissions (name, display_name, description, resource, action, scope, category, status) VALUES
('service:{serviceId}:read', 'Read Service Data', 'Read data from specific service', 'service', 'read', 'SERVICE', 'Service Access', 'ACTIVE'),
('service:{serviceId}:write', 'Write Service Data', 'Write data to specific service', 'service', 'write', 'SERVICE', 'Service Access', 'ACTIVE'),
('service:{serviceId}:admin', 'Administer Service', 'Full administration of specific service', 'service', 'admin', 'SERVICE', 'Service Access', 'ACTIVE'),
('service:{serviceId}:integrate', 'Integrate Service', 'Integrate service with other services', 'service', 'integrate', 'SERVICE', 'Service Access', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- Module-Level Permissions
INSERT INTO permissions (name, display_name, description, resource, action, scope, category, status) VALUES
('module:{moduleId}:read', 'Read Module Data', 'Read data from specific module', 'module', 'read', 'MODULE', 'Module Access', 'ACTIVE'),
('module:{moduleId}:write', 'Write Module Data', 'Write data to specific module', 'module', 'write', 'MODULE', 'Module Access', 'ACTIVE'),
('module:{moduleId}:delete', 'Delete Module Data', 'Delete data from specific module', 'module', 'delete', 'MODULE', 'Module Access', 'ACTIVE'),
('module:{moduleId}:export', 'Export Module Data', 'Export data from specific module', 'module', 'export', 'MODULE', 'Module Access', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- Tenant-Level Permissions
INSERT INTO permissions (name, display_name, description, resource, action, scope, category, status) VALUES
('tenant:{tenantId}:admin', 'Tenant Administrator', 'Full administration of tenant', 'tenant', 'admin', 'TENANT', 'Tenant Management', 'ACTIVE'),
('tenant:{tenantId}:user_manage', 'Manage Users', 'Manage tenant users', 'tenant', 'user_manage', 'TENANT', 'User Management', 'ACTIVE'),
('tenant:{tenantId}:service_assign', 'Assign Services', 'Assign services to tenant', 'tenant', 'service_assign', 'TENANT', 'Service Management', 'ACTIVE'),
('tenant:{tenantId}:billing_manage', 'Manage Billing', 'Manage tenant billing', 'tenant', 'billing_manage', 'TENANT', 'Billing', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- Data-Level Permissions
INSERT INTO permissions (name, display_name, description, resource, action, scope, category, status) VALUES
('data:{resource}:read', 'Read Resource Data', 'Read specific resource data', 'data', 'read', 'DATA', 'Data Access', 'ACTIVE'),
('data:{resource}:write', 'Write Resource Data', 'Write specific resource data', 'data', 'write', 'DATA', 'Data Access', 'ACTIVE'),
('data:{resource}:delete', 'Delete Resource Data', 'Delete specific resource data', 'data', 'delete', 'DATA', 'Data Access', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- SAMPLE ROLE DATA
-- ========================================

-- System Roles
INSERT INTO roles (name, display_name, description, type, scope, is_system, permissions, status) VALUES
('Super Administrator', 'Super Administrator', 'Full system administrator with all permissions', 'SYSTEM', 'GLOBAL', true,
 '["platform:admin", "service:create", "service:manage", "tenant:create", "tenant:manage", "billing:manage", "system:configure"]', 'ACTIVE'),
('Platform Administrator', 'Platform Administrator', 'Platform administrator with broad permissions', 'SYSTEM', 'GLOBAL', true,
 '["service:create", "service:manage", "tenant:create", "tenant:manage", "billing:manage"]', 'ACTIVE'),
('System Auditor', 'System Auditor', 'Read-only access to all system data', 'SYSTEM', 'GLOBAL', true,
 '["service:{serviceId}:read", "module:{moduleId}:read", "data:{resource}:read"]', 'ACTIVE')
ON CONFLICT (name, scope) DO NOTHING;

-- Tenant Roles
INSERT INTO roles (name, display_name, description, type, scope, is_system, permissions, status) VALUES
('Tenant Administrator', 'Tenant Administrator', 'Full administration of tenant resources', 'SYSTEM', 'TENANT', true,
 '["tenant:{tenantId}:admin", "tenant:{tenantId}:user_manage", "tenant:{tenantId}:service_assign", "tenant:{tenantId}:billing_manage"]', 'ACTIVE'),
('Tenant Manager', 'Tenant Manager', 'Manage tenant users and services', 'SYSTEM', 'TENANT', true,
 '["tenant:{tenantId}:user_manage", "tenant:{tenantId}:service_assign"]', 'ACTIVE'),
('Service Manager', 'Service Manager', 'Manage assigned services', 'SYSTEM', 'TENANT', true,
 '["service:{serviceId}:read", "service:{serviceId}:write"]', 'ACTIVE'),
('Standard User', 'Standard User', 'Basic user access to assigned services', 'SYSTEM', 'TENANT', true,
 '["service:{serviceId}:read", "module:{moduleId}:read"]', 'ACTIVE')
ON CONFLICT (name, scope) DO NOTHING;

-- ========================================
-- SAMPLE PERMISSION CONDITIONS
-- ========================================

-- Example: Only allow user management within same department
INSERT INTO permission_conditions (permission_id, name, operator, field, value, logical_operator, order_num)
SELECT p.id, 'same_department', 'equals', 'department', 'user.department', 'AND', 1
FROM permissions p
WHERE p.name = 'tenant:{tenantId}:user_manage'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Example: Only allow service assignment during business hours
INSERT INTO permission_conditions (permission_id, name, operator, field, value, logical_operator, order_num)
SELECT p.id, 'business_hours', 'in', 'hour', '[9,10,11,12,13,14,15,16,17]', 'AND', 1
FROM permissions p
WHERE p.name = 'tenant:{tenantId}:service_assign'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE permissions IS 'Registry of all system permissions with hierarchical scoping';
COMMENT ON TABLE roles IS 'Role definitions with permission assignments and scoping';
COMMENT ON TABLE user_roles IS 'User role assignments with context and expiration';
COMMENT ON TABLE tenant_roles IS 'Tenant-specific role customizations';
COMMENT ON TABLE permission_conditions IS 'Conditions for attribute-based access control (ABAC)';
COMMENT ON TABLE role_permissions IS 'Explicit role-permission mappings with optional conditions';
COMMENT ON TABLE permission_cache IS 'Cache for computed user permissions to improve performance';

COMMENT ON COLUMN permissions.conditions IS 'JSON conditions for ABAC rules';
COMMENT ON COLUMN user_roles.context IS 'Additional context for conditional role assignments';
COMMENT ON COLUMN role_permissions.conditions IS 'Override conditions for specific role-permission combination';
COMMENT ON COLUMN permission_cache.permission_hash IS 'Hash of user context for cache invalidation';

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

CREATE OR REPLACE VIEW active_permissions AS
SELECT p.*
FROM permissions p
WHERE p.status = 'ACTIVE';

CREATE OR REPLACE VIEW active_roles AS
SELECT r.*
FROM roles r
WHERE r.status = 'ACTIVE';

CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT DISTINCT
    ur.user_id,
    ur.tenant_id,
    p.name as permission_name,
    p.resource,
    p.action,
    p.scope,
    r.name as role_name,
    ur.assigned_at,
    ur.expires_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN jsonb_array_elements_text(r.permissions) AS perm_name ON true
JOIN permissions p ON p.name = perm_name
WHERE ur.status = 'ACTIVE'
  AND r.status = 'ACTIVE'
  AND p.status = 'ACTIVE'
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

CREATE OR REPLACE VIEW tenant_role_permissions AS
SELECT
    tr.tenant_id,
    r.name as role_name,
    r.type,
    r.scope,
    COALESCE(tr.customized_permissions, r.permissions) as permissions,
    tr.is_active,
    tr.customized_name
FROM tenant_roles tr
JOIN roles r ON tr.role_id = r.id
WHERE r.status = 'ACTIVE';