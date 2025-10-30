import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const tenantController = new TenantController();

// Get user's accessible tenants
router.get('/', asyncHandler(tenantController.getTenants));

// Get tenant by ID
router.get('/:id', asyncHandler(tenantController.getTenantById));

// Create new tenant (admin only)
router.post('/', asyncHandler(tenantController.createTenant));

// Update tenant (admin only)
router.put('/:id', asyncHandler(tenantController.updateTenant));

// Get tenant users
router.get('/:id/users', asyncHandler(tenantController.getTenantUsers));

// Invite user to tenant
router.post('/:id/invite', asyncHandler(tenantController.inviteUser));

// Get tenant roles
router.get('/:id/roles', asyncHandler(tenantController.getTenantRoles));

// Get dashboard statistics
router.get('/dashboard/stats', asyncHandler(tenantController.getDashboardStats));

export default router;