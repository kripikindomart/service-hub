# Bulk Actions & Data Lifecycle Management

## Overview

Dokumen ini mendefinisikan implementasi bulk actions (CRUD operations), status management (active/inactive/suspend), dan data lifecycle management (soft delete, hard delete, archive, restore) untuk seluruh platform.

## Data Lifecycle States

### Entity Status Enum
```sql
-- Universal status enum for most entities
CREATE TYPE entity_status AS ENUM (
    'DRAFT',          -- Entity created but not yet active
    'ACTIVE',         -- Entity is active and fully functional
    'INACTIVE',       -- Temporarily disabled (can be reactivated)
    'SUSPENDED',      -- Suspended due to violations or maintenance
    'PENDING',        -- Pending approval or verification
    'REJECTED',       -- Rejected during review process
    'ARCHIVED',       -- Archived and not normally visible
    'DELETED'         -- Soft deleted (visible only to admins)
);
```

### Data Lifecycle States
```sql
-- For deleted entities tracking
CREATE TYPE deletion_status AS ENUM (
    'SOFT_DELETED',   -- Soft deleted, can be restored
    'HARD_DELETED',   -- Permanently deleted
    'ARCHIVED'        -- Moved to archive storage
);
```

## Enhanced User Management with Bulk Actions

### Enhanced Users Table
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,

    -- Status Management
    status entity_status DEFAULT 'PENDING',
    deletion_status deletion_status NULL,
    deleted_at TIMESTAMP NULL,
    deleted_by VARCHAR(36) NULL,
    archived_at TIMESTAMP NULL,
    archived_by VARCHAR(36) NULL,

    -- Status Details
    suspension_reason TEXT,
    suspension_until TIMESTAMP NULL,
    suspended_by VARCHAR(36) NULL,
    rejection_reason TEXT,
    rejected_by VARCHAR(36) NULL,

    -- Verification
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,

    -- Profile Information
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    phone VARCHAR(20),

    -- Security
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,

    -- Preferences (JSON - Valid Usage)
    preferences JSON,
    profile_metadata JSON,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),

    -- Indexes
    INDEX idx_user_email (email),
    INDEX idx_user_status (status),
    INDEX idx_user_deletion_status (deletion_status),
    INDEX idx_user_created_at (created_at),
    INDEX idx_user_last_login (last_login_at),
    INDEX idx_user_suspension (suspension_until),
    INDEX idx_user_deleted_at (deleted_at),
    INDEX idx_user_archived_at (archived_at),

    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id),
    FOREIGN KEY (suspended_by) REFERENCES users(id),
    FOREIGN KEY (rejected_by) REFERENCES users(id),
    FOREIGN KEY (archived_by) REFERENCES users(id)
);
```

### Bulk Actions Table
```sql
CREATE TABLE bulk_actions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    action_type VARCHAR(50) NOT NULL,        -- 'activate', 'deactivate', 'suspend', 'delete', 'archive', 'restore'
    entity_type VARCHAR(50) NOT NULL,        -- 'users', 'tenants', 'services', 'roles'
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',

    -- Action Details
    total_entities INT NOT NULL DEFAULT 0,
    processed_entities INT NOT NULL DEFAULT 0,
    successful_entities INT NOT NULL DEFAULT 0,
    failed_entities INT NOT NULL DEFAULT 0,

    -- Action Parameters
    parameters JSON,                         -- Action-specific parameters
    filters JSON,                           -- Applied filters

    -- Execution Details
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT,

    -- Audit
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_bulk_action_type (action_type),
    INDEX idx_bulk_action_entity (entity_type),
    INDEX idx_bulk_action_status (status),
    INDEX idx_bulk_action_created_by (created_by),
    INDEX idx_bulk_action_created_at (created_at),

    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Bulk Action Results (detailed results for each entity)
