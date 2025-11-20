import { Request, Response } from 'express'
import { prisma } from '../database/database.service'
import { logger } from '../utils/logger'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
// import { requirePermission } from '../middleware/authorization.middleware'

export class RoleController {
  // Get all roles
  static async getRoles(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, type, level, status, page = 1, limit = 20 } = req.query

      const where: any = {}

      // Filter out deleted roles by default
      where.deletedAt = null

      // Apply filters
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { displayName: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ]
      }

      if (type) {
        where.type = type as string
      }

      if (level) {
        where.level = level as string
      }

      if (status) {
        where.isActive = status === 'active'
      }

      // Tenant filtering for non-system admins
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (!hasSystemAccess) {
        where.OR = [
          { tenantId: req.tenant?.id },
          { tenantId: null }
        ]
      }

      const skip = (Number(page) - 1) * Number(limit)

      const [roles, total] = await Promise.all([
        prisma.role.findMany({
          where,
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            },
            userAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true
                  }
                }
              },
              take: 5
            },
            tenant: req.tenant ? {
              select: {
                id: true,
                name: true,
                slug: true
              }
            } : false
          },
          orderBy: [
            { type: 'asc' },
            { level: 'desc' },
            { name: 'asc' }
          ],
          skip,
          take: Number(limit)
        }),
        prisma.role.count({ where })
      ])

      res.json({
        success: true,
        data: roles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      })
    } catch (error) {
      logger.error('Error fetching roles:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles'
      })
    }
  }

  // Get role by ID
  static async getRoleById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          },
          userAssignments: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  status: true
                }
              },
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
          tenant: true
        }
      })

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      // Check access permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (!hasSystemAccess && role.type === 'SYSTEM') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to system roles'
        })
      }

      if (!hasSystemAccess && role.tenantId !== req.tenant?.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to roles from other tenants'
        })
      }

      res.json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Error fetching role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role'
      })
    }
  }

  // Create new role
  static async createRole(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        name,
        displayName,
        description,
        type = 'TENANT',
        level = 'USER',
        tenantId,
        isSystemRole = false,
        isActive = true
      } = req.body

      // Validation
      if (!name || !displayName) {
        return res.status(400).json({
          success: false,
          message: 'Name and display name are required'
        })
      }

      // Check system role permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some((ua: any) =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can create system roles'
        })
      }

      if (level === 'SUPER_ADMIN' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can create super admin roles'
        })
      }

      // Check for duplicate name
      const existingRole = await prisma.role.findFirst({
        where: {
          name,
          tenantId: type === 'TENANT' ? (tenantId || req.tenant?.id) : null,
          deletedAt: null
        }
      })

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        })
      }

      const role = await prisma.role.create({
        data: {
          name,
          displayName,
          description,
          type,
          level,
          tenantId: type === 'TENANT' ? (tenantId || req.tenant?.id) : null,
          isSystemRole,
          isActive,
          createdBy: user?.id
        },
        include: {
          tenant: true
        }
      })

      logger.info(`Role created: ${role.name} by ${user?.email}`)

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      })
    } catch (error) {
      logger.error('Error creating role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create role'
      })
    }
  }

  // Update role
  static async updateRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const {
        name,
        displayName,
        description,
        type,
        level,
        tenantId,
        isSystemRole,
        isActive
      } = req.body

      const existingRole = await prisma.role.findUnique({
        where: { id }
      })

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      // Check permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (existingRole.type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can modify system roles'
        })
      }

      if (existingRole.isSystemRole && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system roles'
        })
      }

      // Check for duplicate name (if name is being changed)
      if (name && name !== existingRole.name) {
        const duplicateRole = await prisma.role.findFirst({
          where: {
            name,
            tenantId: existingRole.tenantId,
            deletedAt: null,
            id: { not: id }
          }
        })

        if (duplicateRole) {
          return res.status(400).json({
            success: false,
            message: 'Role with this name already exists'
          })
        }
      }

      const updateData: any = {
        updatedBy: user?.id
      }

      if (name !== undefined) updateData.name = name
      if (displayName !== undefined) updateData.displayName = displayName
      if (description !== undefined) updateData.description = description
      if (type !== undefined) updateData.type = type
      if (level !== undefined) updateData.level = level
      if (tenantId !== undefined) updateData.tenantId = tenantId
      if (isSystemRole !== undefined) updateData.isSystemRole = isSystemRole
      if (isActive !== undefined) updateData.isActive = isActive

      const role = await prisma.role.update({
        where: { id },
        data: updateData,
        include: {
          tenant: true
        }
      })

      logger.info(`Role updated: ${role.name} by ${user?.email}`)

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: role
      })
    } catch (error) {
      logger.error('Error updating role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update role'
      })
    }
  }

  // Delete role
  static async deleteRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      const existingRole = await prisma.role.findUnique({
        where: { id },
        include: {
          userAssignments: {
            where: { status: 'ACTIVE' }
          }
        }
      })

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      // Check permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (existingRole.type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can delete system roles'
        })
      }

      if (existingRole.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete system roles'
        })
      }

      // Check if role has active users
      if (existingRole.userAssignments.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete role with active user assignments'
        })
      }

      // Soft delete
      await prisma.role.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      })

      logger.info(`Role deleted: ${existingRole.name} by ${user?.email}`)

      res.json({
        success: true,
        message: 'Role deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete role'
      })
    }
  }

  // Get role permissions
  static async getRolePermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      })

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      // Check access permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (!hasSystemAccess && role.type === 'SYSTEM') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to system roles'
        })
      }

      res.json({
        success: true,
        data: role.rolePermissions.map(rp => rp.permission)
      })
    } catch (error) {
      logger.error('Error fetching role permissions:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role permissions'
      })
    }
  }

  // Get deleted roles (trash)
  static async getDeletedRoles(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, page = 1, limit = 20, tenantId } = req.query

      logger.info('🗑️ Fetching deleted roles:', { tenantId, search, page, limit })

      const where: any = {
        deletedAt: { not: null }
      }

      // Apply search filter
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { displayName: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ]
      }

      // Tenant filtering for non-system admins
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (!hasSystemAccess) {
        where.OR = [
          { tenantId: req.tenant?.id },
          { tenantId: null }
        ]
      }

      const skip = (Number(page) - 1) * Number(limit)

      const [roles, total] = await Promise.all([
        prisma.role.findMany({
          where,
          include: {
            rolePermissions: {
              include: {
                permission: true
              },
              take: 5
            },
            userAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true
                  }
                }
              },
              take: 5
            },
            tenant: req.tenant ? {
              select: {
                id: true,
                name: true,
                slug: true
              }
            } : false
          },
          orderBy: [
            { deletedAt: 'desc' },
            { name: 'asc' }
          ],
          skip,
          take: Number(limit)
        }),
        prisma.role.count({ where })
      ])

      logger.info('📦 Deleted roles found:', { count: roles.length, total })

      res.json({
        success: true,
        data: roles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      })
    } catch (error) {
      logger.error('Error fetching deleted roles:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deleted roles'
      })
    }
  }

  // Restore deleted role
  static async restoreRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      const existingRole = await prisma.role.findUnique({
        where: { id }
      })

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      if (!existingRole.deletedAt) {
        return res.status(400).json({
          success: false,
          message: 'Role is not deleted'
        })
      }

      // Check permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (existingRole.type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can restore system roles'
        })
      }

      // Restore role
      await prisma.role.update({
        where: { id },
        data: {
          deletedAt: null,
          isActive: true
        }
      })

      logger.info(`Role restored: ${existingRole.name} by ${user?.email}`)

      res.json({
        success: true,
        message: 'Role restored successfully'
      })
    } catch (error) {
      logger.error('Error restoring role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to restore role'
      })
    }
  }

  // Hard delete role (permanent deletion)
  static async hardDeleteRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      const existingRole = await prisma.role.findUnique({
        where: { id }
      })

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      if (!existingRole.deletedAt) {
        return res.status(400).json({
          success: false,
          message: 'Can only permanently delete roles that are already in trash'
        })
      }

      // Check permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (existingRole.type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can permanently delete system roles'
        })
      }

      if (existingRole.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot permanently delete system roles'
        })
      }

      // Delete related records first (due to foreign key constraints)
      await prisma.$transaction(async (tx) => {
        // Delete role permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        })

        // Delete user assignments
        await tx.userAssignment.deleteMany({
          where: { roleId: id }
        })

        // Hard delete the role
        await tx.role.delete({
          where: { id }
        })
      })

      logger.info(`Role permanently deleted: ${existingRole.name} by ${user?.email}`)

      res.json({
        success: true,
        message: 'Role permanently deleted'
      })
    } catch (error) {
      logger.error('Error permanently deleting role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to permanently delete role'
      })
    }
  }

  // Toggle role status (active/inactive)
  static async toggleRoleStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { isActive } = req.body

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        })
      }

      const existingRole = await prisma.role.findUnique({
        where: { id }
      })

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        })
      }

      if (existingRole.deletedAt) {
        return res.status(400).json({
          success: false,
          message: 'Cannot toggle status of deleted role'
        })
      }

      // Check permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (existingRole.type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can modify system roles'
        })
      }

      if (existingRole.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system roles'
        })
      }

      // Update role status
      const updatedRole = await prisma.role.update({
        where: { id },
        data: {
          isActive: isActive,
          updatedAt: new Date(),
          updatedBy: user?.id
        }
      })

      logger.info(`Role status updated: ${existingRole.name} (${existingRole.isActive ? 'active' : 'inactive'} → ${isActive ? 'active' : 'inactive'}) by ${user?.email}`)

      res.json({
        success: true,
        message: `Role ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          id: updatedRole.id,
          isActive: updatedRole.isActive
        }
      })
    } catch (error) {
      logger.error('Error toggling role status:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update role status'
      })
    }
  }

  // Duplicate role
  static async duplicateRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { displayName, name, description, level } = req.body

      // Validate required fields
      if (!displayName || !name) {
        return res.status(400).json({
          success: false,
          message: 'displayName and name are required'
        })
      }

      // Validate level
      const validLevels = ['GUEST', 'USER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']
      if (level && !validLevels.includes(level)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid level. Must be one of: ' + validLevels.join(', ')
        })
      }

      // Check if role name already exists
      const existingRoleByName = await prisma.role.findFirst({
        where: {
          name: name,
          deletedAt: null
        }
      })

      if (existingRoleByName) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        })
      }

      const sourceRole = await prisma.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      })

      if (!sourceRole) {
        return res.status(404).json({
          success: false,
          message: 'Source role not found'
        })
      }

      if (sourceRole.deletedAt) {
        return res.status(400).json({
          success: false,
          message: 'Cannot duplicate deleted role'
        })
      }

      // Check permissions
      const user = req.user
      const hasSystemAccess = user?.userAssignments?.some(ua =>
        ua.role?.type === 'SYSTEM' &&
        (ua.role?.level === 'SUPER_ADMIN' || ua.role?.level === 'ADMIN')
      )

      if (sourceRole.type === 'SYSTEM' && !hasSystemAccess) {
        return res.status(403).json({
          success: false,
          message: 'Only system administrators can duplicate system roles'
        })
      }

      if (sourceRole.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot duplicate system roles'
        })
      }

      // Use provided level or default to original role level
      const targetLevel = level || sourceRole.level

      // Create duplicate role with permissions
      const duplicatedRole = await prisma.$transaction(async (tx) => {
        // Create the role
        const newRole = await tx.role.create({
          data: {
            name: name,
            displayName: displayName,
            description: description || `${sourceRole.description} (Copy)`,
            type: sourceRole.type,
            level: targetLevel, // Use custom level or original
            tenantId: sourceRole.tenantId,
            isSystemRole: false, // Duplicated roles are not system roles
            isDefaultRole: false, // Duplicated roles are not default roles
            maxUsers: sourceRole.maxUsers,
            parentRoleId: sourceRole.parentRoleId,
            metadata: sourceRole.metadata || undefined,
            organizationId: sourceRole.organizationId,
            isActive: true, // Start as active
            createdBy: user?.id,
            updatedBy: user?.id
          }
        })

        // Copy permissions
        if (sourceRole.rolePermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: sourceRole.rolePermissions.map(rp => ({
              roleId: newRole.id,
              permissionId: rp.permissionId,
              grantedAt: new Date(),
              grantedBy: user?.id
            }))
          })
        }

        return newRole
      })

      logger.info(`Role duplicated: ${sourceRole.name} → ${name} (level: ${targetLevel}) by ${user?.email}`)

      res.json({
        success: true,
        message: 'Role duplicated successfully',
        data: duplicatedRole
      })
    } catch (error) {
      logger.error('Error duplicating role:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate role'
      })
    }
  }
}