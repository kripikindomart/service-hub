import { Router } from 'express'
import { RoleController } from '../controllers/role.controller'
import { authMiddleware } from '../middleware/auth.middleware'
// import { requirePermission } from '../middleware/authorization.middleware'
import { requireTenant } from '../middleware/auth.middleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

// Apply tenant requirement to all routes
router.use(requireTenant)

// GET /api/v1/admin/roles - Get all roles
router.get('/', RoleController.getRoles)

// GET /api/v1/admin/roles/trash - Get deleted roles (must come before /:id)
router.get('/trash', RoleController.getDeletedRoles)

// GET /api/v1/admin/roles/:id - Get role by ID
router.get('/:id', RoleController.getRoleById)

// POST /api/v1/admin/roles - Create new role
router.post('/', RoleController.createRole)

// PUT /api/v1/admin/roles/:id - Update role
router.put('/:id', RoleController.updateRole)

// DELETE /api/v1/admin/roles/:id - Delete role
router.delete('/:id', RoleController.deleteRole)

// GET /api/v1/admin/roles/:id/permissions - Get role permissions
router.get('/:id/permissions', RoleController.getRolePermissions)

// POST /api/v1/admin/roles/:id/restore - Restore deleted role
router.post('/:id/restore', RoleController.restoreRole)

// DELETE /api/v1/admin/roles/:id/hard - Permanently delete role
router.delete('/:id/hard', RoleController.hardDeleteRole)

// PATCH /api/v1/admin/roles/:id/status - Toggle role status
router.patch('/:id/status', RoleController.toggleRoleStatus)

// POST /api/v1/admin/roles/:id/duplicate - Duplicate role
router.post('/:id/duplicate', RoleController.duplicateRole)

export default router