CREATE TABLE bulk_action_results (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    bulk_action_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,

    -- Result Status
    status ENUM('SUCCESS', 'FAILED', 'SKIPPED') NOT NULL,
    message TEXT,
    old_values JSON,
    new_values JSON,

    -- Timing
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    FOREIGN KEY (bulk_action_id) REFERENCES bulk_actions(id) ON DELETE CASCADE,
    INDEX idx_bulk_result_action (bulk_action_id),
    INDEX idx_bulk_result_entity (entity_id, entity_type),
    INDEX idx_bulk_result_status (status)
);
```

## Bulk Actions Service Implementation

### Backend Service
```typescript
// src/services/bulk-actions/bulk-actions.service.ts
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bull';

export interface BulkActionRequest {
    actionType: 'activate' | 'deactivate' | 'suspend' | 'unsuspend' | 'soft_delete' | 'hard_delete' | 'archive' | 'restore';
    entityType: 'users' | 'tenants' | 'services' | 'roles';
    entityIds: string[];
    parameters?: any;
    filters?: any;
    reason?: string;
    scheduledFor?: Date;
}

export interface BulkActionResponse {
    bulkActionId: string;
    status: string;
    totalEntities: number;
    estimatedDuration: number;
}

export class BulkActionsService {
    constructor(
        private prisma: PrismaClient,
        private actionQueue: Queue
    ) {}

    async createBulkAction(
        request: BulkActionRequest,
        userId: string
    ): Promise<BulkActionResponse> {
        // 1. Validate request
        await this.validateBulkActionRequest(request);

        // 2. Get entity IDs if filters provided
        let entityIds = request.entityIds;
        if (request.filters && entityIds.length === 0) {
            entityIds = await this.getEntityIdsByFilters(request.entityType, request.filters);
        }

        if (entityIds.length === 0) {
            throw new Error('No entities found for the specified criteria');
        }

        // 3. Create bulk action record
        const bulkAction = await this.prisma.bulkAction.create({
            data: {
                actionType: request.actionType,
                entityType: request.entityType,
                status: 'PENDING',
                totalEntities: entityIds.length,
                parameters: request.parameters,
                filters: request.filters,
                createdBy: userId
            }
        });

        // 4. Add to queue for processing
        await this.actionQueue.add('process-bulk-action', {
            bulkActionId: bulkAction.id,
            entityIds,
            actionType: request.actionType,
            entityType: request.entityType,
            parameters: request.parameters,
            reason: request.reason,
            userId
        }, {
            delay: request.scheduledFor ? request.scheduledFor.getTime() - Date.now() : 0,
            attempts: 3,
            backoff: 'exponential'
        });

        return {
            bulkActionId: bulkAction.id,
            status: bulkAction.status,
            totalEntities: entityIds.length,
            estimatedDuration: this.calculateEstimatedDuration(entityIds.length, request.actionType)
        };
    }

