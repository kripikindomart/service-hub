// ========================================
// Service Hub 2.0 Models Index - Fixed
// ========================================

// Only export models that exist and match current schema
import { PrismaClient } from '@prisma/client'

// Export only working models
export {
  PermissionModel,
  RoleModel,
  UserRoleModel,
  PermissionEngine,
  type PermissionContext,
  type PermissionCheck,
  type EffectivePermission,
  type RoleInput,
  type UserRoleInput
} from './permission'

const prisma = new PrismaClient()

// ========================================
// Database Relationship Utilities
// ========================================

export class DatabaseRelationships {
  // Get tenant with all related data - FIXED to match actual schema
  static async getTenantWithRelations(tenantId: string) {
    return await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        userAssignments: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,  // FIXED: was firstName + lastName
                status: true
              }
            }
          }
        },
        // REMOVED: services, tenantRoles, databases, workflows, serviceIntegrations
        // These don't exist in current schema
        _count: {
          select: {
            userAssignments: true  // FIXED: Only count what exists
          }
        }
      }
    })
  }

  // Get user with assignments - FIXED method
  static async getUserWithAssignments(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userAssignments: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true
              }
            },
            role: true
          }
        }
      }
    })
  }

  // Get tenant with user count
  static async getTenantWithUserCount(tenantId: string) {
    return await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            userAssignments: true
          }
        }
      }
    })
  }

  // Get role with permissions - FIXED
  static async getRoleWithPermissions(roleId: string) {
    return await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    })
  }

  // Get permission with roles
  static async getPermissionWithRoles(permissionId: string) {
    return await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        rolePermissions: {
          include: {
            role: true
          }
        }
      }
    })
  }

  // Bulk operations helper
  static async bulkUpdateUserStatus(userIds: string[], status: string, updatedBy: string) {
    return await prisma.user.updateMany({
      where: {
        id: { in: userIds }
      },
      data: {
        status: status as any,
        updatedBy
      }
    })
  }

  // Get bulk action with results
  static async getBulkActionWithResults(actionId: string) {
    return await prisma.bulkAction.findUnique({
      where: { id: actionId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        executor: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        actionResults: true,
        _count: {
          select: {
            actionResults: true
          }
        }
      }
    })
  }
}

// Export simple typed interfaces that match the schema
export interface UserInfo {
  id: string
  email: string
  name: string
  status: string
}

export interface TenantInfo {
  id: string
  name: string
  slug: string
  status: string
}

export interface RoleInfo {
  id: string
  name: string
  description?: string
  permissions: any[]
}

// Legacy exports for backward compatibility
export const DatabaseHelpers = DatabaseRelationships

export default {
  DatabaseRelationships,
  DatabaseHelpers
}