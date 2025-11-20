import { PrismaClient, MenuLocation, PermissionScope } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive menu seeding based on frontend modules...')

  // Get core tenant and super admin user
  const coreTenant = await prisma.tenant.findFirst({
    where: { slug: 'core' }
  })

  const superAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@system.com' }
  })

  if (!coreTenant || !superAdmin) {
    throw new Error('Core tenant or super admin not found. Please run seed.ts first.')
  }

  console.log(`📋 Using tenant: ${coreTenant.name} (${coreTenant.id})`)
  console.log(`👤 Using admin: ${superAdmin.name} (${superAdmin.id})`)

  // Clear existing menus for core tenant only
  await prisma.menu.deleteMany({
    where: { tenantId: coreTenant.id }
  })
  console.log('🗑️ Cleared existing core tenant menus')

  // Get or create required permissions
  const permissions = await createOrGetPermissions()
  console.log('🔐 Permissions processed')

  // ========================================
  // 1. Create Header Menus (Public - Landing Page)
  // ========================================
  console.log('📋 Creating header menus...')

  const headerMenus = [
    {
      name: 'home',
      label: 'Home',
      icon: '🏠',
      path: '/',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'MAIN_NAV',
      isPublic: true,
      order: 1,
      description: 'Home page navigation'
    },
    {
      name: 'about',
      label: 'About',
      icon: 'ℹ️',
      path: '/about',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'MAIN_NAV',
      isPublic: true,
      order: 2,
      description: 'About us page'
    },
    {
      name: 'services',
      label: 'Services',
      icon: '⚡',
      path: '/services',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'MAIN_NAV',
      isPublic: true,
      order: 3,
      description: 'Our services page'
    },
    {
      name: 'pricing',
      label: 'Pricing',
      icon: '💰',
      path: '/pricing',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'MAIN_NAV',
      isPublic: true,
      order: 4,
      description: 'Pricing plans page'
    },
    {
      name: 'contact',
      label: 'Contact',
      icon: '📧',
      path: '/contact',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'MAIN_NAV',
      isPublic: true,
      order: 5,
      description: 'Contact us page'
    },
    {
      name: 'login',
      label: 'Login',
      icon: '🔐',
      path: '/login',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'AUTH',
      isPublic: true,
      order: 10,
      description: 'Login to dashboard'
    },
    {
      name: 'signup',
      label: 'Sign Up',
      icon: '🚀',
      path: '/register',
      url: null,
      target: null,
      location: MenuLocation.HEADER,
      category: 'AUTH',
      isPublic: true,
      order: 11,
      description: 'Create new account'
    },
    {
      name: 'external_docs',
      label: 'Documentation',
      icon: '📚',
      path: null,
      url: 'https://docs.servicehub.com',
      target: '_blank',
      location: MenuLocation.HEADER,
      category: 'EXTERNAL',
      isPublic: true,
      order: 20,
      description: 'External documentation link'
    }
  ]

  for (const menuData of headerMenus) {
    await prisma.menu.create({
      data: {
        ...menuData,
        tenantId: null, // Public menus don't belong to specific tenant
        cssClass: 'nav-link',
        metadata: {
          showOnMobile: true,
          showOnDesktop: true
        }
      }
    })
  }

  // ========================================
  // 2. Create Sidebar Menus (Dashboard)
  // ========================================
  console.log('📋 Creating sidebar menus...')

  if (demoTenant) {
    // Dashboard Root
    const dashboardMenu = await prisma.menu.create({
      data: {
        name: 'dashboard',
        label: 'Dashboard',
        icon: '📊',
        path: '/dashboard',
        component: 'DashboardPage',
        location: MenuLocation.SIDEBAR,
        category: 'DASHBOARD',
        isPublic: false,
        order: 1,
        description: 'Main dashboard',
        tenantId: demoTenant.id,
        cssClass: 'sidebar-menu-item',
        metadata: {
          icon: 'LayoutDashboard',
          badge: null,
          expanded: true
        }
      }
    })

    // User Management Section
    const userManagementMenu = await prisma.menu.create({
      data: {
        name: 'user_management',
        label: 'User Management',
        icon: '👥',
        path: '/manager/users',
        component: 'UserManagement',
        location: MenuLocation.SIDEBAR,
        category: 'ADMINISTRATION',
        isPublic: false,
        order: 2,
        description: 'Manage users',
        tenantId: demoTenant.id,
        cssClass: 'sidebar-menu-item',
        metadata: {
          icon: 'Users',
          badge: null,
          expanded: false
        }
      }
    })

    // RBAC Section
    const rbacMenu = await prisma.menu.create({
      data: {
        name: 'rbac',
        label: 'Access Control',
        icon: '🔐',
        path: '/manager/rbac',
        component: 'RbacPage',
        location: MenuLocation.SIDEBAR,
        category: 'ADMINISTRATION',
        isPublic: false,
        order: 3,
        description: 'Roles and permissions',
        tenantId: demoTenant.id,
        cssClass: 'sidebar-menu-item',
        metadata: {
          icon: 'Shield',
          badge: null,
          expanded: false
        }
      }
    })

    // RBAC Submenus
    await prisma.menu.createMany({
      data: [
        {
          name: 'rbac_roles',
          label: 'Roles',
          icon: '👤',
          path: '/manager/rbac/roles',
          component: 'RoleManagement',
          parentId: rbacMenu.id,
          location: MenuLocation.SIDEBAR,
          category: 'ADMINISTRATION',
          isPublic: false,
          order: 1,
          description: 'Manage roles',
          tenantId: demoTenant.id,
          cssClass: 'sidebar-submenu-item',
          metadata: {
            icon: 'UserCog',
            badge: null
          }
        },
        {
          name: 'rbac_permissions',
          label: 'Permissions',
          icon: '🔑',
          path: '/manager/rbac/permissions',
          component: 'PermissionManagement',
          parentId: rbacMenu.id,
          location: MenuLocation.SIDEBAR,
          category: 'ADMINISTRATION',
          isPublic: false,
          order: 2,
          description: 'Manage permissions',
          tenantId: demoTenant.id,
          cssClass: 'sidebar-submenu-item',
          metadata: {
            icon: 'Key',
            badge: null
          }
        },
        {
          name: 'rbac_assignments',
          label: 'Assignments',
          icon: '🔗',
          path: '/manager/rbac/assignments',
          component: 'UserAssignments',
          parentId: rbacMenu.id,
          location: MenuLocation.SIDEBAR,
          category: 'ADMINISTRATION',
          isPublic: false,
          order: 3,
          description: 'Manage user role assignments',
          tenantId: demoTenant.id,
          cssClass: 'sidebar-submenu-item',
          metadata: {
            icon: 'Link',
            badge: null
          }
        }
      ]
    })

    // Tenant Management
    const tenantMenu = await prisma.menu.create({
      data: {
        name: 'tenant_management',
        label: 'Tenant Management',
        icon: '🏢',
        path: '/manager/tenants',
        component: 'TenantManagement',
        location: MenuLocation.SIDEBAR,
        category: 'ADMINISTRATION',
        isPublic: false,
        order: 4,
        description: 'Manage tenants',
        tenantId: demoTenant.id,
        cssClass: 'sidebar-menu-item',
        metadata: {
          icon: 'Building',
          badge: null,
          expanded: false
        }
      }
    })

    // Settings Section
    const settingsMenu = await prisma.menu.create({
      data: {
        name: 'settings',
        label: 'Settings',
        icon: '⚙️',
        path: '/manager/settings',
        component: 'SettingsPage',
        location: MenuLocation.SIDEBAR,
        category: 'SETTINGS',
        isPublic: false,
        order: 10,
        description: 'System settings',
        tenantId: demoTenant.id,
        cssClass: 'sidebar-menu-item',
        metadata: {
          icon: 'Settings',
          badge: null,
          expanded: false
        }
      }
    })

    // Settings Submenus
    await prisma.menu.createMany({
      data: [
        {
          name: 'menu_management',
          label: 'Menu Management',
          icon: '📋',
          path: '/manager/menus',
          component: 'MenuManagement',
          parentId: settingsMenu.id,
          location: MenuLocation.SIDEBAR,
          category: 'SETTINGS',
          isPublic: false,
          order: 1,
          description: 'Manage navigation menus',
          tenantId: demoTenant.id,
          cssClass: 'sidebar-submenu-item',
          metadata: {
            icon: 'Menu',
            badge: 'New'
          }
        },
        {
          name: 'general_settings',
          label: 'General Settings',
          icon: '🔧',
          path: '/manager/settings/general',
          component: 'GeneralSettings',
          parentId: settingsMenu.id,
          location: MenuLocation.SIDEBAR,
          category: 'SETTINGS',
          isPublic: false,
          order: 2,
          description: 'General system settings',
          tenantId: demoTenant.id,
          cssClass: 'sidebar-submenu-item',
          metadata: {
            icon: 'Wrench',
            badge: null
          }
        }
      ]
    })

    // Profile Menu
    await prisma.menu.create({
      data: {
        name: 'profile',
        label: 'My Profile',
        icon: '👤',
        path: '/profile',
        component: 'ProfilePage',
        location: MenuLocation.SIDEBAR,
        category: 'USER',
        isPublic: false,
        order: 20,
        description: 'User profile settings',
        tenantId: demoTenant.id,
        cssClass: 'sidebar-menu-item profile-menu',
        metadata: {
          icon: 'User',
          badge: null,
          showOnMobile: true
        }
      }
    })
  }

  // ========================================
  // 3. Create Footer Menus (Public)
  // ========================================
  console.log('📋 Creating footer menus...')

  const footerMenus = [
    {
      name: 'footer_about',
      label: 'About Us',
      icon: null,
      path: '/about',
      url: null,
      target: null,
      location: MenuLocation.FOOTER,
      category: 'COMPANY',
      isPublic: true,
      order: 1,
      description: 'About us in footer'
    },
    {
      name: 'footer_privacy',
      label: 'Privacy Policy',
      icon: null,
      path: '/privacy',
      url: null,
      target: null,
      location: MenuLocation.FOOTER,
      category: 'LEGAL',
      isPublic: true,
      order: 10,
      description: 'Privacy policy'
    },
    {
      name: 'footer_terms',
      label: 'Terms of Service',
      icon: null,
      path: '/terms',
      url: null,
      target: null,
      location: MenuLocation.FOOTER,
      category: 'LEGAL',
      isPublic: true,
      order: 11,
      description: 'Terms of service'
    },
    {
      name: 'footer_contact',
      label: 'Contact',
      icon: null,
      path: '/contact',
      url: null,
      target: null,
      location: MenuLocation.FOOTER,
      category: 'SUPPORT',
      isPublic: true,
      order: 20,
      description: 'Contact in footer'
    },
    {
      name: 'footer_facebook',
      label: 'Facebook',
      icon: '📘',
      path: null,
      url: 'https://facebook.com/servicehub',
      target: '_blank',
      location: MenuLocation.FOOTER,
      category: 'SOCIAL',
      isPublic: true,
      order: 30,
      description: 'Facebook social link',
      cssClass: 'social-link',
      attributes: {
        'data-social': 'facebook'
      }
    },
    {
      name: 'footer_twitter',
      label: 'Twitter',
      icon: '🐦',
      path: null,
      url: 'https://twitter.com/servicehub',
      target: '_blank',
      location: MenuLocation.FOOTER,
      category: 'SOCIAL',
      isPublic: true,
      order: 31,
      description: 'Twitter social link',
      cssClass: 'social-link',
      attributes: {
        'data-social': 'twitter'
      }
    }
  ]

  for (const menuData of footerMenus) {
    await prisma.menu.create({
      data: {
        ...menuData,
        tenantId: null,
        cssClass: menuData.cssClass || 'footer-link'
      }
    })
  }

  console.log('✅ Menu seed data created successfully!')
  console.log('📊 Created menus by location:')

  const headerCount = await prisma.menu.count({ where: { location: MenuLocation.HEADER } })
  const sidebarCount = await prisma.menu.count({ where: { location: MenuLocation.SIDEBAR } })
  const footerCount = await prisma.menu.count({ where: { location: MenuLocation.FOOTER } })

  console.log(`   Header: ${headerCount} menus`)
  console.log(`   Sidebar: ${sidebarCount} menus`)
  console.log(`   Footer: ${footerCount} menus`)
  console.log(`   Total: ${headerCount + sidebarCount + footerCount} menus`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding menus:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })