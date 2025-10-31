import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const tenantController = new TenantController();

// Get user's accessible tenants
router.get('/', asyncHandler(tenantController.getTenants));

// Get dashboard statistics (must come before /:id route)
router.get('/dashboard/stats', asyncHandler(tenantController.getDashboardStats));

// Get current tenant roles (for debugging)
router.get('/current-roles', asyncHandler(tenantController.getCurrentTenantRoles));

// Get tenant roles
router.get('/:tenantId/roles', asyncHandler(tenantController.getTenantRoles));

// Export router
export default router;