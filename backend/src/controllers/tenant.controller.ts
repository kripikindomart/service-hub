import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';
import { hasAdminAccess, hasPermission, isSuperAdmin } from '../utils/permissions.util';

export class TenantController {
  // Test endpoint for debugging
  testEndpoint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(ResponseUtil.success('Test endpoint working', {
      message: 'Route registration test successful',
      timestamp: new Date().toISOString()
    }));
  });

  // Get user's accessible tenants (all tenants for super admins, assigned tenants for regular users)
  getTenants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 10, search, type, status } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Check if user is super admin
    const superAdminUser = await isSuperAdmin(userId);

    let tenants: any[] = [];
    let totalCount = 0;

    if (superAdminUser) {
      // Super admins can see all tenants in the system
      let where: any = {
        status: {
          notIn: ['DELETED', 'ARCHIVED']  // Exclude DELETED and ARCHIVED tenants by default
        }
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

      if (status) {
        where.status = status as string;
      }

      const [tenantList, totalTenants] = await Promise.all([
        prisma.tenant.findMany({
          where,
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
            maxUsers: true,
            maxServices: true,
            storageLimitMb: true,
            customDomain: true,
            domain: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNumber,
        }),
        prisma.tenant.count({ where }),
      ]);

      // Get user count and storage used for each tenant
      const tenantsWithStats = await Promise.all(
        tenantList.map(async (tenant) => {
          const [userCount, storageUsed] = await Promise.all([
            prisma.userAssignment.count({
              where: {
                tenantId: tenant.id,
                status: 'ACTIVE',
              },
            }),
            // TODO: Calculate actual storage used when storage tracking is implemented
            0,
          ]);

          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            type: tenant.type,
            tier: tenant.tier,
            status: tenant.status,
            role: 'Super Administrator',
            level: 'SUPER_ADMIN',
            isPrimary: tenant.type === 'CORE',
            branding: {
              primaryColor: tenant.primaryColor,
              logoUrl: tenant.logoUrl,
            },
            joinedAt: tenant.createdAt,
            userCount,
            maxUsers: tenant.maxUsers,
            serviceCount: 0, // TODO: Calculate actual service count
            maxServices: tenant.maxServices,
            storageUsed,
            storageLimitMb: tenant.storageLimitMb,
            customDomain: tenant.customDomain,
            domain: tenant.domain,
          };
        })
      );

      tenants = tenantsWithStats;
      totalCount = totalTenants;
    } else {
      // Regular users only see tenants they're assigned to
      let where: any = {
        userId,
        deletedAt: null,
        tenant: {
          status: {
            not: 'DELETED'  // Exclude DELETED tenants by default
          }
        }
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
        where.tenant.status = status as string;
      }

      const [userAssignments, totalAssignments] = await Promise.all([
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
                maxUsers: true,
                maxServices: true,
                storageLimitMb: true,
                customDomain: true,
                domain: true,
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

      tenants = userAssignments.map(ua => ({
        id: ua.tenant.id,
        name: ua.tenant.name,
        slug: ua.tenant.slug,
        type: ua.tenant.type,
        tier: ua.tenant.tier,
        status: ua.tenant.status,
        role: ua.role.displayName,
        level: ua.role.level,
        isPrimary: ua.isPrimary,
        branding: {
          primaryColor: ua.tenant.primaryColor,
          logoUrl: ua.tenant.logoUrl,
        },
        joinedAt: ua.createdAt,
        userCount: 0, // TODO: Calculate actual user count for regular users
        maxUsers: ua.tenant.maxUsers,
        serviceCount: 0, // TODO: Calculate actual service count
        maxServices: ua.tenant.maxServices,
        storageUsed: 0, // TODO: Calculate actual storage used
        storageLimitMb: ua.tenant.storageLimitMb,
        customDomain: ua.tenant.customDomain,
        domain: ua.tenant.domain,
      }));

      totalCount = totalAssignments;
    }

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
    // Get roles for primary tenant
    const roles = await prisma.role.findMany({
      where: {
        tenantId: primaryTenantId,
      },
      orderBy: {
        level: 'asc',
      },
    });

    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await prisma.userAssignment.count({
          where: {
            roleId: role.id,
            status: 'ACTIVE',
          },
        });

        return {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          type: role.type,
          level: role.level,
          isSystemRole: role.isSystemRole,
          isDefaultRole: role.isDefaultRole,
          userCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    // Get user status statistics for tab badges
    const userStatusStats = await prisma.user.groupBy({
      by: ['status'],
      where: isSuperAdmin ? {} : {
        userAssignments: {
          some: {
            tenantId: primaryTenantId,
            deletedAt: null
          }
        }
      },
      _count: {
        id: true
      }
    });

    // Get archived users count
    const archivedUsersCount = await prisma.user.count({
      where: {
        archivedAt: { not: null },
        deletedAt: null,
        ...(isSuperAdmin ? {} : {
          userAssignments: {
            some: {
              tenantId: primaryTenantId,
              deletedAt: null
            }
          }
        })
      }
    });

    // Get deleted users count
    const deletedUsersCount = await prisma.user.count({
      where: {
        deletedAt: { not: null },
        ...(isSuperAdmin ? {} : {
          userAssignments: {
            some: {
              tenantId: primaryTenantId,
              deletedAt: null
            }
          }
        })
      }
    });

    // Format status stats for frontend
    const byStatus = userStatusStats.map(stat => ({
      status: stat.status,
      count: stat._count.id
    }));

    // Add archived and deleted to status stats
    byStatus.push({ status: 'ARCHIVED', count: archivedUsersCount });
    byStatus.push({ status: 'DELETED', count: deletedUsersCount });

    const dashboardData = {
      overview: {
        totalTenants: isSuperAdmin ? await prisma.tenant.count() : 1,
        totalUsers: await prisma.user.count(),
      },
      userStats: {
        byStatus
      },
      activity: {
        newUsers: 0, // TODO: Implement this month's new users calculation
      },
      primaryTenant: primaryUserAssignment.tenant,
      userRole: primaryUserAssignment.role.displayName,
      roles: rolesWithCount, // Add roles to dashboard response
    };

    res.json(ResponseUtil.success('Dashboard statistics retrieved successfully', dashboardData));
  });

  // Get tenant roles
  getTenantRoles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user!.id;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Check if user has access to this tenant
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: userId,
        tenantId: tenantId,
        status: 'ACTIVE',
      },
    });

    if (!userAssignment) {
      throw new AppError('Access denied to this tenant', 403);
    }

    // Get all roles for this tenant with user count
    const roles = await prisma.role.findMany({
      where: {
        tenantId: { equals: tenantId },
      },
      orderBy: {
        level: 'asc',
      },
    });

    // Get user count for each role
    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await prisma.userAssignment.count({
          where: {
            roleId: role.id,
            status: 'ACTIVE',
          },
        });

        return {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          type: role.type,
          level: role.level,
          isSystemRole: role.isSystemRole,
          isDefaultRole: role.isDefaultRole,
          userCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    res.json(ResponseUtil.success('Tenant roles retrieved successfully', rolesWithCount));
  });

  // Get roles for current tenant (for debugging)
  getCurrentTenantRoles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // Get user's primary tenant
    const primaryUserAssignment = await prisma.userAssignment.findFirst({
      where: { userId, isPrimary: true, deletedAt: null },
      include: { tenant: true },
    });

    if (!primaryUserAssignment) {
      throw new AppError('No primary tenant found', 404);
    }

    const tenantId = primaryUserAssignment.tenantId;

    // Get all roles for this tenant with user count
    const roles = await prisma.role.findMany({
      where: {
        tenantId: { equals: tenantId },
      },
      orderBy: {
        level: 'asc',
      },
    });

    // Get user count for each role
    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await prisma.userAssignment.count({
          where: {
            roleId: role.id,
            status: 'ACTIVE',
          },
        });

        return {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          type: role.type,
          level: role.level,
          isSystemRole: role.isSystemRole,
          isDefaultRole: role.isDefaultRole,
          userCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    res.json(ResponseUtil.success('Current tenant roles retrieved successfully', rolesWithCount));
  });

  // Create new tenant
  createTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const {
      name,
      slug,
      domain,
      type,
      tier = 'STARTER',
      primaryColor,
      logoUrl,
      settings,
      featureFlags,
      databaseHost,
      databasePort = 3306,
      useExternalDatabase = false
    } = req.body;

    // Verify admin has permission to create tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to create tenants', 403);
    }

    // Validate required fields
    if (!name || !type) {
      throw new AppError('Name and type are required', 400);
    }

    // Auto-generate slug from name if not provided
    const generatedSlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: generatedSlug },
    });

    if (existingTenant) {
      throw new AppError('Slug is already taken', 409);
    }

    // Check if domain is already taken (if provided)
    if (domain) {
      const existingDomainTenant = await prisma.tenant.findUnique({
        where: { domain },
      });

      if (existingDomainTenant) {
        throw new AppError('Domain is already taken', 409);
      }
    }

    // Validate tenant type
    const validTypes = ['CORE', 'BUSINESS', 'TRIAL'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid tenant type. Must be CORE, BUSINESS, or TRIAL', 400);
    }

    // Validate and normalize tier
    const validTiers = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
    if (!validTiers.includes(tier)) {
      throw new AppError('Invalid tier. Must be STARTER, PROFESSIONAL, ENTERPRISE, or CUSTOM', 400);
    }

    // Generate database name from generated slug
    const databaseName = `tenant_${generatedSlug.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: generatedSlug,
        domain,
        type,
        tier: tier,
        databaseName,
        databaseHost: useExternalDatabase ? databaseHost : undefined,
        databasePort: useExternalDatabase ? databasePort : 3306,
        primaryColor,
        logoUrl,
        settings: settings || {},
        featureFlags: featureFlags || {},
        status: 'ACTIVE',
        createdBy: adminId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
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

    // Create default roles for the tenant
    const defaultRoles = [
      {
        name: 'SUPER_ADMIN',
        displayName: 'Super Admin',
        description: 'Full access to all tenant resources',
        type: 'TENANT' as const,
        level: 'SUPER_ADMIN' as const,
        isSystemRole: true,
        isDefaultRole: false,
        tenantId: tenant.id,
        createdBy: adminId,
      },
      {
        name: 'ADMIN',
        displayName: 'Administrator',
        description: 'Administrative access to tenant resources',
        type: 'TENANT' as const,
        level: 'ADMIN' as const,
        isSystemRole: true,
        isDefaultRole: false,
        tenantId: tenant.id,
        createdBy: adminId,
      },
      {
        name: 'MANAGER',
        displayName: 'Manager',
        description: 'Management access to tenant resources',
        type: 'TENANT' as const,
        level: 'MANAGER' as const,
        isSystemRole: true,
        isDefaultRole: false,
        tenantId: tenant.id,
        createdBy: adminId,
      },
      {
        name: 'USER',
        displayName: 'User',
        description: 'Standard user access',
        type: 'TENANT' as const,
        level: 'USER' as const,
        isSystemRole: true,
        isDefaultRole: true,
        tenantId: tenant.id,
        createdBy: adminId,
      },
    ];

    await prisma.role.createMany({
      data: defaultRoles,
    });

    // Assign creator as SUPER_ADMIN of this tenant
    const superAdminRole = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'SUPER_ADMIN',
      },
    });

    if (superAdminRole) {
      await prisma.userAssignment.create({
        data: {
          userId: adminId,
          tenantId: tenant.id,
          roleId: superAdminRole.id,
          status: 'ACTIVE',
          isPrimary: false, // Don't change primary tenant
          assignedBy: adminId,
          assignedAt: new Date(),
        },
      });
    }

    res.status(201).json(ResponseUtil.success('Tenant created successfully', tenant));
  });

  // Update tenant
  updateTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const {
      name,
      slug,
      domain,
      tier,
      type,
      primaryColor,
      logoUrl,
      settings,
      featureFlags,
      status
    } = req.body;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify admin has permission to update tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to update tenants', 403);
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Prevent updating CORE tenant type
    if (existingTenant.type === 'CORE' && type && type !== 'CORE') {
      throw new AppError('Cannot change CORE tenant type', 400);
    }

    // If updating slug, check if it's already taken
    if (slug && slug !== existingTenant.slug) {
      const slugExists = await prisma.tenant.findUnique({
        where: { slug },
      });

      if (slugExists) {
        throw new AppError('Slug is already taken', 409);
      }
    }

    // If updating domain, check if it's already taken
    if (domain && domain !== existingTenant.domain) {
      const domainExists = await prisma.tenant.findUnique({
        where: { domain },
      });

      if (domainExists) {
        throw new AppError('Domain is already taken', 409);
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedBy: adminId,
    };

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (domain !== undefined) updateData.domain = domain;

    // Validate and normalize tier if provided
    if (tier !== undefined) {
      const validTiers = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
      if (!validTiers.includes(tier)) {
        throw new AppError('Invalid tier. Must be STARTER, PROFESSIONAL, ENTERPRISE, or CUSTOM', 400);
      }
      updateData.tier = tier;
    }
    if (type !== undefined) updateData.type = type;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (settings !== undefined) updateData.settings = settings;
    if (featureFlags !== undefined) updateData.featureFlags = featureFlags;
    if (status !== undefined) updateData.status = status;

    // Update tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
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

    res.json(ResponseUtil.success('Tenant updated successfully', tenant));
  });

  // Delete tenant (soft delete)
  deleteTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { reason } = req.body || {}; // Optional deletion reason

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify admin has permission to delete tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to delete tenants', 403);
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Prevent deletion of CORE tenant
    if (existingTenant.type === 'CORE') {
      throw new AppError('Cannot delete CORE tenant', 400);
    }

    // Note: We allow deletion of tenants with active users as they will be auto-deactivated
    // This is safer and allows proper cleanup of tenant resources

    // Perform deletion in transaction for data consistency
    await prisma.$transaction(async (tx) => {
      // Soft delete tenant
      await tx.tenant.update({
        where: { id },
        data: {
          status: 'DELETED',
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      });

      // Automatically deactivate all user assignments for this tenant
      await tx.userAssignment.updateMany({
        where: { tenantId: id },
        data: {
          status: 'INACTIVE',
          updatedAt: new Date(),
        },
      });
    });

    res.json(ResponseUtil.success('Tenant deleted successfully', null));
  });

  // Restore deleted tenant
  restoreTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify admin has permission to restore tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to restore tenants', 403);
    }

    // Check if tenant exists in deleted state
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Deleted tenant not found', 404);
    }

    // Restore tenant
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

    res.json(ResponseUtil.success('Tenant restored successfully', tenant));
  });

  // Get tenant by ID
  getTenantById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Check if user has access to this tenant
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: userId,
        tenantId: id,
        status: 'ACTIVE',
      },
    });

    if (!userAssignment) {
      throw new AppError('Access denied to this tenant', 403);
    }

    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id },
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

    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    res.json(ResponseUtil.success('Tenant retrieved successfully', tenant));
  });

  // Get tenant users
  getTenantUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      role
    } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    // Verify user has access to this tenant
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: userId,
        tenantId: tenantId!,
        status: 'ACTIVE',
      },
      include: {
        role: {
          select: { displayName: true },
        },
      },
    });

    if (!userAssignment) {
      throw new AppError('Access denied to this tenant', 403);
    }

    // Check if user has permission to view users
    const hasUsersPermission = await hasPermission(userId, tenantId!, {
      resource: 'users',
      action: 'read',
      scope: 'ALL'
    });

    if (!hasUsersPermission) {
      throw new AppError('Insufficient permissions to view users', 403);
    }

    // Build where clause
    const where: any = {
      userAssignments: {
        some: {
          tenantId: tenantId,
          status: 'ACTIVE'
        }
      }
    };

    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status as any;
    }

    // Role filter
    if (role) {
      where.userAssignments = {
        some: {
          tenantId: tenantId,
          status: 'ACTIVE',
          role: {
            displayName: { contains: role as string }
          }
        }
      };
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          emailVerified: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          userAssignments: {
            select: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  type: true,
                  status: true,
                },
              },
              role: {
                select: {
                  displayName: true,
                  level: true,
                },
              },
              status: true,
              isPrimary: true
            },
            where: {
              tenantId: tenantId!,
              status: 'ACTIVE'
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json(ResponseUtil.success('Tenant users retrieved successfully', {
      users,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    }));
  });

  // Deactivate tenant user
  deactivateTenantUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, userId } = req.params;
    const adminId = req.user!.id;

    // Verify admin has access to this tenant
    const adminAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: adminId,
        tenantId: tenantId!,
        status: 'ACTIVE',
      },
      include: {
        role: {
          select: { displayName: true, level: true },
        },
      },
    });

    if (!adminAssignment) {
      throw new AppError('Access denied to this tenant', 403);
    }

    // Check if admin has permission to deactivate users
    const hasUsersPermission = await hasPermission(adminId, tenantId!, {
      resource: 'users',
      action: 'write',
      scope: 'ALL'
    });

    if (!hasUsersPermission) {
      throw new AppError('Insufficient permissions to deactivate users', 403);
    }

    // Prevent self-deactivation
    if (userId === adminId) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    // Check if user exists in this tenant
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: userId!,
        tenantId: tenantId!,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, status: true }
        }
      },
    });

    if (!userAssignment) {
      throw new AppError('User not found in this tenant', 404);
    }

    // Deactivate user assignment
    await prisma.userAssignment.update({
      where: {
        id: userAssignment.id
      },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date()
      }
    });

    // Deactivate user if no other active assignments
    const otherAssignments = await prisma.userAssignment.count({
      where: {
        userId: userId!,
        status: 'ACTIVE',
        tenantId: { not: tenantId! }
      }
    });

    if (otherAssignments === 0) {
      await prisma.user.update({
        where: { id: userId! },
        data: {
          status: 'INACTIVE'
        }
      });
    }

    // Revoke all user sessions
    await prisma.session.updateMany({
      where: {
        userId: userId!
      },
      data: { isActive: false },
    });

    res.json(ResponseUtil.success('User deactivated successfully', {
      userId,
      tenantId,
      status: 'INACTIVE'
    }));
  });

  // Activate tenant user
  activateTenantUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, userId } = req.params;
    const adminId = req.user!.id;

    // Verify admin has access to this tenant
    const adminAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: adminId,
        tenantId: tenantId!,
        status: 'ACTIVE',
      },
      include: {
        role: {
          select: { displayName: true, level: true },
        },
      },
    });

    if (!adminAssignment) {
      throw new AppError('Access denied to this tenant', 403);
    }

    // Check if admin has permission to activate users
    const hasUsersPermission = await hasPermission(adminId, tenantId!, {
      resource: 'users',
      action: 'write',
      scope: 'ALL'
    });

    if (!hasUsersPermission) {
      throw new AppError('Insufficient permissions to activate users', 403);
    }

    // Check if user exists in this tenant
    const userAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: userId!,
        tenantId: tenantId!,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, status: true }
        }
      },
    });

    if (!userAssignment) {
      throw new AppError('User not found in this tenant', 404);
    }

    // Activate user assignment
    await prisma.userAssignment.update({
      where: {
        id: userAssignment.id
      },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    // Get user info to check status
    const userInfo = await prisma.user.findUnique({
      where: { id: userId! },
      select: { status: true }
    });

    // Activate user if this assignment is active
    if (userInfo && userInfo.status === 'INACTIVE') {
      await prisma.user.update({
        where: { id: userId! },
        data: {
          status: 'ACTIVE'
        }
      });
    }

    res.json(ResponseUtil.success('User activated successfully', {
      userId,
      tenantId,
      status: 'ACTIVE'
    }));
  });

  // Bulk deactivate all tenant users
  deactivateAllTenantUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const adminId = req.user!.id;

    // Verify admin has access to this tenant
    const adminAssignment = await prisma.userAssignment.findFirst({
      where: {
        userId: adminId,
        tenantId: tenantId!,
        status: 'ACTIVE',
      },
      include: {
        role: {
          select: { displayName: true, level: true },
        },
      },
    });

    if (!adminAssignment) {
      throw new AppError('Access denied to this tenant', 403);
    }

    // Check if admin has permission to deactivate users
    const hasUsersPermission = await hasPermission(adminId, tenantId!, {
      resource: 'users',
      action: 'write',
      scope: 'ALL'
    });

    if (!hasUsersPermission) {
      throw new AppError('Insufficient permissions to deactivate users', 403);
    }

    // Find all active user assignments in this tenant (except admin)
    const activeAssignments = await prisma.userAssignment.findMany({
      where: {
        tenantId: tenantId!,
        status: 'ACTIVE',
        userId: { not: adminId } // Exclude admin
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, status: true }
        }
      }
    });

    if (activeAssignments.length === 0) {
      res.json(ResponseUtil.success('No active users found to deactivate', {
        deactivatedCount: 0,
        tenantId
      }));
      return;
    }

    const deactivatedUsers: Array<{userId: string, email: string, name: string}> = [];

    // Process in batches to avoid transaction timeout
    const batchSize = 50;
    for (let i = 0; i < activeAssignments.length; i += batchSize) {
      const batch = activeAssignments.slice(i, i + batchSize);

      await prisma.$transaction(async (tx) => {
        for (const assignment of batch) {
          // Deactivate user assignment
          await tx.userAssignment.update({
            where: {
              id: assignment.id
            },
            data: {
              status: 'INACTIVE',
              updatedAt: new Date()
            }
          });

          // Check if user has other active assignments
          const otherActiveAssignments = await tx.userAssignment.count({
            where: {
              userId: assignment.userId,
              status: 'ACTIVE',
              tenantId: { not: tenantId! }
            }
          });

          // Deactivate user if no other active assignments
          if (otherActiveAssignments === 0) {
            await tx.user.update({
              where: { id: assignment.userId },
              data: {
                status: 'INACTIVE'
              }
            });
          }

          // Get user info for response
          const userInfo = await tx.user.findUnique({
            where: { id: assignment.userId },
            select: { email: true, name: true }
          });

          deactivatedUsers.push({
            userId: assignment.userId,
            email: userInfo?.email || '',
            name: userInfo?.name || ''
          });
        }
      });
    }

    // Revoke all sessions for deactivated users (except admin's sessions)
    const deactivatedUserIds = deactivatedUsers.map(u => u.userId);
    if (deactivatedUserIds.length > 0) {
      await prisma.session.updateMany({
        where: {
          userId: { in: deactivatedUserIds, not: adminId }
        },
        data: { isActive: false },
      });
    }

    res.json(ResponseUtil.success('All tenant users deactivated successfully', {
      deactivatedCount: deactivatedUsers.length,
      tenantId,
      deactivatedUsers
    }));
  });

  // Duplicate tenant
  duplicateTenant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const adminId = req.user!.id;
    const { name, slug } = req.body;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Verify admin has permission to create tenants
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to duplicate tenants', 403);
    }

    // Check if source tenant exists and user has access to it
    const sourceTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        roles: {
          where: {
            isSystemRole: false
          }
        }
      }
    });

    if (!sourceTenant) {
      throw new AppError('Source tenant not found', 404);
    }

    // Prevent duplication of CORE tenant
    if (sourceTenant.type === 'CORE') {
      throw new AppError('Cannot duplicate CORE tenant', 400);
    }

    // Generate new name (default to "Original Name (Copy)")
    const duplicateName = name || `${sourceTenant.name} (Copy)`;

    // Generate new slug with uniqueness check
    let duplicateSlug = slug || `${sourceTenant.slug}-copy`;
    let slugCounter = 1;

    while (true) {
      const existingSlug = await prisma.tenant.findUnique({
        where: { slug: duplicateSlug }
      });

      if (!existingSlug) break;

      duplicateSlug = slug ? `${slug}-${slugCounter}` : `${sourceTenant.slug}-copy-${slugCounter}`;
      slugCounter++;

      if (slugCounter > 100) {
        throw new AppError('Unable to generate unique slug after 100 attempts', 500);
      }
    }

    // Generate unique database name
    let duplicateDatabaseName = `${sourceTenant.databaseName}-copy`;
    let dbCounter = 1;

    while (true) {
      const existingDb = await prisma.tenant.findUnique({
        where: { databaseName: duplicateDatabaseName }
      });

      if (!existingDb) break;

      duplicateDatabaseName = `${sourceTenant.databaseName}-copy-${dbCounter}`;
      dbCounter++;

      if (dbCounter > 100) {
        throw new AppError('Unable to generate unique database name after 100 attempts', 500);
      }
    }

    // Create the duplicate tenant
    const duplicateTenant = await prisma.tenant.create({
      data: {
        name: duplicateName,
        slug: duplicateSlug,
        type: sourceTenant.type,
        tier: sourceTenant.tier,
        status: 'PENDING', // Set to PENDING for duplicates
        maxUsers: sourceTenant.maxUsers,
        maxServices: sourceTenant.maxServices,
        storageLimitMb: sourceTenant.storageLimitMb,
        databaseName: duplicateDatabaseName,
        databaseHost: sourceTenant.databaseHost,
        databasePort: sourceTenant.databasePort,
        primaryColor: sourceTenant.primaryColor,
        logoUrl: sourceTenant.logoUrl,
        faviconUrl: sourceTenant.faviconUrl,
        // Clear domain-specific fields (should be unique per tenant)
        domain: null,
        customDomain: null,
        settings: sourceTenant.settings as any,
        featureFlags: sourceTenant.featureFlags as any,
        integrations: sourceTenant.integrations as any,
        createdBy: adminId,
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

    // Create default system roles for the duplicate tenant
    const defaultRoles = [
      {
        name: 'SUPER_ADMIN',
        displayName: 'Super Admin',
        description: 'Full access to all tenant resources',
        type: 'TENANT' as const,
        level: 'SUPER_ADMIN' as const,
        isSystemRole: true,
        isDefaultRole: false,
        tenantId: duplicateTenant.id,
        createdBy: adminId,
      },
      {
        name: 'ADMIN',
        displayName: 'Administrator',
        description: 'Administrative access to tenant resources',
        type: 'TENANT' as const,
        level: 'ADMIN' as const,
        isSystemRole: true,
        isDefaultRole: false,
        tenantId: duplicateTenant.id,
        createdBy: adminId,
      },
      {
        name: 'MANAGER',
        displayName: 'Manager',
        description: 'Management access to tenant resources',
        type: 'TENANT' as const,
        level: 'MANAGER' as const,
        isSystemRole: true,
        isDefaultRole: false,
        tenantId: duplicateTenant.id,
        createdBy: adminId,
      },
      {
        name: 'USER',
        displayName: 'User',
        description: 'Standard user access',
        type: 'TENANT' as const,
        level: 'USER' as const,
        isSystemRole: true,
        isDefaultRole: true,
        tenantId: duplicateTenant.id,
        createdBy: adminId,
      },
    ];

    await prisma.role.createMany({
      data: defaultRoles,
    });

    // Copy non-system roles from source tenant
    if (sourceTenant.roles.length > 0) {
      const copiedRoles = sourceTenant.roles.map(role => ({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        type: role.type,
        level: role.level,
        isSystemRole: false,
        isDefaultRole: role.isDefaultRole,
        maxUsers: role.maxUsers,
        tenantId: duplicateTenant.id,
        createdBy: adminId,
        constraints: role.constraints,
        metadata: role.metadata,
        weight: role.weight,
      }));

      await prisma.role.createMany({
        data: copiedRoles as any,
      });
    }

    // Assign creator as SUPER_ADMIN of the duplicate tenant
    const superAdminRole = await prisma.role.findFirst({
      where: {
        tenantId: duplicateTenant.id,
        name: 'SUPER_ADMIN',
      },
    });

    if (superAdminRole) {
      await prisma.userAssignment.create({
        data: {
          userId: adminId,
          tenantId: duplicateTenant.id,
          roleId: superAdminRole.id,
          status: 'ACTIVE',
          isPrimary: false, // Don't change primary tenant
          assignedBy: adminId,
          assignedAt: new Date(),
        },
      });
    }

    res.status(201).json(ResponseUtil.success('Tenant duplicated successfully', {
      originalTenant: {
        id: sourceTenant.id,
        name: sourceTenant.name,
        slug: sourceTenant.slug,
      },
      duplicateTenant: {
        id: duplicateTenant.id,
        name: duplicateTenant.name,
        slug: duplicateTenant.slug,
        type: duplicateTenant.type,
        tier: duplicateTenant.tier,
        status: duplicateTenant.status,
      },
    }));
  });
}