    async getBulkActionStatus(bulkActionId: string, userId: string): Promise<any> {
        const bulkAction = await this.prisma.bulkAction.findFirst({
            where: {
                id: bulkActionId,
                createdBy: userId // User can only see their own actions
            },
            include: {
                results: {
                    take: 100,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!bulkAction) {
            throw new Error('Bulk action not found');
        }

        return {
            ...bulkAction,
            progress: this.calculateProgress(bulkAction),
            results: bulkAction.results.map(result => ({
                entityId: result.entityId,
                status: result.status,
                message: result.message,
                completedAt: result.completedAt
            }))
        };
    }

    async cancelBulkAction(bulkActionId: string, userId: string): Promise<void> {
        const bulkAction = await this.prisma.bulkAction.findFirst({
            where: {
                id: bulkActionId,
                createdBy: userId,
                status: { in: ['PENDING', 'IN_PROGRESS'] }
            }
        });

        if (!bulkAction) {
            throw new Error('Cannot cancel bulk action: not found or already completed');
        }

        // Update status
        await this.prisma.bulkAction.update({
            where: { id: bulkActionId },
            data: { status: 'CANCELLED' }
        });

        // Remove from queue
        const jobs = await this.actionQueue.getJobs(['waiting', 'active']);
        for (const job of jobs) {
            if (job.data.bulkActionId === bulkActionId) {
                await job.remove();
            }
        }
    }

    private async validateBulkActionRequest(request: BulkActionRequest): Promise<void> {
        // Validate user permissions
        // Validate action type for entity type
        // Check if entities exist
        // Validate parameters
    }

    private async getEntityIdsByFilters(entityType: string, filters: any): Promise<string[]> {
        switch (entityType) {
            case 'users':
                return await this.getUserIdsByFilters(filters);
            case 'tenants':
                return await this.getTenantIdsByFilters(filters);
            case 'services':
                return await this.getServiceIdsByFilters(filters);
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    private calculateEstimatedDuration(entityCount: number, actionType: string): number {
        // Estimate processing time based on action complexity and entity count
        const baseTimePerEntity = {
            'activate': 50,      // 50ms per entity
            'deactivate': 50,
            'suspend': 100,
            'soft_delete': 75,
            'hard_delete': 200,
            'archive': 150,
            'restore': 100
        };

        return entityCount * (baseTimePerEntity[actionType] || 100);
    }

    private calculateProgress(bulkAction: any): number {
        if (bulkAction.totalEntities === 0) return 0;
        return Math.round((bulkAction.processedEntities / bulkAction.totalEntities) * 100);
    }
}
```

### Bulk Action Processor
```typescript
// src/services/bulk-actions/bulk-action-processor.ts
import { Job, Queue } from 'bull';
import { PrismaClient } from '@prisma/client';

export class BulkActionProcessor {
    constructor(
        private prisma: PrismaClient,
        private actionQueue: Queue
    ) {}

    async processBulkAction(job: Job): Promise<void> {
        const { bulkActionId, entityIds, actionType, entityType, parameters, reason, userId } = job.data;

        try {
            // Update bulk action status
            await this.updateBulkActionStatus(bulkActionId, 'IN_PROGRESS');

            // Process each entity
            for (const entityId of entityIds) {
                try {
                    await this.processEntityAction(
                        entityId,
                        actionType,
                        entityType,
                        parameters,
                        reason,
                        userId,
                        bulkActionId
                    );

                    await this.recordBulkActionResult(bulkActionId, entityId, entityType, 'SUCCESS');
                } catch (error) {
                    await this.recordBulkActionResult(
                        bulkActionId,
                        entityId,
                        entityType,
                        'FAILED',
                        error.message
                    );
                }
            }

            // Mark as completed
            await this.updateBulkActionStatus(bulkActionId, 'COMPLETED');

        } catch (error) {
            await this.updateBulkActionStatus(bulkActionId, 'FAILED', error.message);
            throw error;
        }
    }

    private async processEntityAction(
        entityId: string,
        actionType: string,
        entityType: string,
        parameters: any,
        reason: string,
        userId: string,
        bulkActionId: string
    ): Promise<void> {
        switch (entityType) {
            case 'users':
                await this.processUserAction(entityId, actionType, parameters, reason, userId);
                break;
            case 'tenants':
                await this.processTenantAction(entityId, actionType, parameters, reason, userId);
                break;
            case 'services':
                await this.processServiceAction(entityId, actionType, parameters, reason, userId);
                break;
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    private async processUserAction(
        userId: string,
        actionType: string,
        parameters: any,
        reason: string,
        performedBy: string
    ): Promise<void> {
        const updateData: any = {
            updatedBy: performedBy,
            updatedAt: new Date()
        };

        switch (actionType) {
            case 'activate':
                updateData.status = 'ACTIVE';
                updateData.deletion_status = null;
                updateData.deleted_at = null;
                updateData.deleted_by = null;
                updateData.suspension_reason = null;
                updateData.suspension_until = null;
                updateData.suspended_by = null;
                break;

            case 'deactivate':
                updateData.status = 'INACTIVE';
                updateData.deletion_status = null;
                break;

            case 'suspend':
                updateData.status = 'SUSPENDED';
                updateData.suspension_reason = reason || 'No reason provided';
                updateData.suspension_until = parameters.suspensionUntil || null;
                updateData.suspended_by = performedBy;
                break;

            case 'unsuspend':
                updateData.status = 'ACTIVE';
                updateData.suspension_reason = null;
                updateData.suspension_until = null;
                updateData.suspended_by = null;
                break;

            case 'soft_delete':
                updateData.status = 'DELETED';
                updateData.deletion_status = 'SOFT_DELETED';
                updateData.deleted_at = new Date();
                updateData.deleted_by = performedBy;
                break;

            case 'hard_delete':
                // This should be a separate, more careful process
                throw new Error('Hard delete must be performed through dedicated endpoint');

            case 'archive':
                updateData.status = 'ARCHIVED';
                updateData.archived_at = new Date();
                updateData.archived_by = performedBy;
                break;

            case 'restore':
                if (parameters.fromStatus) {
                    updateData.status = parameters.fromStatus;
                } else {
                    updateData.status = 'ACTIVE';
                }
                updateData.deletion_status = null;
                updateData.deleted_at = null;
                updateData.deleted_by = null;
                updateData.archived_at = null;
                updateData.archived_by = null;
                break;

            default:
                throw new Error(`Unsupported action type: ${actionType}`);
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        // Log the action
        await this.logEntityAction('users', userId, actionType, reason, performedBy);
    }

    private async updateBulkActionStatus(
        bulkActionId: string,
        status: string,
        errorMessage?: string
    ): Promise<void> {
        const updateData: any = {
            status,
            updatedAt: new Date()
        };

        if (status === 'IN_PROGRESS') {
            updateData.startedAt = new Date();
        } else if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
            updateData.completedAt = new Date();
        }

        if (errorMessage) {
            updateData.errorMessage = errorMessage;
        }

        await this.prisma.bulkAction.update({
            where: { id: bulkActionId },
            data: updateData
        });
    }

    private async recordBulkActionResult(
        bulkActionId: string,
        entityId: string,
        entityType: string,
        status: string,
        message?: string
    ): Promise<void> {
        await this.prisma.bulkActionResult.create({
            data: {
                bulkActionId,
                entityId,
                entityType,
                status: status as any,
                message,
                startedAt: new Date(),
                completedAt: new Date()
            }
        });

        // Update counters
        const updateData: any = {
            processedEntities: { increment: 1 }
        };

        if (status === 'SUCCESS') {
            updateData.successfulEntities = { increment: 1 };
        } else if (status === 'FAILED') {
            updateData.failedEntities = { increment: 1 };
        }

        await this.prisma.bulkAction.update({
            where: { id: bulkActionId },
            data: updateData
        });
    }

    private async logEntityAction(
        entityType: string,
        entityId: string,
        actionType: string,
        reason: string,
        performedBy: string
    ): Promise<void> {
        // Log to audit trail
        await this.prisma.auditLog.create({
            data: {
                userId: performedBy,
                action: `bulk.${actionType}`,
                resource: entityType,
                resourceId: entityId,
                metadata: {
                    reason,
                    bulkAction: true
                },
                severity: this.getActionSeverity(actionType)
            }
        });
    }

    private getActionSeverity(actionType: string): string {
        const severityMap = {
            'activate': 'LOW',
            'deactivate': 'MEDIUM',
            'suspend': 'HIGH',
            'unsuspend': 'MEDIUM',
            'soft_delete': 'HIGH',
            'hard_delete': 'CRITICAL',
            'archive': 'MEDIUM',
            'restore': 'MEDIUM'
        };

        return severityMap[actionType] || 'MEDIUM';
    }
}
```

## API Endpoints for Bulk Actions

### Bulk Actions Controller
```typescript
// src/controllers/bulk-actions.controller.ts
import { Request, Response } from 'express';
import { BulkActionsService } from '../services/bulk-actions/bulk-actions.service';
import { requirePermission } from '../middleware/auth.middleware';

export class BulkActionsController {
    constructor(private bulkActionsService: BulkActionsService) {}

    // Create bulk action
    @requirePermission('bulk_action:create')
    async createBulkAction(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.userId;
            const result = await this.bulkActionsService.createBulkAction(req.body, userId);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Bulk action created successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get bulk action status
    @requirePermission('bulk_action:read')
    async getBulkActionStatus(req: Request, res: Response): Promise<void> {
        try {
            const { bulkActionId } = req.params;
            const userId = req.user.userId;

            const result = await this.bulkActionsService.getBulkActionStatus(bulkActionId, userId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    }

    // List user's bulk actions
    @requirePermission('bulk_action:read')
    async listBulkActions(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 20, status, entityType, actionType } = req.query;

            const whereClause: any = {
                createdBy: userId
            };

            if (status) whereClause.status = status;
            if (entityType) whereClause.entityType = entityType;
            if (actionType) whereClause.actionType = actionType;

            const [bulkActions, total] = await Promise.all([
                this.prisma.bulkAction.findMany({
                    where: whereClause,
                    include: {
                        _count: {
                            select: { results: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: parseInt(limit as string),
                    skip: (parseInt(page as string) - 1) * parseInt(limit as string)
                }),
                this.prisma.bulkAction.count({ where: whereClause })
            ]);

            res.json({
                success: true,
                data: {
                    bulkActions,
                    pagination: {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit as string))
                    }
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    // Cancel bulk action
    @requirePermission('bulk_action:cancel')
    async cancelBulkAction(req: Request, res: Response): Promise<void> {
        try {
            const { bulkActionId } = req.params;
            const userId = req.user.userId;

            await this.bulkActionsService.cancelBulkAction(bulkActionId, userId);

            res.json({
                success: true,
                message: 'Bulk action cancelled successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    // Get bulk action templates (predefined filters)
    @requirePermission('bulk_action:read')
    async getBulkActionTemplates(req: Request, res: Response): Promise<void> {
        try {
            const { entityType } = req.params;

            const templates = await this.getBulkActionTemplates(entityType);

            res.json({
                success: true,
                data: templates
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    // Hard delete (permanent deletion) - separate endpoint with extra permissions
    @requirePermission('bulk_action:hard_delete')
    async hardDeleteEntities(req: Request, res: Response): Promise<void> {
        try {
            const { entityType, entityIds, reason } = req.body;
            const userId = req.user.userId;

            // This should have additional confirmation steps
            const result = await this.bulkActionsService.createBulkAction({
                actionType: 'hard_delete',
                entityType,
                entityIds,
                reason,
                parameters: { requiresConfirmation: true }
            }, userId);

            res.json({
                success: true,
                data: result,
                message: 'Hard delete action created. Please confirm to proceed.'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}
```

### Routes Definition
```typescript
// src/routes/bulk-actions.routes.ts
import express from 'express';
import { BulkActionsController } from '../controllers/bulk-actions.controller';

const router = express.Router();
const bulkActionsController = new BulkActionsController();

// Bulk action management
router.post('/actions', bulkActionsController.createBulkAction.bind(bulkActionsController));
router.get('/actions', bulkActionsController.listBulkActions.bind(bulkActionsController));
router.get('/actions/:bulkActionId', bulkActionsController.getBulkActionStatus.bind(bulkActionsController));
router.delete('/actions/:bulkActionId', bulkActionsController.cancelBulkAction.bind(bulkActionsController));

// Templates
router.get('/templates/:entityType', bulkActionsController.getBulkActionTemplates.bind(bulkActionsController));

// Hard delete (special permissions required)
router.post('/hard-delete', bulkActionsController.hardDeleteEntities.bind(bulkActionsController));

export default router;
```

## Frontend Bulk Actions Implementation

### Bulk Actions Store (Zustand)
```typescript
// frontend/src/stores/bulkActionsStore.ts
interface BulkAction {
    id: string;
    actionType: string;
    entityType: string;
    status: string;
    totalEntities: number;
    processedEntities: number;
    successfulEntities: number;
    failedEntities: number;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
}

interface BulkActionsState {
    // State
    bulkActions: BulkAction[];
    currentAction: BulkAction | null;
    isLoading: boolean;

    // Actions
    createBulkAction: (request: BulkActionRequest) => Promise<void>;
    getBulkActionStatus: (bulkActionId: string) => Promise<void>;
    cancelBulkAction: (bulkActionId: string) => Promise<void>;
    listBulkActions: (filters?: any) => Promise<void>;
    refreshCurrentAction: () => Promise<void>;
}

export const useBulkActionsStore = create<BulkActionsState>((set, get) => ({
    bulkActions: [],
    currentAction: null,
    isLoading: false,

    createBulkAction: async (request: BulkActionRequest) => {
        set({ isLoading: true });

        try {
            const response = await fetch('/api/v1/bulk-actions/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error('Failed to create bulk action');
            }

            const result = await response.json();
            const bulkAction = result.data;

            set(state => ({
                currentAction: bulkAction,
                bulkActions: [bulkAction, ...state.bulkActions],
                isLoading: false
            }));

            // Start polling for updates
            get().startPolling(bulkAction.id);

        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    getBulkActionStatus: async (bulkActionId: string) => {
        try {
            const response = await fetch(`/api/v1/bulk-actions/actions/${bulkActionId}`, {
                headers: {
                    'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get bulk action status');
            }

            const result = await response.json();
            const bulkAction = result.data;

            set(state => ({
                currentAction: bulkAction.id === state.currentAction?.id ? bulkAction : state.currentAction,
                bulkActions: state.bulkActions.map(action =>
                    action.id === bulkActionId ? bulkAction : action
                )
            }));

        } catch (error) {
            console.error('Failed to get bulk action status:', error);
        }
    },

    cancelBulkAction: async (bulkActionId: string) => {
        try {
            const response = await fetch(`/api/v1/bulk-actions/actions/${bulkActionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel bulk action');
            }

            await get().getBulkActionStatus(bulkActionId);

        } catch (error) {
            throw error;
        }
    },

    listBulkActions: async (filters?: any) => {
        set({ isLoading: true });

        try {
            const queryParams = new URLSearchParams(filters as any).toString();
            const response = await fetch(`/api/v1/bulk-actions/actions?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to list bulk actions');
            }

            const result = await response.json();
            const { bulkActions } = result.data;

            set({
                bulkActions,
                isLoading: false
            });

        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    refreshCurrentAction: async () => {
        const { currentAction } = get();
        if (currentAction) {
            await get().getBulkActionStatus(currentAction.id);
        }
    },

    startPolling: (bulkActionId: string) => {
        const interval = setInterval(async () => {
            const state = get();
            if (state.currentAction?.status === 'COMPLETED' ||
                state.currentAction?.status === 'FAILED' ||
                state.currentAction?.status === 'CANCELLED') {
                clearInterval(interval);
                return;
            }

            await state.getBulkActionStatus(bulkActionId);
        }, 2000); // Poll every 2 seconds
    }
}));
```

### Bulk Actions Component
```typescript
// frontend/src/components/bulk-actions/BulkActionsPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { useBulkActionsStore } from '@/stores/bulkActionsStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle, Play, Square } from 'lucide-react';

interface BulkActionsPanelProps {
    entityType: string;
    selectedEntities: string[];
    onSelectionChange?: (selected: string[]) => void;
}

export function BulkActionsPanel({ entityType, selectedEntities, onSelectionChange }: BulkActionsPanelProps) {
    const {
        currentAction,
        isLoading,
        createBulkAction,
        cancelBulkAction,
        refreshCurrentAction
    } = useBulkActionsStore();

    const [actionType, setActionType] = useState('activate');
    const [reason, setReason] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Refresh current action periodically
    useEffect(() => {
        if (currentAction && currentAction.status === 'IN_PROGRESS') {
            const interval = setInterval(refreshCurrentAction, 2000);
            return () => clearInterval(interval);
        }
    }, [currentAction, refreshCurrentAction]);

    const handleExecuteBulkAction = async () => {
        try {
            await createBulkAction({
                actionType,
                entityType,
                entityIds: selectedEntities,
                reason: reason || undefined
            });

            setShowConfirmDialog(false);
            setReason('');

        } catch (error) {
            console.error('Failed to execute bulk action:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'FAILED':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'IN_PROGRESS':
                return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'CANCELLED':
                return <Square className="h-4 w-4 text-gray-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'FAILED':
                return 'bg-red-100 text-red-800';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getActionLabel = (action: string) => {
        const labels = {
            'activate': 'Activate',
            'deactivate': 'Deactivate',
            'suspend': 'Suspend',
            'unsuspend': 'Unsuspend',
            'soft_delete': 'Delete',
            'hard_delete': 'Permanently Delete',
            'archive': 'Archive',
            'restore': 'Restore'
        };
        return labels[action] || action;
    };

    if (selectedEntities.length === 0 && !currentAction) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                        Select entities to perform bulk actions
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Current Action Status */}
            {currentAction && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                {getStatusIcon(currentAction.status)}
                                Bulk Action: {getActionLabel(currentAction.actionType)}
                            </span>
                            <Badge className={getStatusColor(currentAction.status)}>
                                {currentAction.status}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="text-gray-500">Total Entities</div>
                                <div className="font-semibold">{currentAction.totalEntities}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Successful</div>
                                <div className="font-semibold text-green-600">
                                    {currentAction.successfulEntities}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Failed</div>
                                <div className="font-semibold text-red-600">
                                    {currentAction.failedEntities}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Progress</div>
                                <div className="font-semibold">
                                    {Math.round((currentAction.processedEntities / currentAction.totalEntities) * 100)}%
                                </div>
                            </div>
                        </div>

                        <Progress
                            value={(currentAction.processedEntities / currentAction.totalEntities) * 100}
                            className="w-full"
                        />

                        {currentAction.errorMessage && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {currentAction.errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {currentAction.status === 'IN_PROGRESS' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelBulkAction(currentAction.id)}
                                disabled={isLoading}
                            >
                                Cancel Action
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Bulk Action Controls */}
            {selectedEntities.length > 0 && !currentAction && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Bulk Actions ({selectedEntities.length} selected)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['activate', 'deactivate', 'suspend', 'soft_delete'].map((action) => (
                                <Button
                                    key={action}
                                    variant={actionType === action ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setActionType(action)}
                                    className="text-xs"
                                >
                                    {getActionLabel(action)}
                                </Button>
                            ))}
                        </div>

                        {['suspend', 'soft_delete'].includes(actionType) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason {actionType === 'soft_delete' ? '(Optional)' : '(Required)'}
                                </label>
                                <textarea
                                    className="w-full p-2 border rounded-md text-sm"
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter reason for this action..."
                                    required={actionType === 'suspend'}
                                />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={() => setShowConfirmDialog(true)}
                                disabled={isLoading || selectedEntities.length === 0}
                                className="flex items-center gap-2"
                            >
                                <Play className="h-4 w-4" />
                                Execute {getActionLabel(actionType)}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => onSelectionChange?.([])}
                            >
                                Clear Selection
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>Confirm Bulk Action</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>
                                Are you sure you want to <strong>{getActionLabel(actionType)}</strong> {selectedEntities.length} {entityType}?
                            </p>

                            {reason && (
                                <div>
                                    <strong>Reason:</strong> {reason}
                                </div>
                            )}

                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowConfirmDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleExecuteBulkAction}
                                    disabled={isLoading}
                                    className={actionType === 'soft_delete' || actionType === 'hard_delete' ? 'bg-red-600 hover:bg-red-700' : ''}
                                >
                                    {isLoading ? 'Processing...' : 'Confirm'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
```

## Data Archive and Recovery

### Archive Service
```typescript
// src/services/archive/archive.service.ts
export class ArchiveService {
    constructor(private prisma: PrismaClient) {}

    async archiveEntity(entityType: string, entityId: string, userId: string): Promise<void> {
        const archiveData = await this.prepareArchiveData(entityType, entityId);

        // Store in archive storage
        await this.prisma.archivedData.create({
            data: {
                entityType,
                entityId,
                data: archiveData,
                archivedBy: userId,
                archivedAt: new Date()
            }
        });

        // Mark entity as archived
        await this.markEntityAsArchived(entityType, entityId, userId);
    }

    async restoreEntity(entityType: string, entityId: string, userId: string): Promise<void> {
        // Get archived data
        const archivedData = await this.prisma.archivedData.findFirst({
            where: { entityType, entityId }
        });

        if (!archivedData) {
            throw new Error('No archived data found for this entity');
        }

        // Restore entity
        await this.restoreEntityFromArchive(entityType, entityId, archivedData.data, userId);

        // Remove from archive
        await this.prisma.archivedData.delete({
            where: { id: archivedData.id }
        });
    }

    async getArchivedEntities(entityType: string, filters?: any): Promise<any[]> {
        const whereClause: any = { entityType };

        if (filters) {
            // Apply filters
        }

        return this.prisma.archivedData.findMany({
            where: whereClause,
            orderBy: { archivedAt: 'desc' }
        });
    }

    private async prepareArchiveData(entityType: string, entityId: string): Promise<any> {
        switch (entityType) {
            case 'users':
                return await this.prisma.user.findUnique({
                    where: { id: entityId },
                    include: {
                        userTenants: true,
                        sessions: true
                    }
                });
            case 'tenants':
                return await this.prisma.tenant.findUnique({
                    where: { id: entityId },
                    include: {
                        userTenants: true,
                        services: true,
                        tenantServices: true
                    }
                });
            default:
                throw new Error(`Unsupported entity type for archival: ${entityType}`);
        }
    }

    private async markEntityAsArchived(entityType: string, entityId: string, userId: string): Promise<void> {
        const updateData: any = {
            status: 'ARCHIVED',
            archivedAt: new Date(),
            archivedBy: userId,
            updatedAt: new Date()
        };

        switch (entityType) {
            case 'users':
                await this.prisma.user.update({
                    where: { id: entityId },
                    data: updateData
                });
                break;
            case 'tenants':
                await this.prisma.tenant.update({
                    where: { id: entityId },
                    data: updateData
                });
                break;
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    private async restoreEntityFromArchive(
        entityType: string,
        entityId: string,
        archiveData: any,
        userId: string
    ): Promise<void> {
        const restoreData = {
            ...archiveData,
            status: 'ACTIVE',
            archivedAt: null,
            archivedBy: null,
            updatedAt: new Date(),
            updatedBy: userId
        };

        delete restoreData.id;
        delete restoreData.createdAt;
        delete restoreData.updatedAt;

        switch (entityType) {
            case 'users':
                await this.prisma.user.update({
                    where: { id: entityId },
                    data: restoreData
                });
                break;
            case 'tenants':
                await this.prisma.tenant.update({
                    where: { id: entityId },
                    data: restoreData
                });
                break;
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }
}
```

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Status**: Ready for Implementation