import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const tenantController = new TenantController();

// Get user's accessible tenants
router.get('/', asyncHandler(tenantController.getTenants));

// Get dashboard statistics (must come before /:id route)
router.get('/dashboard/stats', asyncHandler(tenantController.getDashboardStats));

export default router;