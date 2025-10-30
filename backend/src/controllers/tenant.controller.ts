import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';

export class TenantController {
  // Get user's accessible tenants
  getTenants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status
    } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {
      userId,
      status: 'ACTIVE', // Only active user-tenant relationships
      tenant: {
        status: 'ACTIVE', // Only active tenants
      }
    };

    // Build tenant filter conditions
    if (type) where.tenant.type = type as string;
    if (status) where.tenant.status = status as string;

    // Search functionality
    if (search) {
      where.tenant = {
        ...where.tenant,
        OR: [
          { name: { contains: search as string } },
          { slug: { contains: search as string } },
        ],
      };
    }

    const [userTenants, totalCount] = await Promise.all([
      prisma.userTenant.findMany({
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
              maxUsers: true,
              primaryColor: true,
              logoUrl: true,
              createdAt: true,
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
      prisma.userTenant.count({ where }),
    ]);

    const tenants = userTenants.map(ut => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
        type: ut.tenant.type,
        tier: ut.tenant.tier,
        role: ut.role.displayName,
        level: ut.role.level,
        isPrimary: ut.isPrimary,
        branding: {
          primaryColor: ut.tenant.primaryColor,
          logoUrl: ut.tenant.logoUrl,
        },
        limits: {
          maxUsers: ut.tenant.maxUsers,
        },
        joinedAt: ut.createdAt,
        tenantCreatedAt: ut.tenant.createdAt,
      }));

    res.json(ResponseUtil.paginated('Tenants retrieved successfully', tenants, pageNumber, limitNumber, totalCount));
  });

  // Get tenant by ID
  getTenantById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify user has access to this tenant
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: id,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            tier: true,
            maxUsers: true,
            maxServices: true,
            storageLimitMb: true,
            primaryColor: true,
            logoUrl: true,
            faviconUrl: true,
            customDomain: true,
            settings: true,
            featureFlags: true,
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
            description: true,
          },
        },
      },
    });

    if (!userTenant || userTenant.tenant.status !== 'ACTIVE') {
      throw new AppError('Tenant not found or not accessible', 404);
    }

    // Get tenant statistics
    const [userCount, activeUserCount] = await Promise.all([
      prisma.userTenant.count({
        where: { tenantId: id },
      }),
      prisma.userTenant.count({
        where: {
          tenantId: id,
          status: 'ACTIVE',
        },
      }),
    ]);

    const tenant = {
      ...userTenant.tenant,
      userRole: userTenant.role,
      statistics: {
        totalUsers: userCount,
        activeUsers: activeUserCount,
      },
    };

    res.json({
      success: true,
      data: { tenant },
    });
  });

  // Create new tenant
  createTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, slug, type = 'BUSINESS', tier = 'STARTER' } = req.body;

    if (!name || !slug) {
      throw new AppError('Name and slug are required', 400);
    }

    // Check if tenant with slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new AppError('Tenant with this slug already exists', 409);
    }

    // Generate unique database name
    const databaseName = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        type,
        tier,
        databaseName,
        createdBy: userId,
      },
    });

    // Create default role for this tenant
    const defaultRole = await prisma.role.create({
      data: {
        name: 'Owner',
        displayName: 'Tenant Owner',
        description: 'Full access to tenant resources',
        type: 'TENANT',
        level: 'SUPER_ADMIN',
        tenantId: tenant.id,
        isSystemRole: false,
        isDefaultRole: true,
      },
    });

    // Assign user as owner of this tenant
    await prisma.userTenant.create({
      data: {
        userId,
        tenantId: tenant.id,
        roleId: defaultRole.id,
        status: 'ACTIVE',
        isPrimary: true,
        assignedBy: userId,
      },
    });

    // Update user's current tenant
    await prisma.user.update({
      where: { id: userId },
      data: { currentTenantId: tenant.id },
    });

    const response = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      type: tenant.type,
      tier: tenant.tier,
      status: tenant.status,
      branding: {
        primaryColor: tenant.primaryColor,
      },
      createdAt: tenant.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: { tenant: response },
    });
  });

  // Update tenant
  updateTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, settings, featureFlags, primaryColor, logoUrl } = req.body;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify user has admin access to this tenant
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: id,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userTenant || !['SUPER_ADMIN', 'ADMIN'].includes(userTenant.role.level)) {
      throw new AppError('Insufficient permissions to update tenant', 403);
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        name,
        settings,
        featureFlags,
        primaryColor,
        logoUrl,
        updatedBy: userId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        tier: true,
        status: true,
        settings: true,
        featureFlags: true,
        primaryColor: true,
        logoUrl: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: { tenant },
    });
  });

  // Get tenant users
  getTenantUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify user has access to this tenant
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: id,
        },
      },
    });

    if (!userTenant) {
      throw new AppError('Tenant not found or not accessible', 404);
    }

    const tenantUsers = await prisma.userTenant.findMany({
      where: { tenantId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            emailVerified: true,
            createdAt: true,
            lastLoginAt: true,
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
      orderBy: { createdAt: 'asc' },
    });

    const users = tenantUsers.map(ut => ({
      id: ut.user.id,
      email: ut.user.email,
      name: ut.user.name,
      avatarUrl: ut.user.avatarUrl,
      emailVerified: ut.user.emailVerified,
      role: ut.role.displayName,
      roleLevel: ut.role.level,
      status: ut.status,
      isPrimary: ut.isPrimary,
      assignedAt: ut.assignedAt,
      lastAccessedAt: ut.lastAccessedAt,
      accessCount: ut.accessCount,
      createdAt: ut.user.createdAt,
      lastLoginAt: ut.user.lastLoginAt,
    }));

    res.json({
      success: true,
      data: { users },
    });
  });

  // Invite user to tenant
  inviteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { email, roleId } = req.body;

    if (!id || !email || !roleId) {
      throw new AppError('Tenant ID, email, and role ID are required', 400);
    }

    // Verify user has admin access to this tenant
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: id,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userTenant || !['SUPER_ADMIN', 'ADMIN'].includes(userTenant.role.level)) {
      throw new AppError('Insufficient permissions to invite users', 403);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      throw new AppError('User with this email does not exist', 404);
    }

    // Check if user is already invited
    const existingUserTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: existingUser.id,
          tenantId: id,
        },
      },
    });

    if (existingUserTenant) {
      throw new AppError('User is already a member of this tenant', 409);
    }

    // Verify role exists and belongs to this tenant
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.tenantId !== id) {
      throw new AppError('Invalid role', 400);
    }

    // Create user-tenant relationship
    await prisma.userTenant.create({
      data: {
        userId: existingUser.id,
        tenantId: id,
        roleId,
        status: 'PENDING',
        assignedBy: userId,
      },
    });

    // TODO: Send invitation email
    // This would be implemented in a real system

    res.status(201).json({
      success: true,
      message: 'User invited successfully',
    });
  });

  // Get tenant roles
  getTenantRoles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify user has access to this tenant
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: id,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userTenant) {
      throw new AppError('Tenant not found or access denied', 404);
    }

    // Fetch roles for this tenant
    const roles = await prisma.role.findMany({
      where: {
        tenantId: id,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        level: true,
        type: true,
        isSystemRole: true,
        isDefaultRole: true,
        maxUsers: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        level: 'asc', // Order by role level (USER < MANAGER < ADMIN < SUPER_ADMIN)
      },
    });

    res.json(ResponseUtil.success('Tenant roles retrieved successfully', roles));
  });

  // Get dashboard statistics
  getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // Get user's primary tenant
    const primaryUserTenant = await prisma.userTenant.findFirst({
      where: { userId, isPrimary: true },
      include: {
        tenant: {
          select: { id: true, name: true, type: true, status: true },
        },
        role: {
          select: { level: true, displayName: true },
        },
      },
    });

    if (!primaryUserTenant) {
      throw new AppError('No primary tenant found', 404);
    }

    const isSuperAdmin = primaryUserTenant.role.level === 'SUPER_ADMIN';
    const primaryTenantId = primaryUserTenant.tenantId;

    // Get tenant statistics
    let tenantStats, userStats, roleStats, activityStats, userStatusStats, tenantTypeStats;

    if (isSuperAdmin) {
      // Super admin can see all statistics
      tenantStats = await prisma.tenant.aggregate({
        _count: { id: true },
        where: { status: 'ACTIVE' },
      });

      userStats = await prisma.user.aggregate({
        _count: { id: true },
        where: { status: 'ACTIVE' },
      });

      roleStats = await prisma.role.groupBy({
        by: ['level'],
        _count: { id: true },
        where: {
          OR: [
            { tenantId: null }, // System roles
            { tenant: { status: 'ACTIVE' } }
          ]
        },
      });

      userStatusStats = await prisma.user.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      tenantTypeStats = await prisma.tenant.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { status: 'ACTIVE' },
      });

      // Activity statistics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      activityStats = {
        newUsers: await prisma.user.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: 'ACTIVE'
          }
        }),
        activeLogins: await prisma.user.count({
          where: {
            lastLoginAt: { gte: thirtyDaysAgo },
            status: 'ACTIVE'
          }
        }),
        newTenants: await prisma.tenant.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: 'ACTIVE'
          }
        })
      };

    } else {
      // Regular users see their primary tenant statistics
      tenantStats = { _count: { id: 1 } };

      userStats = await prisma.user.aggregate({
        _count: { id: true },
        where: {
          status: 'ACTIVE',
          userTenants: {
            some: { tenantId: primaryTenantId }
          }
        },
      });

      roleStats = await prisma.role.groupBy({
        by: ['level'],
        _count: { id: true },
        where: { tenantId: primaryTenantId },
      });

      userStatusStats = await prisma.user.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          userTenants: {
            some: { tenantId: primaryTenantId }
          }
        },
      });

      tenantTypeStats = await prisma.tenant.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { id: primaryTenantId },
      });

      // Activity statistics for primary tenant (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      activityStats = {
        newUsers: await prisma.user.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: 'ACTIVE',
            userTenants: {
              some: { tenantId: primaryTenantId }
            }
          }
        }),
        activeLogins: await prisma.user.count({
          where: {
            lastLoginAt: { gte: thirtyDaysAgo },
            status: 'ACTIVE',
            userTenants: {
              some: { tenantId: primaryTenantId }
            }
          }
        }),
        newTenants: 0 // Regular users can't create tenants
      };
    }

    const dashboardData = {
      overview: {
        totalTenants: tenantStats._count.id,
        totalUsers: userStats._count.id,
        totalRoles: roleStats.reduce((sum, group) => sum + group._count.id, 0),
        primaryTenant: {
          id: primaryUserTenant.tenant.id,
          name: primaryUserTenant.tenant.name,
          type: primaryUserTenant.tenant.type,
          role: primaryUserTenant.role.displayName
        }
      },
      userStats: {
        byStatus: userStatusStats.map(stat => ({
          status: stat.status,
          count: stat._count.id
        })),
        byRole: roleStats.map(stat => ({
          level: stat.level,
          count: stat._count.id
        }))
      },
      tenantStats: isSuperAdmin ? tenantTypeStats.map(stat => ({
        type: stat.type,
        count: stat._count.id
      })) : null,
      activity: activityStats,
      userRole: primaryUserTenant.role.level,
      scope: isSuperAdmin ? 'CORE_SYSTEM' : 'TENANT_LEVEL'
    };

    res.json(ResponseUtil.success('Dashboard statistics retrieved successfully', dashboardData));
  });
}