import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/database.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';
import { hasPermission, isSuperAdmin, canAccessTenant, hasAdminAccess } from '../utils/permissions.util';

export class AdminController {
  // Activate pending user
  activateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const adminId = req.user!.id;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    // Verify admin has permission to activate users
    const hasUserWritePermission = await hasPermission(adminId, req.tenant?.id || null, {
      resource: 'users',
      action: 'write',
      scope: 'ALL'
    });

    if (!hasUserWritePermission) {
      throw new AppError('Insufficient permissions to activate users', 403);
    }

    // Update user status to ACTIVE
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        updatedBy: adminId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    res.json(ResponseUtil.success('User activated successfully', user));
  });

  // Deactivate user
  deactivateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const adminId = req.user!.id;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    // Prevent self-deactivation
    if (userId === adminId) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    // Verify admin has permission to deactivate users
    const hasUserWritePermission = await hasPermission(adminId, req.tenant?.id || null, {
      resource: 'users',
      action: 'write',
      scope: 'ALL'
    });

    if (!hasUserWritePermission) {
      throw new AppError('Insufficient permissions to deactivate users', 403);
    }

    // Update user status to INACTIVE
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'INACTIVE',
        updatedBy: adminId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });

    // Revoke all user sessions
    await prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    res.json(ResponseUtil.success('User deactivated successfully', user));
  });

  // Get all users (admin only)
  getAllUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      emailVerified,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verify admin has permission to view users
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: adminId },
      select: {
        homeTenantId: true,
        email: true
      }
    });

    // Check if user is super admin by checking home tenant is CORE type
    let isSuperAdmin = false;
    if (user?.homeTenantId) {
      const homeTenant = await prisma.tenant.findUnique({
        where: { id: user.homeTenantId },
        select: { type: true }
      });
      isSuperAdmin = homeTenant?.type === 'CORE';
    }

    // Alternative: Check if user email is superadmin@system.com (from seed)
    if (user?.email === 'superadmin@system.com') {
      isSuperAdmin = true;
    }

    // Allow access if user has admin role OR is super admin
    const hasPermission = await hasAdminAccess(adminId);
    const isAllowed = hasPermission || isSuperAdmin;

    if (!isAllowed) {
      throw new AppError('Insufficient permissions to view users', 403);
    }

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {
      // Exclude deleted users from active users list (archivedAt field removed)
      deletedAt: null,
    };

    // Search across email and name
    if (search) {
      where.OR = [
        { email: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status as any;
    }

    // Filter by email verification
    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified === 'true';
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    // Build dynamic orderBy
    const orderBy: any = {};
    if (sortBy && typeof sortBy === 'string') {
      const validSortFields = ['createdAt', 'updatedAt', 'email', 'name', 'status', 'lastLoginAt'];
      if (validSortFields.includes(sortBy)) {
        orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
      }
    } else {
      orderBy.createdAt = 'desc';
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
          timezone: true,
          language: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          deletedAt: true,
          userAssignments: {
            select: {
              tenantId: true,
              roleId: true,
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
              isPrimary: true,
              createdAt: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNumber,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json(ResponseUtil.paginated('Users retrieved successfully', users, pageNumber, limitNumber, totalCount));
  });

  // Get user by ID (admin only)
  getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('User ID is required', 400);
    }

    // Verify admin has permission to view user details
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to view user details', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
        phone: true,
        timezone: true,
        language: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        tokenVersion: true,
        userAssignments: {
          select: {
            tenantId: true,
            roleId: true,
            status: true,
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
                description: true,
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            deviceId: true,
            userAgent: true,
            ipAddress: true,
            isActive: true,
            expiresAt: true,
            lastAccessAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(ResponseUtil.success('User retrieved successfully', user));
  });

  // Create user (admin only)
  createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const {
      name,
      email,
      password,
      phone,
      timezone = 'UTC',
      language = 'en',
      status = 'PENDING',
      tenantId,
      roleId,
      sendEmailInvite = true
    } = req.body;

    if (!name || !email || !password || !tenantId || !roleId) {
      throw new AppError('Name, email, password, tenant ID, and role ID are required', 400);
    }

    // Verify admin has permission to create users in this tenant
    const canCreateUser = await canAccessTenant(adminId, tenantId, {
      resource: 'users',
      action: 'write',
      scope: 'TENANT'
    });

    if (!canCreateUser) {
      throw new AppError('Insufficient permissions to create users in this tenant', 403);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Verify role exists and belongs to this tenant
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.tenantId !== tenantId) {
      throw new AppError('Invalid role for this tenant', 400);
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        timezone,
        language,
        status,
        passwordHash, // Use hashed password
        emailVerified: false,
        createdBy: adminId,
        homeTenantId: tenantId, // Set home tenant
        currentTenantId: tenantId, // Set current tenant
      },
    });

    // Create user-tenant relationship
    await prisma.userAssignment.create({
      data: {
        userId: user.id,
        tenantId,
        roleId,
        status: status as any,
        assignedBy: adminId,
      },
    });

    // TODO: Send invitation email if sendEmailInvite is true
    // This would be implemented in a real system with an email service

    // Fetch the user with tenant information
    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userAssignments: {
          select: {
            tenantId: true,
            roleId: true,
            status: true,
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
                description: true,
              },
            },
          },
        },
      },
    });

    const responseUser = {
      ...createdUser,
      tenantInfo: createdUser?.userAssignments?.[0],
    };

    res.status(201).json(ResponseUtil.success('User created successfully', responseUser));
  });

  // Update user (admin only)
  updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const {
      name,
      email,
      phone,
      timezone,
      language,
      status,
      tenantId,
      roleId,
      password
    } = req.body;

    if (!id) {
      throw new AppError('User ID is required', 400);
    }

    // Verify admin has permission to update user
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to update users', 403);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // If updating email, check if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new AppError('Email is already taken', 409);
      }
    }

    // Prepare user update data
    const userData: any = {
      name,
      email,
      phone,
      timezone,
      language,
      status,
      updatedBy: adminId,
    };

    // Handle password update if provided
    if (password && password.trim()) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      userData.passwordHash = await bcrypt.hash(password.trim(), saltRounds);
    }

    // Update user basic information
    const user = await prisma.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
        phone: true,
        timezone: true,
        language: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    // Handle tenant and role assignment updates
    if (tenantId && roleId) {
      // Get current user assignments
      const currentAssignments = await prisma.userAssignment.findMany({
        where: { userId: id },
        include: { tenant: true, role: true }
      });

      // Check if user has an assignment for the specified tenant
      const existingAssignment = currentAssignments.find(ua => ua.tenantId === tenantId);

      if (existingAssignment) {
        // Update existing assignment
        await prisma.userAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            roleId: roleId
          }
        });
      } else {
        // Create new assignment
        await prisma.userAssignment.create({
          data: {
            userId: id,
            tenantId: tenantId,
            roleId: roleId,
            status: 'ACTIVE',
            isPrimary: currentAssignments.length === 0, // Make primary if no other assignments
            assignedBy: adminId,
            assignedAt: new Date()
          }
        });
      }

      // Update user's current tenant if needed
      await prisma.user.update({
        where: { id },
        data: {
          currentTenantId: tenantId,
          homeTenantId: existingUser.homeTenantId || tenantId // Set home tenant if not set
        }
      });
    }

    res.json(ResponseUtil.success('User updated successfully', user));
  });

  // Delete user (admin only)
  // Soft delete user (move to trash)
  deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { reason } = req.body; // Optional deletion reason

    if (!id) {
      throw new AppError('User ID is required', 400);
    }

    // Prevent self-deletion
    if (id === adminId) {
      throw new AppError('Cannot delete your own account', 400);
    }

    // Verify admin has permission to delete users
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to delete users', 403);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: null }, // Only allow deletion of non-deleted users
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // Soft delete user with audit trail
    await prisma.user.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: adminId,
        deletionReason: reason || 'Deleted by admin',
        updatedAt: new Date(),
        updatedBy: adminId
      }
    });

    // Deactivate all user assignments
    await prisma.userAssignment.updateMany({
      where: { userId: id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date()
      }
    });

    // Terminate all active sessions
    await prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data: {
        isActive: false,
        lastAccessAt: new Date()
      }
    });

    res.json(ResponseUtil.success('User moved to trash successfully', null));
  });

  // Create system permission
  createPermission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const { name, resource, action, scope, description, category } = req.body;

    // Verify super admin permission
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!await isSuperAdmin(adminId)) {
      throw new AppError('Only super admin can create permissions', 403);
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        resource,
        action,
        scope,
        description,
        category,
        isSystemPermission: true,
      },
    });

    res.status(201).json(ResponseUtil.success('Permission created successfully', permission));
  });

  // Restore user from trash
  restoreUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('User ID is required', 400);
    }

    // Verify admin has permission to restore users
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to restore users', 403);
    }

    // Check if user exists in trash
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: { not: null } },
    });

    if (!existingUser) {
      throw new AppError('User not found in trash', 404);
    }

    // Restore user
    await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: new Date(),
        updatedBy: adminId
      }
    });

    // Reactivate primary user assignment
    await prisma.userAssignment.updateMany({
      where: { userId: id, isPrimary: true },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    res.json(ResponseUtil.success('User restored successfully', null));
  });

  // Note: archiveUser and unarchiveUser functions removed
