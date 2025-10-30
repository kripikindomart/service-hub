import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const adminController = new AdminController();

// Activate pending user
router.post('/users/:userId/activate', asyncHandler(adminController.activateUser));

// Deactivate user
router.post('/users/:userId/deactivate', asyncHandler(adminController.deactivateUser));

// Get all users (admin only)
router.get('/users', asyncHandler(adminController.getAllUsers));

// Create new user (admin only)
router.post('/users', asyncHandler(adminController.createUser));

// Get user by ID (admin only)
router.get('/users/:id', asyncHandler(adminController.getUserById));

// Update user (admin only)
router.put('/users/:id', asyncHandler(adminController.updateUser));

// Delete user (admin only)
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

// Bulk actions on users
router.post('/users/bulk-action', asyncHandler(adminController.bulkActionUsers));

// Export users data
router.get('/users/export', asyncHandler(adminController.exportUsers));

// Create system permissions
router.post('/permissions', asyncHandler(adminController.createPermission));

// Get all permissions
router.get('/permissions', asyncHandler(adminController.getAllPermissions));

export default router;