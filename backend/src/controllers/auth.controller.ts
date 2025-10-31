import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { ResponseUtil } from '../utils/response.util';

export class AuthController {
  // Register new user
  register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, name, phone, timezone, language } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (homeTenant will be created separately)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        timezone: timezone || 'UTC',
        language: language || 'en',
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens,
      },
    });
  });

  // Login user
  login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, tenantSlug } = req.body;

    // Find user with tenant information
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        homeTenant: true,
        userAssignments: {
          include: {
            tenant: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 401);
    }

    // Filter accessible tenants
    const accessibleTenants = user.userAssignments
      .filter(ua => ua.tenant.status === 'ACTIVE' && ua.status === 'ACTIVE')
      .map(ua => ({
        id: ua.tenant.id,
        name: ua.tenant.name,
        slug: ua.tenant.slug,
        role: ua.role.displayName,
        isPrimary: ua.isPrimary,
      }));

    // Set current tenant
    let currentTenant = null;
    if (tenantSlug) {
      currentTenant = accessibleTenants.find(t => t.slug === tenantSlug);
    } else if (accessibleTenants.length > 0) {
      currentTenant = accessibleTenants.find(t => t.isPrimary) || accessibleTenants[0];
    }

    // Update current tenant if set
    if (currentTenant) {
      await prisma.user.update({
        where: { id: user.id },
        data: { currentTenantId: currentTenant.id },
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          homeTenant: user.homeTenant ? {
            id: user.homeTenant.id,
            name: user.homeTenant.name,
            slug: user.homeTenant.slug,
            type: user.homeTenant.type,
          } : null,
        },
        currentTenant,
        tenants: accessibleTenants,
        tokens,
      },
    });
  });

  // Refresh token
  refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          tokenVersion: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Check token version
      if (user.tokenVersion !== decoded.tokenVersion) {
        throw new AppError('Refresh token has been revoked', 401);
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      }
      throw error;
    }
  });

  // Logout user
  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (userId && refreshToken) {
      try {
        // Verify refresh token and increment token version to invalidate all tokens
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

        if (decoded.userId === userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { tokenVersion: { increment: 1 } },
          });
        }
      } catch (error) {
        // Token was invalid, but that's okay for logout
        logger.warn('Invalid refresh token during logout:', error);
      }
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  });

  // Verify email
  verifyEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.body;

    // TODO: Implement email verification logic
    // For now, just return success
    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  });

  // Forgot password
  forgotPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset email has been sent',
      });
      return;
    }

    // TODO: Implement actual email sending logic
    logger.info(`Password reset requested for email: ${email}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset email has been sent',
    });
  });

  // Reset password
  resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token, password } = req.body;

    // TODO: Implement actual password reset logic with token validation
    // For now, just return success
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  });

  // Helper method to generate JWT tokens
  private generateTokens(user: any) {
    const payload = {
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }
}