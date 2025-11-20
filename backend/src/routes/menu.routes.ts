import { Router } from 'express'
import { MenuController } from '../controllers/menu.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireTenant } from '../middleware/auth.middleware'
// import { requirePermission } from '../middleware/authorization.middleware'

const router = Router()

// Initialize controller
const menuController = new MenuController()

// Public routes (no authentication required)
const publicRouter = Router()

// GET /api/v1/menus/public/header - Get public header menus for landing page
publicRouter.get('/header', async (req, res) => {
  try {
    const menuTree = await menuController.menuService.getMenuTree(undefined, 'HEADER')
    res.json({
      success: true,
      message: 'Header menus retrieved successfully',
      data: menuTree
    })
  } catch (error) {
    console.error('Error getting header menus:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// GET /api/v1/menus/public/footer - Get public footer menus for landing page
publicRouter.get('/footer', async (req, res) => {
  try {
    const menuTree = await menuController.menuService.getMenuTree(undefined, 'FOOTER')
    res.json({
      success: true,
      message: 'Footer menus retrieved successfully',
      data: menuTree
    })
  } catch (error) {
    console.error('Error getting footer menus:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Apply authentication middleware to all admin routes
router.use(authMiddleware)

// Apply tenant requirement to all admin routes
router.use(requireTenant)

// GET /api/v1/admin/menus - Get all menus
router.get('/', menuController.getMenus)

// GET /api/v1/admin/menus/tree - Get menu tree structure
router.get('/tree', menuController.getMenuTree)

// GET /api/v1/admin/menus/categories - Get menu categories
router.get('/categories', menuController.getMenuCategories)

// POST /api/v1/admin/menus/reorder - Reorder menu items
router.post('/reorder', menuController.reorderMenus)

// GET /api/v1/admin/menus/user/:userId - Get menus for specific user
router.get('/user/:userId', menuController.getUserMenus)

// GET /api/v1/admin/menus/:id - Get menu by ID
router.get('/:id', menuController.getMenuById)

// POST /api/v1/admin/menus - Create new menu
router.post('/', menuController.createMenu)

// PUT /api/v1/admin/menus/:id - Update menu
router.put('/:id', menuController.updateMenu)

// DELETE /api/v1/admin/menus/:id - Delete menu
router.delete('/:id', menuController.deleteMenu)

// POST /api/v1/admin/menus/:id/duplicate - Duplicate menu structure
router.post('/:id/duplicate', menuController.duplicateMenu)

export default router
export { publicRouter as publicMenuRoutes }