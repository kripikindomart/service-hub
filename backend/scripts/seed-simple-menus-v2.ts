import { PrismaClient } from '@prisma/client'
import { MenuLocation } from '@prisma/client'

const prisma = new PrismaClient()

// Simplified menu structure with proper categorization
const MENU_ITEMS = [
  // Core
  { name: 'dashboard', label: 'Dashboard', path: '/dashboard', order: 1 },
  { name: 'home_header', label: 'Home', path: '/', order: 2 },

  // User Management
  { name: 'user_management', label: 'User Management', path: '/manager/users', order: 10 },

  // System Administration
  { name: 'tenant_management', label: 'Tenant Management', path: '/manager/tenants', order: 20 },
  { name: 'rbac_management', label: 'Access Control', path: '/manager/rbac', order: 21 },
  { name: 'permission_management', label: 'Permissions', path: '/manager/permissions', order: 22 },

  // System Tools
  { name: 'system_analytics', label: 'System Analytics', path: '/system/analytics', order: 30 },
  { name: 'system_logs', label: 'System Logs', path: '/system/logs', order: 31 },

  // User Section
  { name: 'my_profile', label: 'My Profile', path: '/profile', order: 100 }
]

async function seedSimpleMenus() {
  try {
    console.log('🌱 Starting simple menu seeding...')

    // Get or find the System Core tenant
    const systemTenant = await prisma.tenant.findFirst({
      where: { slug: 'core' }
    })

    if (!systemTenant) {
      throw new Error('System Core tenant not found. Please run tenant seeding first.')
    }

    console.log(`🏢 Using tenant: ${systemTenant.name} (${systemTenant.id})`)

    // Delete existing menus for this tenant
    console.log('🗑️  Clearing existing menus...')
    await prisma.menu.deleteMany({
      where: { tenantId: systemTenant.id }
    })

    console.log('📋 Creating simple manager menus...')

    // Create sidebar menus
    const sidebarMenus = MENU_ITEMS.map(menu => ({
      name: menu.name,
      label: menu.label,
      path: menu.path,
      url: null,
      component: null,
      target: null,
      parentId: null,
      tenantId: systemTenant.id,
      category: menu.name === 'dashboard' ? 'DASHBOARD' : 'MANAGER_ADMIN',
      location: 'SIDEBAR' as MenuLocation,
      isActive: true,
      isPublic: false,
      order: menu.order,
      description: `${menu.label} page`,
      cssClass: 'sidebar-menu-item',
      cssStyle: null,
      metadata: {
        showOnMobile: true,
        showOnDesktop: true
      }
    }))

    // Create header menus (public)
    const headerMenus = MENU_ITEMS
      .filter(menu => menu.name.includes('header'))
      .map(menu => ({
        name: menu.name,
        label: menu.label,
        path: menu.path,
        url: null,
        component: null,
        target: null,
        parentId: null,
        tenantId: systemTenant.id,
        category: 'NAVIGATION',
        location: 'HEADER' as MenuLocation,
        isActive: true,
        isPublic: true,
        order: menu.order,
        description: `${menu.label} navigation`,
        cssClass: 'header-menu-item',
        cssStyle: null,
        metadata: {
          showOnMobile: true,
          showOnDesktop: true
        }
      }))

    // Create all menus
    const allMenus = [...sidebarMenus, ...headerMenus]

    const createdMenus = await prisma.menu.createMany({
      data: allMenus,
      skipDuplicates: true
    })

    console.log(`✅ Successfully created ${createdMenus.count} menus!`)

    // Display created menus
    console.log('\n📋 Created Menu Structure:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    allMenus.forEach(menu => {
      if (menu.location === 'HEADER') {
        console.log(`🌐 ${menu.label} → ${menu.path} (HEADER)`)
      } else {
        console.log(`📄 ${menu.label} → ${menu.path} (SIDEBAR)`)
      }
    })

  } catch (error) {
    console.error('❌ Error seeding menus:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedSimpleMenus()
  .then(() => {
    console.log('🎉 Menu seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Menu seeding failed:', error)
    process.exit(1)
  })