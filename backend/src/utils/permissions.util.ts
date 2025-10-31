import { prisma } from '../database/database.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export interface PermissionCheck {
  resource: string;
  action: string;
  scope?: 'OWN' | 'TENANT' | 'ALL';
}

/**
 * Check if user has a specific permission
 */
export const hasPermission = async (
  userId: string,
  tenantId: string | null,
  permission: PermissionCheck
): Promise<boolean> => {
  try {
    // Check for permission:all first (super admin)
    const hasAllPermission = await prisma.rolePermission.findFirst({
      where: {
        role: {
          userAssignments: {
            some: {
              userId,
              status: 'ACTIVE',
              ...(tenantId && { tenantId }),
            },
          },
        },
        permission: {
          name: 'permission:all',
        },
      },
    });

    if (hasAllPermission) {
      return true;
    }

    // Check for specific permission
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: {
          userAssignments: {
            some: {
              userId,
              status: 'ACTIVE',
              ...(tenantId && { tenantId }),
            },
          },
        },
        permission: {
          resource: permission.resource,
          action: permission.action,
          ...(permission.scope && { scope: permission.scope }),
        },
      },
    });

    return !!rolePermission;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Check if user is super admin (has permission:all)
 */
export const isSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    const superAdminPermission = await prisma.rolePermission.findFirst({
      where: {
        role: {
          type: 'SYSTEM',
          userAssignments: {
            some: {
              userId,
              status: 'ACTIVE',
              tenant: {
                type: 'CORE',
              },
            },
          },
        },
        permission: {
          name: 'permission:all',
        },
      },
    });

    return !!superAdminPermission;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
};

/**
 * Check if user can access tenant resources
 */
export const canAccessTenant = async (
  userId: string,
  tenantId: string,
  permission: PermissionCheck
): Promise<boolean> => {
  // Super admins can access any tenant
  if (await isSuperAdmin(userId)) {
    return true;
  }

  // Check if user has active relationship with tenant
  const userAssignment = await prisma.userAssignment.findFirst({
    where: {
      userId,
      tenantId,
      status: 'ACTIVE',
    },
    include: {
      role: true,
    },
  });

  if (!userAssignment) {
    return false;
  }

  // Get role permissions for this user's role
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      roleId: userAssignment.roleId,
    },
    include: {
      permission: true,
    },
  });

  // Check for permission:all
  const hasAllPermission = rolePermissions.some(
    rp => rp.permission.name === 'permission:all'
  );

  if (hasAllPermission) {
    return true;
  }

  // Check for specific permission
  const hasSpecificPermission = rolePermissions.some(
    rp => {
      const perm = rp.permission;
      return (
        perm.resource === permission.resource &&
        perm.action === permission.action &&
        (!permission.scope || perm.scope === permission.scope)
      );
    }
  );

  return hasSpecificPermission;
};

/**
 * Legacy permission check for backward compatibility
 * TODO: Remove this function once all controllers are updated to use permission-based checks
 */
export const hasAdminAccess = async (userId: string): Promise<boolean> => {
  try {
    // Check if user is super admin first
    if (await isSuperAdmin(userId)) {
      return true;
    }

    // Check if user has admin-level permissions
    return await hasPermission(userId, null, {
      resource: 'users',
      action: 'write',
      scope: 'ALL'
    });
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

/**
 * Middleware to check permission for endpoint
 */
export const requirePermission = (permission: PermissionCheck) => {
  return async (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenant?.id || req.user?.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const hasAccess = await hasPermission(userId, tenantId || null, permission);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};