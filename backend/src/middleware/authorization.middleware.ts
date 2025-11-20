import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/database.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './auth.middleware';

// ========================================
// Role-Based Access Control (RBAC) Middleware
// ========================================

export interface PermissionContext {
  resource: string;
  action: string;
  scope?: 'GLOBAL' | 'TENANT' | 'USER';
  resourceId?: string;
}

export interface RoleCheckOptions {
  requireAll?: boolean;
  allowSelf?: boolean;
  tenantScope?: boolean;
}

// Permission levels for hierarchy
export enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
  OWNER = 4
}

// Role hierarchy for inheritance
export const ROLE_HIERARCHY: Record<string, number> = {
  'USER': 1,
  'ADMIN': 2,
  'SUPER_ADMIN': 3,
  'SYSTEM_ADMIN': 4
};

/**
 * Check if user has specific role level
 */
export const hasRoleLevel = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 999;
  return userLevel >= requiredLevel;
};

/**
 * Get user's effective permissions for a specific tenant
 */
export const getUserPermissions = async (
  userId: string,
  tenantId?: string
): Promise<string[]> => {
  try {
    const userAssignments = await prisma.userAssignment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
        ...(tenantId && { tenantId })
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    const permissions = new Set<string>();

    for (const userAssignment of userAssignments) {
      const role = userAssignment.role;

      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission;

        // Build permission string with context
        const permissionString = `${permission.resource}:${permission.action}`;

        // Add scoped permission
        if (permission.scope && userAssignment.tenantId) {
          permissions.add(`${permissionString}:${permission.scope}:${userAssignment.tenantId}`);
        } else {
          permissions.add(permissionString);
        }

        // Add global permission if applicable
        if (permission.scope === 'ALL' || !permission.scope) {
          permissions.add(`${permissionString}:ALL`);
        }
      }
    }

    return Array.from(permissions);
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    return [];
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = async (
  userId: string,
  permission: PermissionContext,
  tenantId?: string
): Promise<boolean> => {
  try {
    const userPermissions = await getUserPermissions(userId, tenantId);

    // Check for exact permission match
    const exactPermission = `${permission.resource}:${permission.action}`;

    // Check global permission
    if (userPermissions.includes(`${exactPermission}:GLOBAL`)) {
      return true;
    }

    // Check tenant-scoped permission
    if (tenantId && userPermissions.includes(`${exactPermission}:TENANT:${tenantId}`)) {
      return true;
    }

    // Check user-scoped permission (for self-access)
    if (permission.resourceId && userPermissions.includes(`${exactPermission}:USER:${permission.resourceId}`)) {
      return true;
    }

    // Check generic permission (without scope)
    if (userPermissions.includes(exactPermission)) {
      return true;
    }

    // Check wildcard permissions
    const wildcardPermissions = userPermissions.filter(p =>
      p.includes('*') && matchesWildcard(p, exactPermission)
    );

    if (wildcardPermissions.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Match permission against wildcard pattern
 */
const matchesWildcard = (pattern: string, permission: string): boolean => {
  const patternParts = pattern.split(':');
  const permissionParts = permission.split(':');

  if (patternParts.length !== permissionParts.length) {
    return false;
  }

  return patternParts.every((part, index) =>
    part === '*' || part === permissionParts[index]
  );
};

/**
 * Middleware to check user permissions
 */
export const requirePermission = (
  permission: PermissionContext,
  options: RoleCheckOptions = {}
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const tenantId = req.tenant?.id || req.user.tenantId;

      // Allow self-access if configured
      if (options.allowSelf && permission.resourceId === userId) {
        next();
        return;
      }

      // Get user's current role for hierarchy check
      const currentUserAssignment = await prisma.userAssignment.findFirst({
        where: {
          userId,
          ...(tenantId && { tenantId }),
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          role: true
        },
        orderBy: {
          assignedAt: 'desc'
        }
      });

      if (!currentUserAssignment) {
        res.status(403).json({
          success: false,
          message: 'No role assigned',
          required: permission
        });
        return;
      }

      // Check role hierarchy for admin-level permissions
      if (permission.action === 'ADMIN' || permission.action === 'DELETE') {
        const requiredRole = permission.action === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN';
        if (!currentUserAssignment?.role || !hasRoleLevel(currentUserAssignment.role.name, requiredRole)) {
          res.status(403).json({
            success: false,
            message: `Insufficient role privileges. Required: ${requiredRole}`,
            current: currentUserAssignment?.role?.name || 'No role'
          });
          return;
        }
      }

      // Check specific permission
      const hasRequiredPermission = await hasPermission(userId, permission, tenantId);

      if (!hasRequiredPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: permission,
          currentRole: currentUserAssignment?.role?.name || 'No role'
        });
        return;
      }

      // Attach user permissions to request for downstream use
      (req as any).userPermissions = await getUserPermissions(userId, tenantId);
      (req as any).userRole = currentUserAssignment?.role;

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Middleware to check minimum role level
 */
export const requireRole = (minimumRole: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const tenantId = req.tenant?.id || req.user.tenantId;

      // Get user's current role
      const currentUserRole = await prisma.userAssignment.findFirst({
        where: {
          userId,
          ...(tenantId && { tenantId }),
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          role: true
        },
        orderBy: {
          assignedAt: 'desc'
        }
      });

      if (!currentUserRole) {
        res.status(403).json({
          success: false,
          message: 'No role assigned',
          required: minimumRole
        });
        return;
      }

      if (!hasRoleLevel(currentUserRole.role.name, minimumRole)) {
        res.status(403).json({
          success: false,
          message: `Insufficient role privileges. Required: ${minimumRole}`,
          current: currentUserRole.role.name
        });
        return;
      }

      // Attach user role to request for downstream use
      (req as any).userRole = currentUserRole.role;

      next();
    } catch (error) {
      logger.error('Role authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Middleware to ensure user can only access their own resources
 */
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const resourceId = req.params[resourceIdParam];

      // If user is trying to access their own resource, allow it
      if (resourceId === userId) {
        next();
        return;
      }

      // Otherwise, check if user has admin privileges
      const tenantId = req.tenant?.id || req.user.tenantId;
      const hasAdminPermission = await hasPermission(
        userId,
        { resource: 'user', action: 'admin', scope: 'TENANT' },
        tenantId
      );

      if (!hasAdminPermission) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
          required: { resource: 'user', action: 'admin', scope: 'TENANT' }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Ownership middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Middleware to check tenant-specific permissions
 */
export const requireTenantPermission = (action: string, resource?: string) => {
  return requirePermission({
    resource: resource || 'tenant',
    action,
    scope: 'TENANT'
  });
};

/**
 * Middleware to check user management permissions
 */
export const requireUserPermission = (action: string) => {
  return requirePermission({
    resource: 'user',
    action,
    scope: 'TENANT'
  });
};

/**
 * Middleware to check system admin permissions (global scope)
 */
export const requireSystemAdmin = requireRole('SYSTEM_ADMIN');

/**
 * Middleware to check super admin permissions
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Middleware to check admin permissions
 */
export const requireAdmin = requireRole('ADMIN');