// archivedAt field has been removed from schema
// Users can only be deleted (soft delete) or restored from trash

  // Hard delete user (permanent deletion)
  permanentDeleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (!id) {
      throw new AppError('User ID is required', 400);
    }

    // Prevent self-deletion
    if (id === adminId) {
      throw new AppError('Cannot permanently delete your own account', 400);
    }

    // Verify admin has SUPER_ADMIN level for permanent deletion
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!adminUserTenant || adminUserTenant.role.level !== 'SUPER_ADMIN') {
      throw new AppError('Only SUPER_ADMIN can permanently delete users', 403);
    }

    // Check if user exists (including deleted)
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // Hard delete user and all related records in a transaction
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.userAssignment.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    res.json(ResponseUtil.success('User permanently deleted', null));
  });

  // Get deleted users (trash)
  getDeletedUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
      sortBy = 'deletedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    // Verify admin has permission
    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to view deleted users', 403);
    }

    // Build where clause
    const where: any = {
      deletedAt: { not: null }
    };

    // Search functionality
    if (search) {
      const searchLower = (search as string).toLowerCase();
      where.OR = [
        { name: { contains: searchLower } },
        { email: { contains: searchLower } },
        { deletionReason: { contains: searchLower } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.deletedAt = {};
      if (dateFrom) where.deletedAt.gte = new Date(dateFrom as string);
      if (dateTo) where.deletedAt.lte = new Date(dateTo as string);
    }

    // Build dynamic orderBy
    const orderBy: any = {};
    const validSortFields = ['deletedAt', 'createdAt', 'updatedAt', 'email', 'name', 'status'];
    if (sortBy && typeof sortBy === 'string' && validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.deletedAt = 'desc';
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
          deletedAt: true,
          deletedBy: true,
          deletionReason: true,
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
          },
        },
        orderBy,
        skip,
        take: limitNumber,
      }),
      prisma.user.count({ where }),
    ]);

    const pagination = {
      page: pageNumber,
      limit: limitNumber,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNumber),
      hasNext: pageNumber * limitNumber < totalCount,
      hasPrev: pageNumber > 1,
    };

    res.json(ResponseUtil.paginated('Deleted users retrieved successfully', users, pageNumber, limitNumber, totalCount));
  });

  // Note: getArchivedUsers function removed
