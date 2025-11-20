import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';
import { hasPermission, isSuperAdmin } from '../utils/permissions.util';

export class TenantArchiveController {
  // Archive tenant
  archiveTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // For now, check if user is super admin or has basic tenant access
    const isSuperAdminUser = await isSuperAdmin(adminId);
    if (!isSuperAdminUser) {
      // Check if user has any tenant management permissions
      const hasTenantAccess = await hasPermission(adminId, null, {
        resource: 'tenants',
        action: 'read',
        scope: 'ALL'
      });

      if (!hasTenantAccess) {
        throw new AppError('Insufficient permissions to archive tenants', 403);
      }
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Prevent archiving of CORE tenant
    if (existingTenant.type === 'CORE') {
      throw new AppError('Cannot archive CORE tenant', 400);
    }

    // Archive tenant
    await prisma.tenant.update({
      where: { id },
      data: {
        status: 'DEACTIVATED',
        updatedAt: new Date(),
        updatedBy: adminId,
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

    res.json(ResponseUtil.success('Tenant archived successfully', null));
  });

  // Unarchive tenant
  unarchiveTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // For now, check if user is super admin or has basic tenant access
    const isSuperAdminUser = await isSuperAdmin(adminId);
    if (!isSuperAdminUser) {
      // Check if user has any tenant management permissions
      const hasTenantAccess = await hasPermission(adminId, null, {
        resource: 'tenants',
        action: 'read',
        scope: 'ALL'
      });

      if (!hasTenantAccess) {
        throw new AppError('Insufficient permissions to unarchive tenants', 403);
      }
    }

    // Check if tenant exists in archived state
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Archived tenant not found', 404);
    }

    if (existingTenant.status !== 'DEACTIVATED') {
      throw new AppError(`Cannot unarchive tenant with status '${existingTenant.status}'. Only archived tenants can be unarchived.`, 400);
    }

    // Unarchive tenant
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

    res.json(ResponseUtil.success('Tenant unarchived successfully', tenant));
  });

  // Get archived tenants
  getArchivedTenants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const { page = 1, limit = 10, search, type } = req.query;

    // For now, check if user is super admin or has basic tenant access
    const isSuperAdminUser = await isSuperAdmin(adminId);
    if (!isSuperAdminUser) {
      // Check if user has any tenant management permissions
      const hasTenantAccess = await hasPermission(adminId, null, {
        resource: 'tenants',
        action: 'read',
        scope: 'ALL'
      });

      if (!hasTenantAccess) {
        throw new AppError('Insufficient permissions to view archived tenants', 403);
      }
    }

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause for archived tenants
    let where: any = {
      status: 'DEACTIVATED',
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { slug: { contains: search as string } },
      ];
    }

    if (type) {
      where.type = type as string;
    }

    const [tenants, totalCount] = await Promise.all([
      prisma.tenant.findMany({
        where,
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
          _count: {
            select: {
              userAssignments: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.tenant.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json(ResponseUtil.success('Archived tenants retrieved successfully', {
      items: tenants,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        totalPages,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1,
      },
    }));
  });

  // Get deleted tenants (trash)
  getDeletedTenants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const { page = 1, limit = 10, search, type, dateFrom, dateTo } = req.query;

    // For now, check if user is super admin or has basic tenant access
    const isSuperAdminUser = await isSuperAdmin(adminId);
    if (!isSuperAdminUser) {
      // Check if user has any tenant management permissions
      const hasTenantAccess = await hasPermission(adminId, null, {
        resource: 'tenants',
        action: 'read',
        scope: 'ALL'
      });

      if (!hasTenantAccess) {
        throw new AppError('Insufficient permissions to view deleted tenants', 403);
      }
    }

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause for deleted tenants
    let where: any = {
      status: 'DEACTIVATED'
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { slug: { contains: search as string } },
      ];
    }

    if (type) {
      where.type = type as string;
    }

    if (dateFrom || dateTo) {
      where.updatedAt = {};
      if (dateFrom) where.updatedAt.gte = new Date(dateFrom as string);
      if (dateTo) where.updatedAt.lte = new Date(dateTo as string);
    }

    const [tenants, totalCount] = await Promise.all([
      prisma.tenant.findMany({
        where,
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
          _count: {
            select: {
              userAssignments: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.tenant.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json(ResponseUtil.success('Deleted tenants retrieved successfully', {
      items: tenants,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        totalPages,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1,
      },
    }));
  });

  // Permanent delete tenant
  permanentDeleteTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // For now, check if user is super admin or has basic tenant access
    const isSuperAdminUser = await isSuperAdmin(adminId);
    if (!isSuperAdminUser) {
      // Check if user has any tenant management permissions
      const hasTenantAccess = await hasPermission(adminId, null, {
        resource: 'tenants',
        action: 'delete',
        scope: 'ALL'
      });

      if (!hasTenantAccess) {
        throw new AppError('Insufficient permissions to permanently delete tenants', 403);
      }
    }

    // Check if tenant exists in deleted state
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Deleted tenant not found', 404);
    }

    if (existingTenant.status !== 'DEACTIVATED') {
      throw new AppError(`Cannot permanently delete tenant with status '${existingTenant.status}'. Only deleted tenants can be permanently deleted.`, 400);
    }

    // Prevent permanent deletion of CORE tenant
    if (existingTenant.type === 'CORE') {
      throw new AppError('Cannot permanently delete CORE tenant', 400);
    }

    // Permanent delete tenant and related data
    await prisma.$transaction(async (tx) => {
      // Delete user assignments
      await tx.userAssignment.deleteMany({
        where: { tenantId: id }
      });

      // Delete roles
      await tx.role.deleteMany({
        where: { tenantId: id }
      });

      // Delete organizations
      await tx.organization.deleteMany({
        where: { tenantId: id }
      });

      // Finally delete the tenant
      await tx.tenant.delete({
        where: { id }
      });
    });

    res.json(ResponseUtil.success('Tenant permanently deleted successfully', null));
  });
}