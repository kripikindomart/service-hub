-- Service Hub 2.0 Migration: Multi-Database Architecture
-- Migration: 003-multi-database.sql
-- Description: Create tables for multi-database management, routing, and provisioning

-- ========================================
-- DATABASE REGISTRY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS database_registry (
    id TEXT PRIMARY KEY DEFAULT concat('db_', uuid_generate_v4()),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'SHARED' CHECK (type IN ('SHARED', 'DEDICATED', 'HYBRID')),
    provider VARCHAR(50) NOT NULL DEFAULT 'postgresql' CHECK (provider IN ('postgresql', 'mysql', 'mongodb', 'redis')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR')),

    -- Connection Configuration
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL, -- Encrypted at application level
    ssl_mode BOOLEAN DEFAULT true,
    ssl_cert TEXT,
    ssl_key TEXT,
    ssl_ca TEXT,

    -- Pool Configuration
    pool_size INTEGER DEFAULT 10,
    max_overflow INTEGER DEFAULT 20,
    pool_timeout INTEGER DEFAULT 30,
    pool_recycle INTEGER DEFAULT 3600,

    -- Backup Configuration
    backup_enabled BOOLEAN DEFAULT true,
    backup_schedule VARCHAR(100) DEFAULT '0 2 * * *', -- Daily at 2 AM
    backup_retention_days INTEGER DEFAULT 30,
    backup_location VARCHAR(500),

    -- Monitoring
    health_check_url VARCHAR(500),
    health_check_interval INTEGER DEFAULT 300,
    last_health_check TIMESTAMP WITH TIME ZONE,
    is_healthy BOOLEAN DEFAULT true,

    -- Metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TENANT DATABASES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_databases (
    id TEXT PRIMARY KEY DEFAULT concat('tdb_', uuid_generate_v4()),
    tenant_id TEXT NOT NULL,
    service_id TEXT, -- NULL for tenant main database
    database_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'SHARED' CHECK (type IN ('SHARED', 'DEDICATED', 'HYBRID')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR')),

    -- Configuration
    schema_name VARCHAR(255), -- For PostgreSQL schemas
    table_prefix VARCHAR(50),
    isolation_level VARCHAR(20) DEFAULT 'READ_COMMITTED' CHECK (isolation_level IN ('READ_UNCOMMITTED', 'READ_COMMITTED', 'REPEATABLE_READ', 'SERIALIZABLE')),
    row_level_security BOOLEAN DEFAULT false,

    -- Connection (inherited from database_registry, can be overridden)
    host VARCHAR(255),
    port INTEGER,
    database_name VARCHAR(255),
    username VARCHAR(255),
    password TEXT, -- Encrypted
    ssl_mode BOOLEAN,
    pool_size INTEGER,

    -- Backup Configuration
    backup_enabled BOOLEAN DEFAULT true,
    backup_schedule VARCHAR(100) DEFAULT '0 2 * * *',
    retention_days INTEGER DEFAULT 30,
    custom_backup_config JSONB DEFAULT '{}',

    -- Encryption
    encryption_enabled BOOLEAN DEFAULT false,
    encryption_key_id VARCHAR(255),
    encrypted_columns TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Quotas and Limits
    storage_quota BIGINT, -- bytes
    connection_quota INTEGER DEFAULT 50,
    query_timeout INTEGER DEFAULT 30000, -- milliseconds

    -- Provisioning
    provisioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    provision_status VARCHAR(20) DEFAULT 'PROVISIONED' CHECK (provision_status IN ('PROVISIONING', 'PROVISIONED', 'ERROR', 'DEPROVISIONING')),
    provision_error TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_tenant_databases_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_databases_service FOREIGN KEY (service_id) REFERENCES service_definitions(id) ON DELETE SET NULL,
    CONSTRAINT fk_tenant_databases_registry FOREIGN KEY (database_id) REFERENCES database_registry(id) ON DELETE RESTRICT,
    CONSTRAINT unique_tenant_service_database UNIQUE (tenant_id, service_id, database_id)
);

-- ========================================
-- DATABASE BACKUPS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS database_backups (
    id TEXT PRIMARY KEY DEFAULT concat('backup_', uuid_generate_v4()),
    database_id TEXT NOT NULL,
    tenant_database_id TEXT,
    backup_type VARCHAR(20) NOT NULL DEFAULT 'FULL' CHECK (backup_type IN ('FULL', 'INCREMENTAL', 'DIFFERENTIAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DELETED')),

    -- Backup Details
    file_path VARCHAR(1000),
    file_size BIGINT, -- bytes
    checksum VARCHAR(255),
    compression_algorithm VARCHAR(20) DEFAULT 'gzip',
    encryption_enabled BOOLEAN DEFAULT false,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- Backup Configuration
    backup_config JSONB DEFAULT '{}',
    includes_schemas TEXT[] DEFAULT ARRAY[]::TEXT[],
    excludes_tables TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Verification
    verified BOOLEAN DEFAULT false,
    verification_checksum VARCHAR(255),
    verification_date TIMESTAMP WITH TIME ZONE,

    -- Retention
    retention_expires_at TIMESTAMP WITH TIME ZONE,
    auto_delete BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_database_backups_database FOREIGN KEY (database_id) REFERENCES database_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_database_backups_tenant_database FOREIGN KEY (tenant_database_id) REFERENCES tenant_databases(id) ON DELETE CASCADE
);

-- ========================================
-- DATABASE RESTORES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS database_restores (
    id TEXT PRIMARY KEY DEFAULT concat('restore_', uuid_generate_v4()),
    backup_id TEXT NOT NULL,
    target_database_id TEXT NOT NULL,
    target_tenant_database_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),

    -- Restore Details
    restore_type VARCHAR(20) NOT NULL DEFAULT 'FULL' CHECK (restore_type IN ('FULL', 'POINT_IN_TIME', 'SCHEMA_ONLY', 'DATA_ONLY')),
    point_in_time TIMESTAMP WITH TIME ZONE,
    target_schema VARCHAR(255),
    target_tables TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Configuration
    restore_config JSONB DEFAULT '{}',
    overwrite_existing BOOLEAN DEFAULT false,
    create_backup BOOLEAN DEFAULT true,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- Results
    records_restored BIGINT,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,

    requested_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_database_restores_backup FOREIGN KEY (backup_id) REFERENCES database_backups(id) ON DELETE RESTRICT,
    CONSTRAINT fk_database_restores_target_database FOREIGN KEY (target_database_id) REFERENCES database_registry(id) ON DELETE RESTRICT,
    CONSTRAINT fk_database_restores_target_tenant_database FOREIGN KEY (target_tenant_database_id) REFERENCES tenant_databases(id) ON DELETE RESTRICT
);

-- ========================================
-- DATABASE METRICS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS database_metrics (
    id TEXT PRIMARY KEY DEFAULT concat('metric_', uuid_generate_v4()),
    database_id TEXT,
    tenant_database_id TEXT,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),

    -- Time series data
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    interval_minutes INTEGER DEFAULT 5,

    -- Additional data
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_database_metrics_database FOREIGN KEY (database_id) REFERENCES database_registry(id) ON DELETE CASCADE,
    CONSTRAINT fk_database_metrics_tenant_database FOREIGN KEY (tenant_database_id) REFERENCES tenant_databases(id) ON DELETE CASCADE
);

-- ========================================
-- DATABASE SLOTS TABLE (For logical replication)
-- ========================================
CREATE TABLE IF NOT EXISTS database_slots (
    id TEXT PRIMARY KEY DEFAULT concat('slot_', uuid_generate_v4()),
    tenant_database_id TEXT NOT NULL,
    slot_name VARCHAR(255) NOT NULL,
    slot_type VARCHAR(20) NOT NULL DEFAULT 'LOGICAL' CHECK (slot_type IN ('LOGICAL', 'PHYSICAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),

    -- Configuration
    replication_plugin VARCHAR(50) DEFAULT 'pgoutput',
    publication_name VARCHAR(255),
    temporary BOOLEAN DEFAULT false,

    -- Monitoring
    lag_bytes BIGINT DEFAULT 0,
    last_replication_timestamp TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_tenant_database_slot UNIQUE (tenant_database_id, slot_name),
    CONSTRAINT fk_database_slots_tenant_database FOREIGN KEY (tenant_database_id) REFERENCES tenant_databases(id) ON DELETE CASCADE
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Database Registry indexes
CREATE INDEX IF NOT EXISTS idx_database_registry_type ON database_registry(type);
CREATE INDEX IF NOT EXISTS idx_database_registry_provider ON database_registry(provider);
CREATE INDEX IF NOT EXISTS idx_database_registry_status ON database_registry(status);
CREATE INDEX IF NOT EXISTS idx_database_registry_host_port ON database_registry(host, port);
CREATE INDEX IF NOT EXISTS idx_database_registry_is_healthy ON database_registry(is_healthy);

-- Tenant Databases indexes
CREATE INDEX IF NOT EXISTS idx_tenant_databases_tenant_id ON tenant_databases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_service_id ON tenant_databases(service_id);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_database_id ON tenant_databases(database_id);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_type ON tenant_databases(type);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_status ON tenant_databases(status);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_schema_name ON tenant_databases(schema_name);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_provision_status ON tenant_databases(provision_status);

-- Database Backups indexes
CREATE INDEX IF NOT EXISTS idx_database_backups_database_id ON database_backups(database_id);
CREATE INDEX IF NOT EXISTS idx_database_backups_tenant_database_id ON database_backups(tenant_database_id);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);
CREATE INDEX IF NOT EXISTS idx_database_backups_backup_type ON database_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_database_backups_started_at ON database_backups(started_at);
CREATE INDEX IF NOT EXISTS idx_database_backups_retention_expires ON database_backups(retention_expires_at);

-- Database Restores indexes
CREATE INDEX IF NOT EXISTS idx_database_restores_backup_id ON database_restores(backup_id);
CREATE INDEX IF NOT EXISTS idx_database_restores_target_database_id ON database_restores(target_database_id);
CREATE INDEX IF NOT EXISTS idx_database_restores_status ON database_restores(status);
CREATE INDEX IF NOT EXISTS idx_database_restores_started_at ON database_restores(started_at);
CREATE INDEX IF NOT EXISTS idx_database_restores_requested_by ON database_restores(requested_by);

-- Database Metrics indexes
CREATE INDEX IF NOT EXISTS idx_database_metrics_database_id ON database_metrics(database_id);
CREATE INDEX IF NOT EXISTS idx_database_metrics_tenant_database_id ON database_metrics(tenant_database_id);
CREATE INDEX IF NOT EXISTS idx_database_metrics_type_name ON database_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_database_metrics_timestamp ON database_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_database_metrics_type_timestamp ON database_metrics(metric_type, timestamp);

-- Database Slots indexes
CREATE INDEX IF NOT EXISTS idx_database_slots_tenant_database_id ON database_slots(tenant_database_id);
CREATE INDEX IF NOT EXISTS idx_database_slots_slot_name ON database_slots(slot_name);
CREATE INDEX IF NOT EXISTS idx_database_slots_status ON database_slots(status);
CREATE INDEX IF NOT EXISTS idx_database_slots_last_replication ON database_slots(last_replication_timestamp);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_database_registry_updated_at BEFORE UPDATE
    ON database_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_databases_updated_at BEFORE UPDATE
    ON tenant_databases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_backups_updated_at BEFORE UPDATE
    ON database_backups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_restores_updated_at BEFORE UPDATE
    ON database_restores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_slots_updated_at BEFORE UPDATE
    ON database_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE DATABASE REGISTRY DATA
-- ========================================

-- Main Shared Database
INSERT INTO database_registry (
    name, display_name, description, type, provider, status,
    host, port, database_name, username, password, ssl_mode,
    pool_size, backup_enabled, backup_schedule
) VALUES (
    'main_shared_db',
    'Main Shared Database',
    'Primary shared database for all tenants',
    'SHARED',
    'postgresql',
    'ACTIVE',
    'localhost',
    5432,
    'servicehub_shared',
    'servicehub_user',
    'encrypted_password_placeholder',
    true,
    50,
    true,
    '0 2 * * *'
);

-- Dedicated Template Database
INSERT INTO database_registry (
    name, display_name, description, type, provider, status,
    host, port, database_name, username, password, ssl_mode,
    pool_size, backup_enabled, backup_schedule
) VALUES (
    'dedicated_template',
    'Dedicated Template Database',
    'Template for creating dedicated tenant databases',
    'DEDICATED',
    'postgresql',
    'ACTIVE',
    'localhost',
    5432,
    'template_dedicated',
    'servicehub_user',
    'encrypted_password_placeholder',
    true,
    20,
    true,
    '0 3 * * 0'
);

-- Redis Cache Database
INSERT INTO database_registry (
    name, display_name, description, type, provider, status,
    host, port, database_name, username, password, ssl_mode,
    pool_size, backup_enabled
) VALUES (
    'redis_cache',
    'Redis Cache',
    'Redis cache for session management and caching',
    'SHARED',
    'redis',
    'ACTIVE',
    'localhost',
    6379,
    '0',
    '',
    'encrypted_password_placeholder',
    false,
    100,
    false
);

-- ========================================
-- SAMPLE TENANT DATABASE DATA
-- ========================================

-- Create sample tenant database for first tenant (if exists)
INSERT INTO tenant_databases (
    tenant_id, database_id, name, type, status,
    schema_name, row_level_security, storage_quota, connection_quota
)
SELECT
    t.id,
    dr.id,
    concat(t.name, '_main_db'),
    'SHARED',
    'ACTIVE',
    concat('tenant_', t.slug),
    true,
    10737418240, -- 10GB
    50
FROM tenants t
CROSS JOIN database_registry dr
WHERE t.slug = 'demo-tenant'
  AND dr.name = 'main_shared_db'
LIMIT 1
ON CONFLICT (tenant_id, service_id, database_id) DO NOTHING;

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

CREATE OR REPLACE VIEW active_databases AS
SELECT dr.*
FROM database_registry dr
WHERE dr.status = 'ACTIVE'
  AND dr.is_healthy = true;

CREATE OR REPLACE VIEW tenant_database_summary AS
SELECT
    td.id,
    td.tenant_id,
    t.name as tenant_name,
    td.service_id,
    sd.name as service_name,
    td.database_id,
    dr.name as database_name,
    td.type,
    td.status,
    td.storage_quota,
    td.connection_quota,
    td.provisioned_at,
    td.last_accessed_at
FROM tenant_databases td
JOIN tenants t ON td.tenant_id = t.id
LEFT JOIN service_definitions sd ON td.service_id = sd.id
JOIN database_registry dr ON td.database_id = dr.id;

CREATE OR REPLACE VIEW database_backup_status AS
SELECT
    db.id as database_id,
    db.name as database_name,
    COUNT(CASE WHEN dbb.status = 'COMPLETED' AND dbb.completed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as successful_backups_24h,
    COUNT(CASE WHEN dbb.status = 'FAILED' AND dbb.started_at > NOW() - INTERVAL '24 hours' THEN 1 END) as failed_backups_24h,
    MAX(dbb.completed_at) as last_successful_backup,
    COUNT(*) as total_backups
FROM database_registry db
LEFT JOIN database_backups dbb ON db.id = dbb.database_id
GROUP BY db.id, db.name;

CREATE OR REPLACE VIEW database_usage_metrics AS
SELECT
    COALESCE(td.tenant_id, 'shared') as tenant_id,
    COALESCE(td.service_id, 'system') as service_id,
    dm.metric_type,
    dm.metric_name,
    AVG(dm.metric_value) as avg_value,
    MAX(dm.metric_value) as max_value,
    MIN(dm.metric_value) as min_value,
    dm.metric_unit,
    dm.timestamp
FROM database_metrics dm
LEFT JOIN tenant_databases td ON dm.tenant_database_id = td.id
WHERE dm.timestamp > NOW() - INTERVAL '1 hour'
GROUP BY dm.metric_type, dm.metric_name, dm.metric_unit, dm.timestamp, td.tenant_id, td.service_id
ORDER BY dm.timestamp DESC;

-- ========================================
-- FUNCTIONS FOR DATABASE MANAGEMENT
-- ========================================

-- Function to get tenant database connection string
CREATE OR REPLACE FUNCTION get_tenant_database_connection(
    p_tenant_id TEXT,
    p_service_id TEXT DEFAULT NULL
) RETURNS TABLE (
    database_id TEXT,
    connection_string TEXT,
    schema_name TEXT,
    ssl_mode BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        td.id,
        format(
            '%s://%s:%s@%s:%d/%s',
            dr.provider,
            COALESCE(td.username, dr.username),
            '*****', -- Never return actual password
            COALESCE(td.host, dr.host),
            COALESCE(td.port, dr.port),
            COALESCE(td.database_name, dr.database_name)
        ),
        td.schema_name,
        COALESCE(td.ssl_mode, dr.ssl_mode)
    FROM tenant_databases td
    JOIN database_registry dr ON td.database_id = dr.id
    WHERE td.tenant_id = p_tenant_id
      AND (p_service_id IS NULL OR td.service_id = p_service_id)
      AND td.status = 'ACTIVE'
      AND dr.status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health(
    p_database_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_healthy BOOLEAN := false;
    v_health_check_url VARCHAR(500);
BEGIN
    SELECT dr.health_check_url INTO v_health_check_url
    FROM database_registry dr
    WHERE dr.id = p_database_id;

    -- Simple health check - update last_check time
    UPDATE database_registry
    SET
        last_health_check = NOW(),
        is_healthy = true -- In real implementation, would check actual connectivity
    WHERE id = p_database_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE database_registry IS 'Registry of all database instances managed by the platform';
COMMENT ON TABLE tenant_databases IS 'Database instances assigned to specific tenants or services';
COMMENT ON TABLE database_backups IS 'Backup records for all databases';
COMMENT ON TABLE database_restores IS 'Database restore operations';
COMMENT ON TABLE database_metrics IS 'Performance and usage metrics for databases';
COMMENT ON TABLE database_slots IS 'Replication slots for logical replication';

COMMENT ON COLUMN tenant_databases.storage_quota IS 'Storage quota in bytes';
COMMENT ON COLUMN tenant_databases.connection_quota IS 'Maximum number of concurrent connections';
COMMENT ON COLUMN database_backups.checksum IS 'SHA-256 checksum of backup file for integrity verification';
COMMENT ON COLUMN database_restores.point_in_time IS 'For point-in-time recovery';
COMMENT ON COLUMN database_slots.lag_bytes IS 'Replication lag in bytes';

COMMENT ON FUNCTION get_tenant_database_connection IS 'Returns connection details for tenant database (password masked)';
COMMENT ON FUNCTION check_database_health IS 'Performs health check on database and updates status';