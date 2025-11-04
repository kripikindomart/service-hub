import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';
import { hasPermission, isSuperAdmin } from '../utils/permissions.util';

export class TenantRestoreController {
  // Restore tenant (from DELETED to ACTIVE)
  restoreTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // For now, check if user is super admin or has basic tenant access
    const isSuperAdminUser = await isSuperAdmin(adminId);
    if (!isSuperAdminUser) {
      // Check if user has tenant management permissions
      const hasTenantAccess = await hasPermission(adminId, null, {
        resource: 'tenants',
        action: 'read',
        scope: 'ALL'
      });

      if (!hasTenantAccess) {
        throw new AppError('Insufficient permissions to restore tenants', 403);
      }
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found', 404);
    }

    if (existingTenant.status !== 'DELETED') {
      throw new AppError(`Cannot restore tenant with status '${existingTenant.status}'. Only deleted tenants can be restored.`, 400);
    }

    // Prevent restoration of CORE tenant
    if (existingTenant.type === 'CORE') {
      throw new AppError('Cannot restore CORE tenant', 400);
    }

    // Restore tenant from DELETED to ACTIVE
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
        settings: true,
        featureFlags: true,
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

    res.json(ResponseUtil.success('Tenant restored successfully', tenant));
  });
}