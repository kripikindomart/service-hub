-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'REJECTED', 'ARCHIVED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `avatar_url` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `phone` VARCHAR(191) NULL,
    `last_login_at` DATETIME(3) NULL,
    `password_changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `token_version` INTEGER NOT NULL DEFAULT 0,
    `preferences` JSON NULL,
    `profile_metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `home_tenant_id` VARCHAR(191) NULL,
    `current_tenant_id` VARCHAR(191) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_created_at_idx`(`created_at`),
    INDEX `users_last_login_at_idx`(`last_login_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NULL,
    `type` ENUM('CORE', 'BUSINESS', 'TRIAL') NOT NULL DEFAULT 'BUSINESS',
    `tier` ENUM('STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM') NOT NULL DEFAULT 'STARTER',
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'REJECTED', 'ARCHIVED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `maxUsers` INTEGER NOT NULL DEFAULT 10,
    `maxServices` INTEGER NOT NULL DEFAULT 5,
    `storage_limit_mb` INTEGER NOT NULL DEFAULT 1024,
    `database_name` VARCHAR(191) NOT NULL,
    `database_host` VARCHAR(191) NULL,
    `database_port` INTEGER NOT NULL DEFAULT 3306,
    `primary_color` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `logo_url` VARCHAR(191) NULL,
    `favicon_url` VARCHAR(191) NULL,
    `custom_domain` VARCHAR(191) NULL,
    `settings` JSON NULL,
    `feature_flags` JSON NULL,
    `integrations` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `tenants_slug_key`(`slug`),
    UNIQUE INDEX `tenants_domain_key`(`domain`),
    UNIQUE INDEX `tenants_database_name_key`(`database_name`),
    INDEX `tenants_slug_idx`(`slug`),
    INDEX `tenants_type_idx`(`type`),
    INDEX `tenants_status_idx`(`status`),
    INDEX `tenants_tier_idx`(`tier`),
    UNIQUE INDEX `tenants_name_type_key`(`name`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('SYSTEM', 'TENANT', 'CUSTOM') NOT NULL DEFAULT 'TENANT',
    `level` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'GUEST') NOT NULL DEFAULT 'USER',
    `tenant_id` VARCHAR(191) NULL,
    `is_system_role` BOOLEAN NOT NULL DEFAULT false,
    `is_default_role` BOOLEAN NOT NULL DEFAULT false,
    `max_users` INTEGER NULL,
    `parent_role_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `roles_type_idx`(`type`),
    INDEX `roles_level_idx`(`level`),
    INDEX `roles_tenant_id_idx`(`tenant_id`),
    UNIQUE INDEX `roles_name_tenant_id_key`(`name`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_tenants` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'REJECTED', 'ARCHIVED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `assigned_by` VARCHAR(191) NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `suspension_reason` VARCHAR(191) NULL,
    `suspension_until` DATETIME(3) NULL,
    `suspended_by` VARCHAR(191) NULL,
    `tenant_preferences` JSON NULL,
    `last_accessed_at` DATETIME(3) NULL,
    `access_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_tenants_user_id_idx`(`user_id`),
    INDEX `user_tenants_tenant_id_idx`(`tenant_id`),
    INDEX `user_tenants_role_id_idx`(`role_id`),
    INDEX `user_tenants_status_idx`(`status`),
    UNIQUE INDEX `user_tenants_user_id_tenant_id_key`(`user_id`, `tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `refresh_token` VARCHAR(191) NULL,
    `device_id` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `expires_at` DATETIME(3) NOT NULL,
    `last_accessed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_key`(`token`),
    UNIQUE INDEX `sessions_refresh_token_key`(`refresh_token`),
    INDEX `sessions_user_id_idx`(`user_id`),
    INDEX `sessions_token_idx`(`token`),
    INDEX `sessions_device_id_idx`(`device_id`),
    INDEX `sessions_expires_at_idx`(`expires_at`),
    INDEX `sessions_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `scope` ENUM('OWN', 'TENANT', 'ALL') NOT NULL DEFAULT 'TENANT',
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `is_system_permission` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_name_key`(`name`),
    INDEX `permissions_resource_idx`(`resource`),
    INDEX `permissions_action_idx`(`action`),
    INDEX `permissions_scope_idx`(`scope`),
    INDEX `permissions_category_idx`(`category`),
    UNIQUE INDEX `permissions_resource_action_scope_key`(`resource`, `action`, `scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `granted_by` VARCHAR(191) NULL,

    INDEX `role_permissions_role_id_idx`(`role_id`),
    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bulk_actions` (
    `id` VARCHAR(191) NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `target_ids` JSON NOT NULL,
    `filters` JSON NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `impactLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `total_targets` INTEGER NOT NULL DEFAULT 0,
    `processed_targets` INTEGER NOT NULL DEFAULT 0,
    `success_count` INTEGER NOT NULL DEFAULT 0,
    `failure_count` INTEGER NOT NULL DEFAULT 0,
    `skip_count` INTEGER NOT NULL DEFAULT 0,
    `results` JSON NULL,
    `error_messages` JSON NULL,
    `scheduled_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `executed_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bulk_actions_action_type_idx`(`action_type`),
    INDEX `bulk_actions_entity_type_idx`(`entity_type`),
    INDEX `bulk_actions_status_idx`(`status`),
    INDEX `bulk_actions_created_by_idx`(`created_by`),
    INDEX `bulk_actions_created_at_idx`(`created_at`),
    INDEX `bulk_actions_scheduled_at_idx`(`scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bulk_action_results` (
    `id` VARCHAR(191) NOT NULL,
    `bulk_action_id` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `result` ENUM('SUCCESS', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'SUCCESS',
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `error_message` VARCHAR(191) NULL,
    `processing_time_ms` INTEGER NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bulk_action_results_bulk_action_id_idx`(`bulk_action_id`),
    INDEX `bulk_action_results_entity_id_idx`(`entity_id`),
    INDEX `bulk_action_results_entity_type_idx`(`entity_type`),
    INDEX `bulk_action_results_result_idx`(`result`),
    INDEX `bulk_action_results_processed_at_idx`(`processed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_home_tenant_id_fkey` FOREIGN KEY (`home_tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_current_tenant_id_fkey` FOREIGN KEY (`current_tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_parent_role_id_fkey` FOREIGN KEY (`parent_role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tenants` ADD CONSTRAINT `user_tenants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tenants` ADD CONSTRAINT `user_tenants_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_tenants` ADD CONSTRAINT `user_tenants_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulk_actions` ADD CONSTRAINT `bulk_actions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulk_actions` ADD CONSTRAINT `bulk_actions_executed_by_fkey` FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulk_action_results` ADD CONSTRAINT `bulk_action_results_bulk_action_id_fkey` FOREIGN KEY (`bulk_action_id`) REFERENCES `bulk_actions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
