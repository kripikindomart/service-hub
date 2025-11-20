import { PrismaClient } from '@prisma/client'
import { MenuLocation, Role, Permission, PermissionScope } from '@prisma/client'

const prisma = new PrismaClient()

// Define permissions needed for menus
const MENU_PERMISSIONS = [
  { name: 'VIEW_DASHBOARD', resource: 'DASHBOARD', action: 'READ', category: 'DASHBOARD' },
  { name: 'VIEW_USERS', resource: 'USERS', action: 'READ', category: 'USER_MANAGEMENT' },
  { name: 'MANAGE_USERS', resource: 'USERS', action: 'WRITE', category: 'USER_MANAGEMENT' },
  { name: 'VIEW_PERMISSIONS', resource: 'PERMISSIONS', action: 'READ', category: 'PERMISSIONS' },
  { name: 'MANAGE_PERMISSIONS', resource: 'PERMISSIONS', action: 'WRITE', category: 'PERMISSIONS' },
  { name: 'VIEW_ROLES', resource: 'ROLES', action: 'READ', category: 'ROLES' },
  { name: 'MANAGE_ROLES', resource: 'ROLES', action: 'WRITE', category: 'ROLES' },
  { name: 'VIEW_TENANTS', resource: 'TENANTS', action: 'READ', category: 'TENANT_MANAGEMENT' },
  { name: 'MANAGE_TENANTS', resource: 'TENANTS', action: 'WRITE', category: 'TENANT_MANAGEMENT' },
  { name: 'VIEW_ANALYTICS', resource: 'ANALYTICS', action: 'READ', category: 'ANALYTICS' },
  { name: 'VIEW_SETTINGS', resource: 'SETTINGS', action: 'READ', category: 'SETTINGS' },
  { name: 'MANAGE_SETTINGS', resource: 'SETTINGS', action: 'WRITE', category: 'SETTINGS' }
]

// Role permissions mapping
const ROLE_PERMISSIONS = {
  'SUPER_ADMIN': MENU_PERMISSIONS.map(p => p.name), // All permissions
  'ADMIN': [
    'VIEW_DASHBOARD',
    'VIEW_USERS',
    'MANAGE_USERS',
    'VIEW_PERMISSIONS',
    'VIEW_ROLES',
    'VIEW_TENANTS',
    'VIEW_ANALYTICS',
    'VIEW_SETTINGS'
  ],
  'MANAGER': [
    'VIEW_DASHBOARD',
    'VIEW_USERS',
    'VIEW_ANALYTICS',
    'VIEW_SETTINGS'
  ],
  'USER': [
    'VIEW_DASHBOARD'
  ]
}

// Menu structure based on actual frontend routes
const MENU_STRUCTURE = {
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
      name: 'pricing',
      label: 'Pricing',
      path: '#pricing',
      icon: '💰',
      order: 3,
      description: 'Pricing plans'
    },
    {
      name: 'about',
      label: 'About',
      path: '#about',
      icon: 'ℹ️',
      order: 4,
      description: 'About us'
    },
    {
      name: 'contact',
      label: 'Contact',
      path: '#contact',
      icon: '📧',
      order: 5,
      description: 'Contact information'
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

  // Sidebar menus (authenticated)
  SIDEBAR: [
    {
      name: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'Dashboard',
      order: 1,
      description: 'Main dashboard',
      permissions: ['VIEW_DASHBOARD']
    },
    {
      name: 'user_management',
      label: 'User Management',
      path: '/manager/users',
      icon: 'Users',
      order: 2,
      description: 'Manage users',
      permissions: ['VIEW_USERS'],
      children: [
        {
          name: 'user_list',
          label: 'All Users',
          path: '/manager/users',
          icon: 'UserGroup',
          order: 1,
          description: 'View all users',
          permissions: ['VIEW_USERS']
        },
        {
          name: 'user_create',
          label: 'Add User',
          path: '/manager/users?action=create',
          icon: 'UserPlus',
          order: 2,
          description: 'Create new user',
          permissions: ['MANAGE_USERS']
        }
      ]
    },
    {
      name: 'rbac_management',
      label: 'Access Control',
      path: '/manager/rbac',
      icon: 'Shield',
      order: 3,
      description: 'Roles and permissions',
      permissions: ['VIEW_ROLES'],
      children: [
        {
          name: 'roles',
          label: 'Roles',
          path: '/manager/rbac?tab=roles',
          icon: 'UserCog',
          order: 1,
          description: 'Manage roles',
          permissions: ['VIEW_ROLES']
        },
        {
          name: 'permissions',
          label: 'Permissions',
          path: '/manager/permissions',
          icon: 'Key',
          order: 2,
          description: 'Manage permissions',
          permissions: ['VIEW_PERMISSIONS']
        }
      ]
    },
    {
      name: 'tenant_management',
      label: 'Tenant Management',
      path: '/manager/tenants',
      icon: 'Building',
      order: 4,
      description: 'Manage tenants',
      permissions: ['VIEW_TENANTS']
    },
    {
      name: 'analytics',
      label: 'Analytics',
      path: '/manager/analytics',
      icon: 'BarChart',
      order: 5,
      description: 'Platform analytics',
      permissions: ['VIEW_ANALYTICS']
    },
    {
      name: 'settings',
      label: 'Settings',
      path: '/manager/settings',
      icon: 'Settings',
      order: 10,
      description: 'System settings',
      permissions: ['VIEW_SETTINGS']
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
      name: 'support',
      label: 'Support',
      path: '/support',
      icon: '🎧',
      order: 4,
      description: 'Support center'
    },
    {
      name: 'contact_footer',
      label: 'Contact',
      path: '/contact',
      icon: '📧',
      order: 5,
      description: 'Contact information'
    }
  ]
}

