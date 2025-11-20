import { PrismaClient } from '@prisma/client'
import { MenuLocation } from '@prisma/client'

const prisma = new PrismaClient()

// Menu structure for System Core tenant
const CORE_MENU_STRUCTURE = {
  // Header menus (public)
  HEADER: [
    {
      name: 'home',
      label: 'Home',
      path: '/',
      icon: '🏠',
      order: 1,
      description: 'Home page navigation'
    },
    {
      name: 'features',
      label: 'Features',
      path: '#features',
      icon: '⚡',
      order: 2,
      description: 'Platform features'
    },
    {
      name: 'login',
      label: 'Login',
      path: '/login',
      icon: '🔐',
      order: 10,
      description: 'Login to dashboard'
    }
  ],

  // Sidebar menus (authenticated - admin focused)
  SIDEBAR: [
    {
      name: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
      order: 1,
      description: 'Main dashboard'
    },
    {
      name: 'system_management',
      label: 'System Management',
      path: '/system',
      icon: 'Settings',
      order: 2,
      description: 'System administration',
      children: [
        {
          name: 'tenant_management',
          label: 'Tenant Management',
          path: '/system/tenants',
          icon: 'BuildingOffice',
          order: 1,
          description: 'Manage all tenants'
        },
        {
          name: 'user_management',
          label: 'User Management',
          path: '/system/users',
          icon: 'Users',
          order: 2,
          description: 'Manage all users'
        },
        {
          name: 'system_settings',
          label: 'System Settings',
          path: '/system/settings',
          icon: 'Settings',
          order: 3,
          description: 'System configuration'
        }
      ]
    },
    {
      name: 'rbac_management',
      label: 'Access Control',
      path: '/system/rbac',
      icon: 'Shield',
      order: 3,
      description: 'Roles and permissions',
      children: [
        {
          name: 'roles',
          label: 'Roles',
          path: '/system/rbac/roles',
          icon: 'UserCog',
          order: 1,
          description: 'Manage system roles'
        },
        {
          name: 'permissions',
          label: 'Permissions',
          path: '/system/rbac/permissions',
          icon: 'Key',
          order: 2,
          description: 'Manage system permissions'
        }
      ]
    },
    {
      name: 'analytics',
      label: 'System Analytics',
      path: '/system/analytics',
      icon: 'BarChart',
      order: 4,
      description: 'Platform analytics'
    },
    {
      name: 'logs',
      label: 'System Logs',
      path: '/system/logs',
      icon: 'FileText',
      order: 5,
      description: 'System logs and monitoring'
    },
    {
      name: 'profile',
      label: 'My Profile',
      path: '/profile',
      icon: 'User',
      order: 20,
      description: 'User profile settings'
    }
  ],

  // Footer menus (public)
  FOOTER: [
    {
      name: 'about_footer',
      label: 'About',
      path: '/about',
      icon: 'ℹ️',
      order: 1,
      description: 'About us page'
    },
    {
      name: 'privacy',
      label: 'Privacy Policy',
      path: '/privacy',
      icon: '🔒',
      order: 2,
      description: 'Privacy policy'
    },
    {
      name: 'terms',
      label: 'Terms of Service',
      path: '/terms',
      icon: '📄',
      order: 3,
      description: 'Terms of service'
    },
    {
      name: 'contact_footer',
      label: 'Contact',
      path: '/contact',
      icon: '📧',
      order: 4,
      description: 'Contact information'
    }
  ]
}

async function getCoreTenantId(): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'core' }
  })

  if (!tenant) {
    throw new Error('Core tenant not found!')
  }

  return tenant.id
}

async function createCoreMenus(tenantId: string) {
  console.log('📋 Creating menus for System Core tenant...')

  let totalMenus = 0

  for (const [location, menus] of Object.entries(CORE_MENU_STRUCTURE)) {
    console.log(`Creating ${location} menus...`)

    for (const menu of menus as any[]) {
      const menuData = {
        name: menu.name,
        label: menu.label,
        path: menu.path,
        component: null,
        url: null,
        target: null,
        parentId: null,
        tenantId,
        category: location === 'HEADER' ? 'MAIN_NAV' : location === 'SIDEBAR' ? 'SYSTEM_ADMIN' : 'FOOTER',
        location: location as MenuLocation,
        isActive: true,
        isPublic: location !== 'SIDEBAR',
        order: menu.order,
        description: menu.description,
        cssClass: location === 'HEADER' ? 'nav-link' : location === 'SIDEBAR' ? 'sidebar-menu-item' : 'footer-link',
        cssStyle: undefined,
        attributes: undefined,
        metadata: {
          showOnMobile: true,
          showOnDesktop: true
        }
      }

      const createdMenu = await prisma.menu.create({ data: menuData })
      totalMenus++

      // Create children if any
      if (menu.children) {
        for (const child of menu.children) {
          const childData = {
            name: child.name,
            label: child.label,
            path: child.path,
            component: null,
            url: null,
            target: null,
            parentId: createdMenu.id,
            tenantId,
            category: location === 'HEADER' ? 'MAIN_NAV' : location === 'SIDEBAR' ? 'SYSTEM_ADMIN' : 'FOOTER',
            location: location as MenuLocation,
            isActive: true,
            isPublic: location !== 'SIDEBAR',
            order: child.order,
            description: child.description,
            cssClass: location === 'HEADER' ? 'nav-link' : location === 'SIDEBAR' ? 'sidebar-menu-item' : 'footer-link',
            cssStyle: undefined,
            attributes: undefined,
            metadata: {
              showOnMobile: true,
              showOnDesktop: true
            }
          }

          await prisma.menu.create({ data: childData })
          totalMenus++
        }
      }
    }
  }

  console.log(`✅ Created ${totalMenus} menus for System Core tenant`)
}

async function main() {
  try {
    const tenantId = await getCoreTenantId()
    await createCoreMenus(tenantId)

    console.log('\n🎉 System Core menu seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`- Tenant ID: ${tenantId}`)
    console.log(`- Menu locations: ${Object.keys(CORE_MENU_STRUCTURE).length}`)

  } catch (error) {
    console.error('❌ Error seeding System Core menus:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)