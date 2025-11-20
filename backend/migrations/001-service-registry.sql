-- Service Hub 2.0 Migration: Service Registry
-- Migration: 001-service-registry.sql
-- Description: Create tables for service definitions, modules, and tenant services

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- SERVICE DEFINITIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS service_definitions (
    id TEXT PRIMARY KEY DEFAULT concat('sd_', uuid_generate_v4()),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    type VARCHAR(20) NOT NULL DEFAULT 'INTERNAL' CHECK (type IN ('INTERNAL', 'EXTERNAL', 'COMPOSITE')),
    category VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'BETA')),
    icon VARCHAR(255),
    color VARCHAR(7),

    -- Configuration fields (JSON)
    required_permissions JSONB NOT NULL DEFAULT '{}',
    api_config JSONB NOT NULL DEFAULT '{}',
    database_config JSONB NOT NULL DEFAULT '{}',
    ui_config JSONB NOT NULL DEFAULT '{}',

    -- Metadata
    documentation TEXT,
    repository VARCHAR(500),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    dependencies TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Tracking
    published_by TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_service_name_version UNIQUE (name, version)
);

-- ========================================
-- SERVICE MODULES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS service_modules (
    id TEXT PRIMARY KEY DEFAULT concat('sm_', uuid_generate_v4()),
    service_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    type VARCHAR(20) NOT NULL DEFAULT 'FEATURE' CHECK (type IN ('FEATURE', 'INTEGRATION', 'WIDGET', 'UTILITY')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'BETA')),

    -- Configuration fields (JSON)
    required_permissions JSONB NOT NULL DEFAULT '{}',
    api_config JSONB NOT NULL DEFAULT '{}',
    form_config JSONB NOT NULL DEFAULT '{}',
    output_config JSONB NOT NULL DEFAULT '{}',
    menu_config JSONB NOT NULL DEFAULT '{}',

    -- Implementation details
    component_path VARCHAR(500),
    route_path VARCHAR(500),
    icon VARCHAR(255),
    order_num INTEGER DEFAULT 0,
    parent_module VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_service_module UNIQUE (service_id, name),
    CONSTRAINT fk_service_modules_service
        FOREIGN KEY (service_id) REFERENCES service_definitions(id) ON DELETE CASCADE
);

-- ========================================
-- TENANT SERVICES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_services (
    id TEXT PRIMARY KEY DEFAULT concat('ts_', uuid_generate_v4()),
    tenant_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PROVISIONING', 'ERROR')),

    -- Configuration
    configuration JSONB NOT NULL DEFAULT '{}',
    custom_settings JSONB NOT NULL DEFAULT '{}',
    enabled_modules TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Access Control
    access_rules JSONB NOT NULL DEFAULT '{}',
    rate_limiting JSONB,

    -- Provisioning tracking
    provisioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_access_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_tenant_service UNIQUE (tenant_id, service_id),
    CONSTRAINT fk_tenant_services_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_services_service
        FOREIGN KEY (service_id) REFERENCES service_definitions(id) ON DELETE CASCADE
);