async function createPermissions() {
  console.log('🔐 Creating permissions...')

  for (const permission of MENU_PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        scope: PermissionScope.TENANT
      },
      update: {},
      create: {
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        scope: PermissionScope.TENANT,
        description: `Permission to ${permission.name.toLowerCase().replace(/_/g, ' ')}`,
        category: permission.category,
        isSystemPermission: true
      }
    })
  }

  console.log(`✅ Created ${MENU_PERMISSIONS.length} permissions`)
}

async function getTenantId(): Promise<string> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'demo-company' }
  })

  if (!tenant) {
    throw new Error('Demo tenant not found. Please run tenant seeds first.')
  }

  return tenant.id
}

async function createMenus(tenantId: string) {
  console.log('📋 Creating menus...')

  let totalMenus = 0

  for (const [location, menus] of Object.entries(MENU_STRUCTURE)) {
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
        category: location === 'HEADER' ? 'MAIN_NAV' : location === 'SIDEBAR' ? 'ADMINISTRATION' : 'FOOTER',
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
          showOnDesktop: true,
          permissions: menu.permissions || []
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
            category: location === 'HEADER' ? 'MAIN_NAV' : location === 'SIDEBAR' ? 'ADMINISTRATION' : 'FOOTER',
            location: location as MenuLocation,
            isActive: true,
            isPublic: location !== 'SIDEBAR',
            order: child.order,
            description: child.description,
            cssClass: location === 'HEADER' ? 'nav-link' : location === 'SIDEBAR' ? 'sidebar-menu-item' : 'footer-link',
            cssStyle: null,
            attributes: undefined,
            metadata: {
              showOnMobile: true,
              showOnDesktop: true,
              permissions: child.permissions || []
            }
          }

          await prisma.menu.create({ data: childData })
          totalMenus++
        }
      }
    }
  }

  console.log(`✅ Created ${totalMenus} menus`)
}

async function seedRolesWithPermissions() {
  console.log('👥 Assigning permissions to roles...')

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findFirst({
      where: { name: roleName }
    })

    if (role) {
      // Get permission IDs
      const permissions = await prisma.permission.findMany({
        where: {
          name: { in: permissionNames }
        }
      })

      // Clear existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id }
      })

      // Create new role permissions
      for (const permission of permissions) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id
          }
        })
      }

      console.log(`✅ Assigned ${permissions.length} permissions to ${roleName}`)
    } else {
      console.log(`⚠️  Role ${roleName} not found`)
    }
  }
}

async function main() {
  try {
    await createPermissions()

    const tenantId = await getTenantId()
    await createMenus(tenantId)

    await seedRolesWithPermissions()

    console.log('\n🎉 Menu seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`- Permissions: ${MENU_PERMISSIONS.length}`)
    console.log(`- Menu locations: ${Object.keys(MENU_STRUCTURE).length}`)
    console.log(`- Tenant ID: ${tenantId}`)

  } catch (error) {
    console.error('❌ Error seeding menus:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)