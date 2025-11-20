// Simplified Permission Models - Fixed for Current Schema
import { PrismaClient, RoleType, RoleLevel, PermissionScope, AssignmentStatus } from '@prisma/client'

const prisma = new PrismaClient()

// ========================================
// Permission Context Interface
// ========================================

export interface PermissionContext {
  tenantId?: string
  resourceId?: string
}

export interface PermissionCheck {
  userId: string
  permission: string
  context?: PermissionContext
}

export interface EffectivePermission {
  id: string
  name: string
  resource: string
  action: string
  scope: PermissionScope
  category?: string
  description?: string
}

// ========================================
// Permission Model
// ========================================

export class PermissionModel {
  // Get all permissions
  static async findAll(filters: {
    scope?: PermissionScope
    category?: string
    resource?: string
    action?: string
    search?: string
    page?: number
    limit?: number
  } = {}) {
    const {
      scope,
      category,
      resource,
      action,
      search,
      page = 1,
      limit = 50
    } = filters

    const where: any = {}

    if (scope) where.scope = scope
    if (category) where.category = category
    if (resource) where.resource = resource
    if (action) where.action = action
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const skip = (page - 1) * limit

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' }
        ]
      }),
      prisma.permission.count({ where })
    ])

    return {
      data: permissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // Get permission by ID
  static async findById(id: string) {
    return await prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                type: true,
                level: true
              }
            }
          }
        }
      }
    })
  }

  // Create permission
  static async create(data: {
    name: string
    resource: string
    action: string
    scope?: PermissionScope
    description?: string
    category?: string
    isSystemPermission?: boolean
  }) {
    return await prisma.permission.create({
      data: {
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
        resource: data.resource,
        action: data.action,
        scope: data.scope || PermissionScope.TENANT,
        description: data.description,
        category: data.category,
        isSystemPermission: data.isSystemPermission || false
      }
    })
  }

  // Update permission
  static async update(id: string, data: {
    name?: string
    resource?: string
    action?: string
    scope?: PermissionScope
    description?: string
    category?: string
  }) {
    const updateData: any = { ...data }
    if (data.name) {
      updateData.name = data.name.toLowerCase().replace(/\s+/g, '_')
    }

    return await prisma.permission.update({
      where: { id },
      data: updateData
    })
  }

  // Delete permission
  static async delete(id: string) {
    return await prisma.permission.delete({
      where: { id }
    })
  }

  // Parse permission template (simplified)
  static parsePermissionTemplate(name: string, context?: PermissionContext): string[] {
    return [name] // Simplified implementation
  }
}

// ========================================
// Role Model
// ========================================

export interface RoleInput {
  name: string
  displayName: string
  description?: string
  type: RoleType
  level: RoleLevel
  tenantId?: string
  isSystem?: boolean
  permissions: string[]
}

export class RoleModel {
  // Create new role
  static async create(data: RoleInput) {
    // Validate role name uniqueness
    const existingRole = await prisma.role.findFirst({
      where: {
        name: data.name,
        type: data.type
      }
    })

    if (existingRole) {
      throw new Error(`Role '${data.name}' already exists with type '${data.type}'`)
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name: data.name,
        displayName: data.displayName || data.name,
        description: data.description,
        type: data.type,
        level: data.level,
        tenantId: data.tenantId,
        isSystemRole: data.isSystem || false
      }
    })

    // Add permissions if provided
    if (data.permissions && data.permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissions.map(permissionId => ({
          roleId: role.id,
          permissionId,
          grantedBy: 'system'
        }))
      })
    }

    return role
  }

  // Get role with permissions
  static async findById(id: string) {
    return await prisma.role.findUnique({
      where: { id },
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

  // Get all roles
  static async findAll(filters: {
    type?: RoleType
    level?: RoleLevel
    tenantId?: string
    search?: string
    page?: number
    limit?: number
  } = {}) {
    const {
      type,
      level,
      tenantId,
      search,
      page = 1,
      limit = 20
    } = filters

    const where: any = {}
    if (type) where.type = type
    if (level) where.level = level
    if (tenantId) where.tenantId = tenantId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const skip = (page - 1) * limit

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { type: 'asc' },
          { level: 'asc' },
          { name: 'asc' }
        ]
      }),
      prisma.role.count({ where })
    ])

    return {
      data: roles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // Update role
  static async update(id: string, data: Partial<RoleInput>) {
    return await prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        displayName: data.displayName || data.name,
        description: data.description,
        type: data.type,
        level: data.level
      }
    })
  }

  // Delete role
  static async delete(id: string) {
    return await prisma.role.delete({
      where: { id }
    })
  }
}

// ========================================
// User Assignment Model
// ========================================

export interface UserRoleInput {
  userId: string
  tenantId: string
  roleId: string
  assignedBy: string
  expiresAt?: Date
}

export class UserRoleModel {
  // Assign user to role
  static async create(data: UserRoleInput) {
    return await prisma.userAssignment.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        roleId: data.roleId,
        assignedBy: data.assignedBy,
        expiresAt: data.expiresAt,
        status: AssignmentStatus.ACTIVE,
        isPrimary: false
      }
    })
  }

  // Remove user from role
  static async remove(userId: string, roleId: string, tenantId: string) {
    return await prisma.userAssignment.deleteMany({
      where: {
        userId,
        roleId,
        tenantId
      }
    })
  }

  // Get user's roles in tenant
  static async getUserRoles(userId: string, tenantId: string) {
    return await prisma.userAssignment.findMany({
      where: {
        userId,
        tenantId,
        status: AssignmentStatus.ACTIVE
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
    })
  }
}

// ========================================
// Permission Engine
// ========================================

export class PermissionEngine {
  // Check if user has permission
  static async checkPermission(userId: string, permissionName: string, context?: PermissionContext): Promise<boolean> {
    const userRoles = await UserRoleModel.getUserRoles(
      userId,
      context?.tenantId || ''
    )

    for (const userRole of userRoles) {
      const role = userRole.role

      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission

        // Skip if permission scope doesn't match context
        if (permission.scope === 'TENANT' && !context?.tenantId) continue
        if (permission.scope === 'ALL' && !context?.tenantId) continue

        // Parse permission templates
        const parsedNames = PermissionModel.parsePermissionTemplate(permission.name, context)

        if (parsedNames.includes(permissionName)) {
          return true
        }
      }
    }

    return false
  }

  // Get user's effective permissions
  static async getEffectivePermissions(userId: string, context?: PermissionContext): Promise<EffectivePermission[]> {
    const userRoles = await UserRoleModel.getUserRoles(
      userId,
      context?.tenantId || ''
    )

    const permissions = new Map<string, EffectivePermission>()

    for (const userRole of userRoles) {
      const role = userRole.role

      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission

        // Skip if permission scope doesn't match context
        if (permission.scope === 'TENANT' && !context?.tenantId) continue
        if (permission.scope === 'ALL' && !context?.tenantId) continue

        const permissionKey = `${permission.resource}:${permission.action}:${permission.scope}`

        if (!permissions.has(permissionKey)) {
          permissions.set(permissionKey, {
            id: permission.id,
            name: permission.name,
            resource: permission.resource,
            action: permission.action,
            scope: permission.scope,
            category: permission.category || undefined,
            description: permission.description || undefined
          })
        }
      }
    }

    return Array.from(permissions.values())
  }
}