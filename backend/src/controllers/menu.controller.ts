import { Request, Response } from 'express'
import { MenuService } from '../services/menu/menu.service'
import { ResponseUtil } from '../utils/response.util'
import { CreateMenuData, UpdateMenuData, MenuReorderRequest, MenuDuplicateRequest } from '../services/types/menu.types'

export class MenuController {
  constructor(public menuService: MenuService = new MenuService()) {}

  /**
   * GET /api/v1/admin/menus
   * Get all menu items
   */
  getMenus = async (req: Request, res: Response) => {
    try {
      const {
        parentId,
        isActive,
        category,
        location,
        search,
        sortBy,
        sortOrder,
        page = 1,
        limit = 50
      } = req.query

      // Convert string to boolean
      const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined

      const menus = await this.menuService.getMenus({
        parentId: parentId as string | null | undefined,
        isActive: isActiveBool,
        category: category as string,
        location: location as 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM' | undefined,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      })

      // Apply pagination if parentId is null (root menus)
      let paginatedMenus = menus
      let pagination = null

      if (parentId === undefined || parentId === 'null') {
        const startIndex = (Number(page) - 1) * Number(limit)
        const endIndex = startIndex + Number(limit)
        paginatedMenus = menus.slice(startIndex, endIndex)

        pagination = {
          page: Number(page),
          limit: Number(limit),
          total: menus.length,
          totalPages: Math.ceil(menus.length / Number(limit))
        }
      }

      res.json(ResponseUtil.success('Menus retrieved successfully', {
        items: paginatedMenus,
        pagination
      }))
    } catch (error) {
      console.error('Error getting menus:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * GET /api/v1/admin/menus/:id
   * Get menu by ID
   */
  getMenuById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json(ResponseUtil.error('Menu ID is required'))
      }

      const menu = await this.menuService.getMenuById(id)

      if (!menu) {
        return res.status(404).json(ResponseUtil.error('Menu not found'))
      }

      res.json(ResponseUtil.success('Menu retrieved successfully', menu))
    } catch (error) {
      console.error('Error getting menu:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * POST /api/v1/admin/menus
   * Create new menu
   */
  createMenu = async (req: Request, res: Response) => {
    try {
      const menuData: CreateMenuData = req.body

      // Validate required fields
      if (!menuData.name || !menuData.label) {
        return res.status(400).json(ResponseUtil.error('Name and label are required'))
      }

      const menu = await this.menuService.createMenu(menuData)

      res.status(201).json(ResponseUtil.success('Menu created successfully', menu))
    } catch (error) {
      console.error('Error creating menu:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * PUT /api/v1/admin/menus/:id
   * Update menu
   */
  updateMenu = async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json(ResponseUtil.error('Menu ID is required'))
      }

      const updateData: UpdateMenuData = req.body

      const menu = await this.menuService.updateMenu(id, updateData)

      res.json(ResponseUtil.success('Menu updated successfully', menu))
    } catch (error) {
      console.error('Error updating menu:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * DELETE /api/v1/admin/menus/:id
   * Delete menu
   */
  deleteMenu = async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json(ResponseUtil.error('Menu ID is required'))
      }

      const { force } = req.query

      await this.menuService.deleteMenu(id, force === 'true')

      res.json(ResponseUtil.success('Menu deleted successfully', null))
    } catch (error: any) {
      console.error('Error deleting menu:', error)

      if (error.message.includes('Cannot delete menu with children')) {
        return res.status(400).json(ResponseUtil.error(error.message))
      }

      if (error.message.includes('Menu not found')) {
        return res.status(404).json(ResponseUtil.error(error.message))
      }

      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * GET /api/v1/admin/menus/tree
   * Get menu tree structure
   */
  getMenuTree = async (req: Request, res: Response) => {
    try {
      const { tenantId, location } = req.query

      const menuTree = await this.menuService.getMenuTree(
        tenantId as string | undefined,
        location as 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM' | undefined
      )

      res.json(ResponseUtil.success('Menu tree retrieved successfully', menuTree))
    } catch (error) {
      console.error('Error getting menu tree:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * GET /api/v1/admin/menus/user/:userId
   * Get menus for specific user
   */
  getUserMenus = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params

      if (!userId) {
        return res.status(400).json(ResponseUtil.error('User ID is required'))
      }

      const { tenantId, parentId } = req.query

      const menus = await this.menuService.getUserMenus(
        userId,
        tenantId as string | undefined,
        parentId as string | null | undefined
      )

      res.json(ResponseUtil.success('User menus retrieved successfully', menus))
    } catch (error) {
      console.error('Error getting user menus:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * POST /api/v1/admin/menus/reorder
   * Reorder menu items
   */
  reorderMenus = async (req: Request, res: Response) => {
    try {
      const { menuOrders }: MenuReorderRequest = req.body

      if (!Array.isArray(menuOrders) || menuOrders.length === 0) {
        return res.status(400).json(ResponseUtil.error('menuOrders array is required'))
      }

      await this.menuService.reorderMenus(menuOrders)

      res.json(ResponseUtil.success('Menus reordered successfully', null))
    } catch (error) {
      console.error('Error reordering menus:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * POST /api/v1/admin/menus/:id/duplicate
   * Duplicate menu structure
   */
  duplicateMenu = async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json(ResponseUtil.error('Menu ID is required'))
      }

      const duplicateData: MenuDuplicateRequest = req.body

      const duplicatedMenu = await this.menuService.duplicateMenu(id, duplicateData)

      res.status(201).json(ResponseUtil.success('Menu duplicated successfully', duplicatedMenu))
    } catch (error: any) {
      console.error('Error duplicating menu:', error)

      if (error.message.includes('Menu not found')) {
        return res.status(404).json(ResponseUtil.error(error.message))
      }

      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }

  /**
   * GET /api/v1/admin/menus/categories
   * Get menu categories
   */
  getMenuCategories = async (req: Request, res: Response) => {
    try {
      // For now, return static categories. In future, this could be dynamic
      const categories = [
        { value: 'ADMINISTRATION', label: 'Administration' },
        { value: 'USER_MANAGEMENT', label: 'User Management' },
        { value: 'SYSTEM', label: 'System' },
        { value: 'REPORTING', label: 'Reporting' },
        { value: 'SETTINGS', label: 'Settings' },
        { value: 'DASHBOARD', label: 'Dashboard' },
        { value: 'TOOLS', label: 'Tools' }
      ]

      res.json(ResponseUtil.success('Menu categories retrieved successfully', categories))
    } catch (error) {
      console.error('Error getting menu categories:', error)
      res.status(500).json(ResponseUtil.error('Internal server error'))
    }
  }
}