// archivedAt field has been removed from schema
// Use getDeletedUsers to view users in trash

  // Get all permissions
  getAllPermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const {
      page = 1,
      limit = 50,
      search,
      scope,
      category,
      resource,
      action,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isSystemPermission
    } = req.query;

    // Verify admin permission
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to view permissions', 403);
    }

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 50;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};

    // Search across name and description
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { resource: { contains: search as string } },
        { action: { contains: search as string } },
      ];
    }

    // Filter by scope
    if (scope) {
      where.scope = scope as any;
    }

    // Filter by category
    if (category) {
      where.category = category as any;
    }

    // Filter by resource
    if (resource) {
      where.resource = resource as string;
    }

    // Filter by action
    if (action) {
      where.action = action as string;
    }

    // Filter by system permission
    if (isSystemPermission !== undefined) {
      where.isSystemPermission = isSystemPermission === 'true';
    }

    // Build dynamic orderBy
    const orderBy: any = {};
    if (sortBy && typeof sortBy === 'string') {
      const validSortFields = ['createdAt', 'updatedAt', 'name', 'resource', 'action', 'category', 'scope'];
      if (validSortFields.includes(sortBy)) {
        orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    const [permissions, totalCount] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy,
        skip,
        take: limitNumber,
      }),
      prisma.permission.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json(ResponseUtil.paginated('Permissions retrieved successfully', permissions, pageNumber, limitNumber, totalCount));
  });

  // Bulk operations on users
  bulkActionUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const { action, userIds } = req.body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('Action and userIds array are required', 400);
    }

    // Verify admin has permission to perform bulk actions
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to perform bulk actions', 403);
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        let result;

        switch (action) {
          case 'activate':
            result = await prisma.user.update({
              where: { id: userId },
              data: {
                status: 'ACTIVE',
                updatedBy: adminId
              },
              select: { id: true, email: true, name: true, status: true }
            });
            break;

          case 'deactivate':
            // Prevent self-deactivation
            if (userId === adminId) {
              throw new AppError('Cannot deactivate your own account', 400);
            }

            result = await prisma.user.update({
              where: { id: userId },
              data: {
                status: 'INACTIVE',
                updatedBy: adminId
              },
              select: { id: true, email: true, name: true, status: true }
            });

            // Revoke all user sessions
            await prisma.session.updateMany({
              where: { userId },
              data: { isActive: false },
            });
            break;

          // Note: archive/unarchive actions removed
        // archivedAt field has been removed from schema
        // Use delete/restore actions instead

          case 'delete':
            // Prevent self-deletion
            if (userId === adminId) {
              throw new AppError('Cannot delete your own account', 400);
            }

            // Soft delete - move to trash
            result = await prisma.user.update({
              where: { id: userId },
              data: {
                deletedAt: new Date(),
                updatedBy: adminId
              },
              select: { id: true, email: true, name: true, deletedAt: true }
            });
            break;

          case 'restore':
            result = await prisma.user.update({
              where: { id: userId },
              data: {
                deletedAt: null,
                updatedBy: adminId
              },
              select: { id: true, email: true, name: true, deletedAt: true }
            });
            break;

          case 'permanent-delete':
            // Prevent self-deletion
            if (userId === adminId) {
              throw new AppError('Cannot permanently delete your own account', 400);
            }

            // Hard delete - actually delete records
            await prisma.$transaction([
              prisma.session.deleteMany({ where: { userId } }),
              prisma.userAssignment.deleteMany({ where: { userId } }),
              prisma.user.delete({ where: { id: userId } })
            ]);
            result = { id: userId, permanentlyDeleted: true };
            break;

          default:
            throw new AppError(`Invalid action: ${action}`, 400);
        }

        results.push({ userId, success: true, data: result });
      } catch (error: any) {
        errors.push({
          userId,
          success: false,
          error: error.message || 'Operation failed'
        });
      }
    }

    const summary = {
      total: userIds.length,
      successful: results.length,
      failed: errors.length,
      action
    };

    res.json(ResponseUtil.success(`Bulk ${action} completed`, {
      summary,
      results,
      errors
    }));
  });

  // Export users data
  exportUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user!.id;
    const {
      search,
      status,
      emailVerified,
      dateFrom,
      dateTo,
      format = 'json'
    } = req.query;

    // Verify admin has permission to export users
    const adminUserTenant = await prisma.userAssignment.findFirst({
      where: { userId: adminId },
      include: {
        role: {
          select: { level: true },
        },
      },
    });

    if (!await hasAdminAccess(adminId)) {
      throw new AppError('Insufficient permissions to export users', 403);
    }

    const where: any = {};

    // Apply filters (same as getAllUsers)
    if (search) {
      where.OR = [
        { email: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }

    if (status) {
      where.status = status as any;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified === 'true';
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerified: true,
        phone: true,
        timezone: true,
        language: true,
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
              },
            },
            role: {
              select: {
                displayName: true,
                level: true,
              },
            },
            status: true,
            isPrimary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for export
    const exportData = users.map(user => ({
      ID: user.id,
      Email: user.email,
      Name: user.name,
      Status: user.status,
      EmailVerified: user.emailVerified,
      Phone: user.phone || '',
      Timezone: user.timezone,
      Language: user.language,
      CreatedAt: user.createdAt,
      UpdatedAt: user.updatedAt,
      LastLoginAt: user.lastLoginAt || 'Never',
      Tenants: user.userAssignments.map(ua => `${ua.tenant.name} (${ua.role.displayName})`).join(', '),
      PrimaryTenant: user.userAssignments.find(ua => ua.isPrimary)?.tenant.name || 'None'
    }));

    if (format === 'csv') {
      // Convert to CSV
      const csv = this.convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json(ResponseUtil.success('Users exported successfully', exportData));
    }
  });

  // Helper method to convert data to CSV
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}