import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Register new user
router.post('/register', validateRequest(registerSchema), asyncHandler(authController.register));

// Login user
router.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));

// Refresh token
router.post('/refresh', asyncHandler(authController.refreshToken));

// Logout user
router.post('/logout', asyncHandler(authController.logout));

// Verify email
router.post('/verify-email', asyncHandler(authController.verifyEmail));

// Request password reset
router.post('/forgot-password', asyncHandler(authController.forgotPassword));

// Reset password
router.post('/reset-password', asyncHandler(authController.resetPassword));

export default router;