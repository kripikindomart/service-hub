import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { TenantArchiveController } from '../controllers/tenant.archive.controller';
import { TenantMethods } from '../controllers/tenant.methods';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const tenantController = new TenantController();
const tenantArchiveController = new TenantArchiveController();

// Test endpoint (paling awal) - butuh auth karena middleware di app.ts
router.get('/test', asyncHandler(tenantController.testEndpoint));

// Get user's accessible tenants
router.get('/', asyncHandler(tenantController.getTenants));

// Get dashboard statistics (must come before /:id route)
router.get('/dashboard/stats', asyncHandler(tenantController.getDashboardStats));

// Get current tenant roles (for debugging)
router.get('/current-roles', asyncHandler(tenantController.getCurrentTenantRoles));

// Archive and trash endpoints (must come before /:id route)
// Get archived tenants
router.get('/archived', asyncHandler(tenantArchiveController.getArchivedTenants));

// Get deleted tenants (trash)
router.get('/trash', asyncHandler(tenantArchiveController.getDeletedTenants));

// Get tenant roles
router.get('/:tenantId/roles', asyncHandler(tenantController.getTenantRoles));

// Get tenant users
router.get('/:tenantId/users', asyncHandler(tenantController.getTenantUsers));

// Deactivate tenant user
router.post('/:tenantId/users/:userId/deactivate', asyncHandler(tenantController.deactivateTenantUser));

// Activate tenant user
router.post('/:tenantId/users/:userId/activate', asyncHandler(tenantController.activateTenantUser));

// Bulk deactivate all tenant users
router.post('/:tenantId/users/deactivate-all', asyncHandler(tenantController.deactivateAllTenantUsers));

// Get tenant by ID
router.get('/:id', asyncHandler(tenantController.getTenantById));

// Create new tenant
router.post('/', asyncHandler(tenantController.createTenant));

// Update tenant
router.put('/:id', asyncHandler(tenantController.updateTenant));

// Delete tenant (soft delete)
router.delete('/:id', asyncHandler(tenantController.deleteTenant));

// Restore deleted tenant
router.post('/:id/restore', asyncHandler(tenantController.restoreTenant));

// Activate/Deactivate tenant
router.post('/:id/activate', asyncHandler(TenantMethods.activateTenant));
router.post('/:id/deactivate', asyncHandler(TenantMethods.deactivateTenant));

// Duplicate tenant
router.post('/:tenantId/duplicate', asyncHandler(tenantController.duplicateTenant));

// Archive tenant
router.post('/:id/archive', asyncHandler(tenantArchiveController.archiveTenant));

// Unarchive tenant
router.post('/:id/unarchive', asyncHandler(tenantArchiveController.unarchiveTenant));

// Permanent delete tenant
router.delete('/:id/permanent', asyncHandler(tenantArchiveController.permanentDeleteTenant));

// Export router
export default router;
