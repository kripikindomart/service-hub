import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';
import { hasAdminAccess } from '../utils/permissions.util';

export class TenantMethods {
  // Activate tenant
  static activateTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify admin has permission to activate tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to activate tenants', 403);
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Prevent activation of CORE tenant if it's already active
    if (existingTenant.type === 'CORE' && existingTenant.status === 'ACTIVE') {
      throw new AppError('CORE tenant is already active', 400);
    }

    // Activate tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
        updatedBy: adminId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        tier: true,
        status: true,
        primaryColor: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Reactivate user assignments for this tenant
    await prisma.userAssignment.updateMany({
      where: { tenantId: id },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    res.json(ResponseUtil.success('Tenant activated successfully', tenant));
  });

  // Deactivate tenant
  static deactivateTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify admin has permission to deactivate tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to deactivate tenants', 403);
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Prevent deactivation of CORE tenant
    if (existingTenant.type === 'CORE') {
      throw new AppError('Cannot deactivate CORE tenant', 400);
    }

    // Deactivate tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
        updatedBy: adminId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        tier: true,
        status: true,
        primaryColor: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Deactivate all user assignments for this tenant
    await prisma.userAssignment.updateMany({
      where: { tenantId: id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
      },
    });

    res.json(ResponseUtil.success('Tenant deactivated successfully', tenant));
  });
}