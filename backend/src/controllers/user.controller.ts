import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';

export class UserController {
  // Get current user profile
  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        timezone: true,
        language: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        currentTenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(ResponseUtil.success('Profile retrieved successfully', user));
  });

  // Update current user profile
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, phone, timezone, language, preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        timezone,
        language,
        preferences,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        timezone: true,
        language: true,
        preferences: true,
        updatedAt: true,
      },
    });

    res.json(ResponseUtil.success('Profile updated successfully', user));
  });

  // Change password
  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and increment token version to invalidate all existing tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });

    res.json(ResponseUtil.success('Password changed successfully', null));
  });

  // Upload avatar
  uploadAvatar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement file upload logic
    // For now, just return a placeholder URL
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    res.json(ResponseUtil.success('Avatar uploaded successfully', { avatarUrl }));
  });

  // Get user's tenants
  getUserTenants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const userAssignments = await prisma.userAssignment.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            primaryColor: true,
            logoUrl: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            level: true,
          },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });

    const tenants = userAssignments
      .filter(ua => ua.tenant.status === 'ACTIVE' && ua.status === 'ACTIVE')
      .map(ua => ({
        id: ua.tenant.id,
        name: ua.tenant.name,
        slug: ua.tenant.slug,
        type: ua.tenant.type,
        role: ua.role.displayName,
        level: ua.role.level,
        isPrimary: ua.isPrimary,
        branding: {
          primaryColor: ua.tenant.primaryColor,
          logoUrl: ua.tenant.logoUrl,
        },
      }));

    res.json(ResponseUtil.success('Tenants retrieved successfully', tenants));
  });

  // Switch tenant context
  switchTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { tenantId } = req.body;

    // Verify user has access to this tenant
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId,
        tenantId,
        deletedAt: null,
        status: 'ACTIVE'
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!userAssignment || userAssignment.tenant.status !== 'ACTIVE') {
      throw new AppError('Tenant not found or not accessible', 404);
    }

    // Update current tenant
    await prisma.user.update({
      where: { id: userId },
      data: { currentTenantId: tenantId },
    });

    res.json(ResponseUtil.success('Tenant switched successfully', userAssignment.tenant));
  });
}