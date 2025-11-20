import { PrismaClient } from '@prisma/client'
import { CreateMenuData, UpdateMenuData, MenuQuery, MenuItem } from '../types/menu.types'

export class MenuService {
  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  /**
   * Get all menu items with hierarchical structure
   */
  async getMenus(query: MenuQuery = {}): Promise<MenuItem[]> {
    const {
      parentId,
      isActive,
      category,
      tenantId,
      search,
      sortBy = 'order',
      sortOrder = 'asc'
    } = query

    // Build where clause
    const where: any = {}

    if (parentId !== undefined) {
      where.parentId = parentId === null ? null : parentId
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (category) {
      where.category = category
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get menus from database
    const menus = await this.prisma.menu.findMany({
      where: {
        ...where,
        // Add location filter if specified
        ...(query.location && { location: query.location })
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        children: false, // We'll build hierarchy manually
        parent: true,
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    // Build hierarchical structure
    return this.buildMenuHierarchy(menus, parentId)
  }

  /**
   * Get menu by ID
   */
  async getMenuById(id: string): Promise<MenuItem | null> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { order: 'asc' }
        },
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    if (!menu) return null

    return this.formatMenu(menu)
  }

  /**
   * Create new menu item
   */
  async createMenu(data: CreateMenuData): Promise<MenuItem> {
    // Get max order for siblings
    const maxOrder = await this.getMaxOrder(data.parentId, data.tenantId)

    const menu = await this.prisma.menu.create({
      data: {
        ...data,
        order: data.order ?? maxOrder + 1
      },
      include: {
        parent: true,
        children: false,
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    return this.formatMenu(menu)
  }

  /**
   * Update menu item
   */
  async updateMenu(id: string, data: UpdateMenuData): Promise<MenuItem> {
    const menu = await this.prisma.menu.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: false,
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    return this.formatMenu(menu)
  }

  /**
   * Delete menu item
   */
  async deleteMenu(id: string, force: boolean = false): Promise<void> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        children: true
      }
    })

    if (!menu) {
      throw new Error('Menu not found')
    }

    // Check if has children
    if (menu.children.length > 0 && !force) {
      throw new Error('Cannot delete menu with children. Use force=true to delete with children.')
    }

    if (menu.children.length > 0 && force) {
      // Delete all children recursively
      await this.deleteMenuRecursive(menu.id)
    }

    // Delete the menu
    await this.prisma.menu.delete({
      where: { id }
    })
  }

  /**
   * Get menus for a specific user based on their permissions
   */
  async getUserMenus(
    userId: string,
    tenantId?: string,
    parentId?: string | null
  ): Promise<MenuItem[]> {
    // Get user permissions through roles
    const userPermissions = await this.getUserPermissions(userId, tenantId)

    // Get menus that user has access to
    const menus = await this.prisma.menu.findMany({
      where: {
        parentId: parentId === null ? null : parentId,
        tenantId: tenantId || null,
        isActive: true,
        OR: [
          // Menus that don't require specific permissions
          { permissions: { none: {} } },
          // Menus that user has permissions for
          {
            permissions: {
              some: {
                permission: {
                  name: {
                    in: userPermissions
                  }
                }
              }
            }
          }
        ]
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    // Build hierarchical structure with children
    const menuItems = menus.map(menu => this.formatMenu(menu))

    // Add children recursively
    for (const menuItem of menuItems) {
      menuItem.children = await this.getUserMenus(userId, tenantId, menuItem.id)
    }

    return menuItems
  }

  /**
   * Reorder menu items
   */
  async reorderMenus(menuOrders: { id: string; order: number; parentId?: string | null }[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const { id, order, parentId } of menuOrders) {
        await tx.menu.update({
          where: { id },
          data: {
            order,
            parentId: parentId === null ? null : parentId
          }
        })
      }
    })
  }

  /**
   * Duplicate menu structure
   */
  async duplicateMenu(
    id: string,
    data: {
      name?: string
      label?: string
      tenantId?: string
    }
  ): Promise<MenuItem> {
    const originalMenu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        permissions: true,
        children: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!originalMenu) {
      throw new Error('Menu not found')
    }

    // Create new menu
    const newMenu = await this.prisma.menu.create({
      data: {
        name: data.name || `${originalMenu.name}_copy`,
        label: data.label || `${originalMenu.label} (Copy)`,
        icon: originalMenu.icon,
        path: originalMenu.path,
        component: originalMenu.component,
        parentId: originalMenu.parentId,
        tenantId: data.tenantId || originalMenu.tenantId,
        category: originalMenu.category,
        isActive: originalMenu.isActive,
        isPublic: originalMenu.isPublic,
        order: await this.getMaxOrder(originalMenu.parentId, data.tenantId) + 1,
        metadata: originalMenu.metadata || {}
      }
    })

    // Copy permissions
    if (originalMenu.permissions.length > 0) {
      await this.prisma.menuPermission.createMany({
        data: originalMenu.permissions.map(mp => ({
          menuId: newMenu.id,
          permissionId: mp.permissionId
        }))
      })
    }

    // Copy children recursively
    await this.duplicateMenuChildren(originalMenu.id, newMenu.id, data.tenantId)

    const resultMenu = await this.getMenuById(newMenu.id)
    if (!resultMenu) {
      throw new Error('Failed to retrieve duplicated menu')
    }
    return resultMenu
  }

  /**
   * Get menu tree structure for display
   */
  async getMenuTree(tenantId?: string, location?: string): Promise<MenuItem[]> {
    // Get ALL menus (not just root)
    const allMenus = await this.prisma.menu.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(location && { location: location as 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM' })
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        parent: true,
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    // Build hierarchical structure from ALL menus
    return this.buildMenuHierarchy(allMenus, null)
  }

  // Private helper methods

  private buildMenuHierarchy(menus: any[], parentId?: string | null): MenuItem[] {
    return menus
      .filter(menu =>
        (parentId === undefined && menu.parentId === null) ||
        menu.parentId === parentId
      )
      .map(menu => ({
        ...this.formatMenu(menu),
        children: this.buildMenuHierarchy(menus, menu.id)
      }))
  }

  private formatMenu(menu: any): MenuItem {
    return {
      id: menu.id,
      name: menu.name,
      label: menu.label,
      icon: menu.icon,
      path: menu.path,
      component: menu.component,
      url: menu.url,
      target: menu.target,
      parentId: menu.parentId,
      tenantId: menu.tenantId,
      category: menu.category,
      location: menu.location,
      isActive: menu.isActive,
      isPublic: menu.isPublic,
      order: menu.order,
      description: menu.description,
      cssClass: menu.cssClass,
      cssStyle: menu.cssStyle,
      attributes: menu.attributes,
      metadata: menu.metadata,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
      parent: menu.parent ? this.formatMenu(menu.parent) : undefined,
      children: [],
      permissions: menu.permissions?.map((mp: any) => ({
        id: mp.permission.id,
        name: mp.permission.name,
        resource: mp.permission.resource,
        action: mp.permission.action,
        scope: mp.permission.scope
      })) || []
    }
  }

  private async getMaxOrder(parentId?: string | null, tenantId?: string | null): Promise<number> {
    const max = await this.prisma.menu.aggregate({
      where: {
        parentId: parentId === null ? null : parentId,
        tenantId: tenantId || null
      },
      _max: {
        order: true
      }
    })

    return max._max.order || 0
  }

  private async getUserPermissions(userId: string, tenantId?: string): Promise<string[]> {
    // This would query user permissions through roles
    // For now, return empty array (public access)
    return []
  }

  private async deleteMenuRecursive(parentId: string): Promise<void> {
    const children = await this.prisma.menu.findMany({
      where: { parentId }
    })

    for (const child of children) {
      await this.deleteMenuRecursive(child.id)
      await this.prisma.menu.delete({
        where: { id: child.id }
      })
    }
  }

  private async duplicateMenuChildren(
    originalParentId: string,
    newParentId: string,
    tenantId?: string
  ): Promise<void> {
    const children = await this.prisma.menu.findMany({
      where: { parentId: originalParentId },
      include: { permissions: true },
      orderBy: { order: 'asc' }
    })

    for (const child of children) {
      const newChild = await this.prisma.menu.create({
        data: {
          name: child.name,
          label: child.label,
          icon: child.icon,
          path: child.path,
          component: child.component,
          parentId: newParentId,
          tenantId: tenantId || child.tenantId,
          category: child.category,
          isActive: child.isActive,
          isPublic: child.isPublic,
          order: child.order,
          description: child.description,
          metadata: child.metadata || {}
        }
      })

      // Copy permissions
      if (child.permissions.length > 0) {
        await this.prisma.menuPermission.createMany({
          data: child.permissions.map(mp => ({
            menuId: newChild.id,
            permissionId: mp.permissionId
          }))
        })
      }

      // Recursively copy children
      await this.duplicateMenuChildren(child.id, newChild.id, tenantId)
    }
  }
}