-- ========================================
-- SERVICE INTEGRATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS service_integrations (
    id TEXT PRIMARY KEY DEFAULT concat('si_', uuid_generate_v4()),
    tenant_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    external_service VARCHAR(255) NOT NULL,
    integration_type VARCHAR(20) NOT NULL DEFAULT 'API' CHECK (integration_type IN ('API', 'WEBHOOK', 'DATABASE', 'FILE_TRANSFER')),

    -- Configuration (encrypted at application level)
    configuration JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    webhook_url VARCHAR(500),

    -- Status and monitoring
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR', 'CONFIGURING')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(100) DEFAULT '0 */6 * * *',

    -- Health monitoring
    health_check_url VARCHAR(500),
    health_check_interval INTEGER DEFAULT 300,
    last_health_check TIMESTAMP WITH TIME ZONE,
    is_healthy BOOLEAN DEFAULT true,

    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_service_integrations_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Service Definitions indexes
CREATE INDEX IF NOT EXISTS idx_service_definitions_status ON service_definitions(status);
CREATE INDEX IF NOT EXISTS idx_service_definitions_type ON service_definitions(type);
CREATE INDEX IF NOT EXISTS idx_service_definitions_category ON service_definitions(category);
CREATE INDEX IF NOT EXISTS idx_service_definitions_published_at ON service_definitions(published_at);

-- Service Modules indexes
CREATE INDEX IF NOT EXISTS idx_service_modules_service_id ON service_modules(service_id);
CREATE INDEX IF NOT EXISTS idx_service_modules_status ON service_modules(status);
CREATE INDEX IF NOT EXISTS idx_service_modules_type ON service_modules(type);
CREATE INDEX IF NOT EXISTS idx_service_modules_order ON service_modules(order_num);

-- Tenant Services indexes
CREATE INDEX IF NOT EXISTS idx_tenant_services_tenant_id ON tenant_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_services_service_id ON tenant_services(service_id);
CREATE INDEX IF NOT EXISTS idx_tenant_services_status ON tenant_services(status);
CREATE INDEX IF NOT EXISTS idx_tenant_services_provisioned_at ON tenant_services(provisioned_at);

-- Service Integrations indexes
CREATE INDEX IF NOT EXISTS idx_service_integrations_tenant_id ON service_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_integrations_service_id ON service_integrations(service_id);
CREATE INDEX IF NOT EXISTS idx_service_integrations_status ON service_integrations(status);
CREATE INDEX IF NOT EXISTS idx_service_integrations_external_service ON service_integrations(external_service);
CREATE INDEX IF NOT EXISTS idx_service_integrations_last_sync_at ON service_integrations(last_sync_at);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_definitions_updated_at BEFORE UPDATE
    ON service_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_modules_updated_at BEFORE UPDATE
    ON service_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_services_updated_at BEFORE UPDATE
    ON tenant_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_integrations_updated_at BEFORE UPDATE
    ON service_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE DATA (optional for development)
-- ========================================

-- Sample Service Definition: User Management Service
INSERT INTO service_definitions (
    name, display_name, description, category, type, status,
    required_permissions, api_config, ui_config, published_by
) VALUES (
    'user-management',
    'User Management',
    'Comprehensive user management system with role-based access control',
    'Core Platform',
    'INTERNAL',
    'ACTIVE',
    '{"global": ["platform:admin"], "tenant": ["tenant:{tenantId}:user_manage"]}',
    '{"baseUrl": "/api/users", "version": "v1", "endpoints": ["/users", "/users/{id}", "/roles", "/permissions"]}',
    '{"icon": "users", "theme": {"primaryColor": "#3B82F6"}, "branding": {"showLogo": true}}',
    'system'
);

-- Sample Service Module: User Profiles
INSERT INTO service_modules (
    service_id, name, display_name, description, version, type, status,
    required_permissions, form_config, menu_config, route_path, icon, order_num
) VALUES (
    (SELECT id FROM service_definitions WHERE name = 'user-management'),
    'user-profiles',
    'User Profiles',
    'Manage user profiles and personal information',
    '1.0.0',
    'FEATURE',
    'ACTIVE',
    '{"read": ["user:{userId}:read"], "write": ["user:{userId}:write"]}',
    '{"fields": [{"name": "firstName", "type": "text", "required": true}, {"name": "lastName", "type": "text", "required": true}]}',
    '{"displayName": "Profiles", "icon": "user", "path": "/users/profiles", "order": 1}',
    '/users/profiles',
    'user',
    1
) ON CONFLICT (service_id, name) DO NOTHING;

-- Sample Service Definition: Tenant Management Service
INSERT INTO service_definitions (
    name, display_name, description, category, type, status,
    required_permissions, api_config, ui_config, published_by
) VALUES (
    'tenant-management',
    'Tenant Management',
    'Multi-tenant management and administration system',
    'Core Platform',
    'INTERNAL',
    'ACTIVE',
    '{"global": ["platform:admin", "tenant:create"], "tenant": ["tenant:{tenantId}:admin"]}',
    '{"baseUrl": "/api/tenants", "version": "v1", "endpoints": ["/tenants", "/tenants/{id}", "/settings"]}',
    '{"icon": "building", "theme": {"primaryColor": "#10B981"}, "branding": {"showLogo": true}}',
    'system'
);

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE service_definitions IS 'Core registry of all available services in the platform';
COMMENT ON TABLE service_modules IS 'Modules that comprise each service definition';
COMMENT ON TABLE tenant_services IS 'Service instances assigned to specific tenants';
COMMENT ON TABLE service_integrations IS 'External service integrations configured by tenants';

COMMENT ON COLUMN service_definitions.required_permissions IS 'JSON object defining permission requirements';
COMMENT ON COLUMN service_definitions.api_config IS 'JSON object containing API configuration';
COMMENT ON COLUMN service_definitions.ui_config IS 'JSON object containing UI configuration';

COMMENT ON COLUMN tenant_services.configuration IS 'Service-specific configuration for this tenant';
COMMENT ON COLUMN tenant_services.enabled_modules IS 'Array of enabled module IDs for this tenant instance';
COMMENT ON COLUMN tenant_services.rate_limiting IS 'Rate limiting configuration for this tenant';

COMMENT ON COLUMN service_integrations.credentials IS 'Encrypted credentials for external service';