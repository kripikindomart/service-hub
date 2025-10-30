import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const userController = new UserController();

// Get current user profile
router.get('/profile', asyncHandler(userController.getProfile));

// Update current user profile
router.put('/profile', asyncHandler(userController.updateProfile));

// Change password
router.put('/password', asyncHandler(userController.changePassword));

// Upload avatar
router.post('/avatar', asyncHandler(userController.uploadAvatar));

// Get user's tenants
router.get('/tenants', asyncHandler(userController.getUserTenants));

// Switch tenant context
router.post('/switch-tenant', asyncHandler(userController.switchTenant));

export default router;