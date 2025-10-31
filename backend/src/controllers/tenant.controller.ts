import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';

export class TenantController {
  // Get user's accessible tenants
  getTenants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 10, search, type, status } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause
    let where: any = {
      userId,
      deletedAt: null,
    };

    if (search) {
      where.tenant = {
        ...where.tenant,
        OR: [
          { name: { contains: search as string } },
          { slug: { contains: search as string } },
        ],
      };
    }

    if (type) {
      where.tenant = {
        ...where.tenant,
        type: type as string,
      };
    }

    if (status) {
      where.status = status as string;
    }

    const [userAssignments, totalCount] = await Promise.all([
      prisma.userAssignment.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              status: true,
              tier: true,
              primaryColor: true,
              logoUrl: true,
              createdAt: true,
              updatedAt: true,
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
        skip,
        take: limitNumber,
      }),
      prisma.userAssignment.count({ where }),
    ]);

    const tenants = userAssignments.map(ua => ({
      id: ua.tenant.id,
      name: ua.tenant.name,
      slug: ua.tenant.slug,
      type: ua.tenant.type,
      tier: ua.tenant.tier,
      role: ua.role.displayName,
      level: ua.role.level,
      isPrimary: ua.isPrimary,
      branding: {
        primaryColor: ua.tenant.primaryColor,
        logoUrl: ua.tenant.logoUrl,
      },
      joinedAt: ua.createdAt,
    }));

    res.json(ResponseUtil.paginated('Tenants retrieved successfully', tenants, pageNumber, limitNumber, totalCount));
  });

  // Get dashboard statistics
  getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // Get user's primary tenant
    const primaryUserAssignment = await prisma.userAssignment.findFirst({
      where: { userId, isPrimary: true, deletedAt: null },
      include: {
        tenant: {
          select: { id: true, name: true, type: true, status: true },
        },
        role: {
          select: { level: true, displayName: true },
        },
      },
    });

    if (!primaryUserAssignment) {
      throw new AppError('No primary tenant found', 404);
    }

    const isSuperAdmin = primaryUserAssignment.role.level === 'SUPER_ADMIN';
    const primaryTenantId = primaryUserAssignment.tenantId;

    // Get basic statistics
    const dashboardData = {
      overview: {
        totalTenants: isSuperAdmin ? await prisma.tenant.count() : 1,
        totalUsers: await prisma.user.count(),
      },
      primaryTenant: primaryUserAssignment.tenant,
      userRole: primaryUserAssignment.role.displayName,
    };

    res.json(ResponseUtil.success('Dashboard statistics retrieved successfully', dashboardData));
  });
}