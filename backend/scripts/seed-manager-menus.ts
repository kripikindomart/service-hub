import { PrismaClient } from '@prisma/client'
import { MenuLocation } from '@prisma/client'

const prisma = new PrismaClient()

// Manager menu structure with proper categorization and separators
const MANAGER_MENU_STRUCTURE = {
  // Core Management
  DASHBOARD: [
    { name: 'dashboard', label: 'Dashboard', path: '/dashboard', order: 1, icon: 'HomeIcon' }
  ],

  // User Management Section
  USER_MANAGEMENT: [
    { name: 'user_management', label: 'User Management', path: '/manager/users', order: 10, icon: 'UserGroupIcon' }
  ],

  // System Administration Section
  SYSTEM_ADMIN: [
    { name: 'tenant_management', label: 'Tenant Management', path: '/manager/tenants', order: 20, icon: 'BuildingOfficeIcon' },
    { name: 'rbac_management', label: 'Access Control (RBAC)', path: '/manager/rbac', order: 21, icon: 'ShieldCheckIcon' },
    { name: 'permission_management', label: 'Permissions', path: '/manager/permissions', order: 22, icon: 'KeyIcon' }
  ],

  // System Tools Section
  SYSTEM_TOOLS: [
    { name: 'system_analytics', label: 'System Analytics', path: '/system/analytics', order: 30, icon: 'ChartBarIcon' },
    { name: 'system_logs', label: 'System Logs', path: '/system/logs', order: 31, icon: 'DocumentTextIcon' }
  ],

  // User Section
  USER_SECTION: [
    { name: 'my_profile', label: 'My Profile', path: '/profile', order: 100, icon: 'UserCircleIcon' }
  ]
}

// Separator labels (non-clickable menu items with no paths)
const MENU_SEPARATORS = [
  { name: 'sep_core', label: 'Core', order: 5, path: null },
  { name: 'sep_user_mgmt', label: 'User Management', order: 15, path: null },
  { name: 'sep_system_admin', label: 'System Administration', order: 19, path: null },
  { name: 'sep_system_tools', label: 'System Tools', order: 29, path: null },
  { name: 'sep_user_section', label: 'User', order: 99, path: null }
]

async function seedManagerMenus() {
  try {
    console.log('🌱 Starting manager menu seeding...')

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

    // Create menus
    console.log('📋 Creating manager menus...')

    const allMenusToCreate = []

    // Add separator labels first
    for (const separator of MENU_SEPARATORS) {
      allMenusToCreate.push({
        ...separator,
        path: null, // Separators don't have paths
        url: null,
        component: null,
        target: null,
        parentId: null,
        tenantId: systemTenant.id,
        category: 'SYSTEM_ADMIN',
        location: 'SIDEBAR' as MenuLocation,
        isActive: true,
        isPublic: false,
        description: `${separator.label} section separator`,
        cssClass: 'sidebar-separator',
        cssStyle: 'font-weight: 600; text-transform: uppercase; font-size: 0.75rem; color: #6b7280; cursor: default;',
        metadata: {
          isSeparator: true,
          showOnMobile: true,
          showOnDesktop: true
        }
      })
    }

    // Add regular menu items
    for (const [category, menus] of Object.entries(MANAGER_MENU_STRUCTURE)) {
      for (const menu of menus) {
        allMenusToCreate.push({
          ...menu,
          url: null,
          component: null,
          target: null,
          parentId: null,
          tenantId: systemTenant.id,
          category: category === 'DASHBOARD' ? 'DASHBOARD' : 'MANAGER_ADMIN',
          location: 'SIDEBAR' as MenuLocation,
          isActive: true,
          isPublic: false,
          description: `${menu.label} management page`,
          cssClass: 'sidebar-menu-item',
          cssStyle: null,
          metadata: {
            icon: menu.icon,
            showOnMobile: true,
            showOnDesktop: true,
            badge: null
          }
        })
      }
    }

    // Sort by order before creating
    allMenusToCreate.sort((a, b) => a.order - b.order)

    // Create all menus in batch
    const createdMenus = await prisma.menu.createMany({
      data: allMenusToCreate,
      skipDuplicates: true
    })

    console.log(`✅ Successfully created ${createdMenus.count} manager menus!`)

    // Display created menus
    console.log('\n📋 Created Menu Structure:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const separator of MENU_SEPARATORS) {
      console.log(`\n📁 ${separator.label}`)

      // Find menus that belong to this section
      const sectionMenus = allMenusToCreate.filter(menu => {
        if (menu.order === separator.order) return false // Skip separator itself
        if (separator.order === 5) return menu.category === 'DASHBOARD'
        if (separator.order === 15) return menu.category === 'MANAGER_ADMIN' && menu.name === 'user_management'
        if (separator.order === 19) return menu.category === 'MANAGER_ADMIN' && ['tenant_management', 'rbac_management', 'permission_management'].includes(menu.name)
        if (separator.order === 29) return menu.category === 'MANAGER_ADMIN' && ['system_analytics', 'system_logs'].includes(menu.name)
        if (separator.order === 99) return menu.name === 'my_profile'
        return false
      }).sort((a, b) => a.order - b.order)

      sectionMenus.forEach(menu => {
        if (menu.metadata?.isSeparator) {
          console.log(`   ── ${menu.label}`)
        } else {
          console.log(`   📄 ${menu.label} → ${menu.path}`)
        }
      })
    }

    // Add Header menus (simplified)
    console.log('\n🌐 Creating Header menus...')
    const headerMenus = [
      { name: 'home_header', label: 'Home', path: '/', order: 1 },
      { name: 'dashboard_header', label: 'Dashboard', path: '/dashboard', order: 2 }
    ]

    for (const menu of headerMenus) {
      await prisma.menu.create({
        data: {
          ...menu,
          url: null,
          component: null,
          target: null,
          parentId: null,
          tenantId: systemTenant.id,
          category: 'NAVIGATION',
          location: 'HEADER' as MenuLocation,
          isActive: true,
          isPublic: true,
          description: `${menu.label} navigation`,
          cssClass: 'header-menu-item',
          cssStyle: null,
          metadata: {
            showOnMobile: true,
            showOnDesktop: true
          }
        }
      })
    }

    console.log(`✅ Header menus created!`)

  } catch (error) {
    console.error('❌ Error seeding manager menus:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedManagerMenus()
  .then(() => {
    console.log('🎉 Manager menu seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Manager menu seeding failed:', error)
    process.exit(1)
  })