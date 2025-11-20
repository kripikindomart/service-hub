import { PrismaClient, MenuLocation, PermissionScope } from '@prisma/client'

const prisma = new PrismaClient()

async function seedMenus() {
  console.log('🌱 Starting menu seeding based on frontend modules...')

  try {
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

    // Clear existing menus for core tenant
    await prisma.menu.deleteMany({
      where: { tenantId: coreTenant.id }
    })
    console.log('🗑️ Cleared existing menus')

    // Get or create required permissions
    const permissions = await createOrGetPermissions()

    // Create menu structure based on frontend modules
    const menus = [
      // === DASHBOARD MODULE ===
      {
        name: 'dashboard',
        label: 'Dashboard',
        icon: 'HomeIcon',
        path: '/dashboard',
        location: MenuLocation.SIDEBAR,
        order: 1,
        description: 'Main dashboard with overview and analytics',
        category: 'main',
        permissions: ['dashboard:read']
      },

      // === MANAGER MODULE (PARENT) ===
      {
        name: 'manager',
        label: 'Management',
        icon: 'ShieldCheckIcon',
        path: '/manager',
        location: MenuLocation.SIDEBAR,
        order: 2,
        description: 'System management and administration',
        category: 'management',
        isParent: true
      },

      // User Management
      {
        name: 'manager-users',
        label: 'User Management',
        icon: 'UserGroupIcon',
        path: '/manager/users',
        location: MenuLocation.SIDEBAR,
        order: 1,
        description: 'Manage users across all tenants',
        category: 'management',
        parentId: 'manager',
        permissions: ['users:read', 'users:write', 'users:activate', 'users:deactivate']
      },

      // Tenant Management
      {
        name: 'manager-tenants',
        label: 'Tenant Management',
        icon: 'BuildingOfficeIcon',
        path: '/manager/tenants',
        location: MenuLocation.SIDEBAR,
        order: 2,
        description: 'Manage tenants and configurations',
        category: 'management',
        parentId: 'manager',
        permissions: ['tenants:read', 'tenants:write', 'tenants:activate', 'tenants:deactivate']
      },

      // RBAC Management (Parent)
      {
        name: 'manager-rbac',
        label: 'Access Control',
        icon: 'ShieldCheckIcon',
        path: '/manager/rbac',
        location: MenuLocation.SIDEBAR,
        order: 3,
        description: 'Role-based access control management',
        category: 'rbac',
        parentId: 'manager',
        isParent: true
      },

      // RBAC - Roles
      {
        name: 'rbac-roles',
        label: 'Roles',
        icon: 'ShieldCheckIcon',
        path: '/manager/rbac/roles',
        location: MenuLocation.SIDEBAR,
        order: 1,
        description: 'Manage system and tenant roles',
        category: 'rbac',
        parentId: 'manager-rbac',
        permissions: ['roles:read', 'roles:write', 'roles:delete']
      },

      // RBAC - Permissions
      {
        name: 'rbac-permissions',
        label: 'Permissions',
        icon: 'ShieldCheckIcon',
        path: '/manager/rbac/permissions',
        location: MenuLocation.SIDEBAR,
        order: 2,
        description: 'Manage system permissions',
        category: 'rbac',
        parentId: 'manager-rbac',
        permissions: ['permissions:read', 'permissions:write']
      },

      // RBAC - Assignments
      {
        name: 'rbac-assignments',
        label: 'Assignments',
        icon: 'UserGroupIcon',
        path: '/manager/rbac/assignments',
        location: MenuLocation.SIDEBAR,
        order: 3,
        description: 'Manage user-role assignments',
        category: 'rbac',
        parentId: 'manager-rbac',
        permissions: ['assignments:read', 'assignments:write']
      },

      // Permission Management (Standalone)
      {
        name: 'manager-permissions',
        label: 'Permission Manager',
        icon: 'ShieldCheckIcon',
        path: '/manager/permissions',
        location: MenuLocation.SIDEBAR,
        order: 4,
        description: 'Advanced permission management',
        category: 'management',
        parentId: 'manager',
        permissions: ['permissions:read', 'permissions:write', 'permissions:delete']
      },

      // === SYSTEM MODULE (PARENT) ===
      {
        name: 'system',
        label: 'System',
        icon: 'CogIcon',
        path: '/system',
        location: MenuLocation.SIDEBAR,
        order: 3,
        description: 'System configuration and monitoring',
        category: 'system',
        isParent: true
      },

      // System Settings
      {
        name: 'system-settings',
        label: 'Settings',
        icon: 'CogIcon',
        path: '/system/settings',
        location: MenuLocation.SIDEBAR,
        order: 1,
        description: 'System configuration',
        category: 'system',
        parentId: 'system',
        permissions: ['system:read', 'system:write']
      },

      // System Audit
      {
        name: 'system-audit',
        label: 'Audit Logs',
        icon: 'DocumentTextIcon',
        path: '/system/audit',
        location: MenuLocation.SIDEBAR,
        order: 2,
        description: 'System audit and activity logs',
        category: 'system',
        parentId: 'system',
        permissions: ['audit:read']
      },

      // System Health
      {
        name: 'system-health',
        label: 'System Health',
        icon: 'HeartIcon',
        path: '/system/health',
        location: MenuLocation.SIDEBAR,
        order: 3,
        description: 'System health and monitoring',
        category: 'system',
        parentId: 'system',
        permissions: ['system:read']
      },

      // === DEVELOPMENT MODULE ===
      {
        name: 'development',
        label: 'Development',
        icon: 'CodeBracketIcon',
        path: '/development',
        location: MenuLocation.SIDEBAR,
        order: 4,
        description: 'Development and testing tools',
        category: 'development',
        isParent: true
      },

      // Menu Testing
      {
        name: 'test-menu',
        label: 'Menu Test',
        icon: 'BeakerIcon',
        path: '/test-menu',
        location: MenuLocation.SIDEBAR,
        order: 1,
        description: 'Menu system testing and debugging',
        category: 'development',
        parentId: 'development',
        permissions: ['system:read']
      },

      // API Documentation
      {
        name: 'api-docs',
        label: 'API Docs',
        icon: 'BookOpenIcon',
        path: '/development/api-docs',
        location: MenuLocation.SIDEBAR,
        order: 2,
        description: 'API documentation and testing',
        category: 'development',
        parentId: 'development',
        permissions: ['system:read']
      }
    ]

    // Create menus and track parent-child relationships
    const createdMenus: Record<string, any> = {}

    // First pass: Create parent menus
    for (const menuData of menus.filter(m => !m.parentId)) {
      const menu = await createMenu({
        ...menuData,
        tenantId: coreTenant.id,
        createdBy: superAdmin.id,
        parentId: null
      }, permissions)

      if (menu) {
        createdMenus[menuData.name] = menu
        console.log(`✅ Created parent menu: ${menu.label} (${menu.path})`)
      }
    }

    // Second pass: Create child menus
    for (const menuData of menus.filter(m => m.parentId)) {
      if (menuData.parentId && createdMenus[menuData.parentId]) {
        const menu = await createMenu({
          ...menuData,
          tenantId: coreTenant.id,
          createdBy: superAdmin.id,
          parentId: createdMenus[menuData.parentId].id
        }, permissions)

        if (menu) {
          createdMenus[menuData.name] = menu
          console.log(`  ✅ Created child menu: ${menu.label} (${menu.path})`)
        }
      }
    }

    console.log(`\n🎉 Menu seeding completed! Created ${Object.keys(createdMenus).length} menus`)

    // Verify menu structure
    const finalMenus = await prisma.menu.findMany({
      where: { tenantId: coreTenant.id },
      orderBy: { order: 'asc' },
      include: {
        permissions: {
          include: { permission: true }
        },
        children: true,
        parent: true
      }
    })

    console.log('\n📊 Final Menu Structure:')
    printMenuTree(finalMenus.filter(m => !m.parentId), 0)

  } catch (error) {
    console.error('❌ Error seeding menus:', error)
    throw error
  }
}

async function createOrGetPermissions() {
  console.log('\n🔐 Creating/getting permissions...')

  const requiredPermissions = [
    // Dashboard permissions
    { name: 'dashboard:read', resource: 'dashboard', action: 'read', scope: PermissionScope.TENANT, description: 'View dashboard and analytics', category: 'Dashboard' },

    // User permissions
    { name: 'users:read', resource: 'users', action: 'read', scope: PermissionScope.ALL, description: 'Read user data across all tenants', category: 'User Management' },
    { name: 'users:write', resource: 'users', action: 'write', scope: PermissionScope.ALL, description: 'Write user data across all tenants', category: 'User Management' },
    { name: 'users:activate', resource: 'users', action: 'activate', scope: PermissionScope.ALL, description: 'Activate users across all tenants', category: 'User Management' },
    { name: 'users:deactivate', resource: 'users', action: 'deactivate', scope: PermissionScope.ALL, description: 'Deactivate users across all tenants', category: 'User Management' },
    { name: 'users:delete', resource: 'users', action: 'delete', scope: PermissionScope.ALL, description: 'Delete users across all tenants', category: 'User Management' },

    // Tenant permissions
    { name: 'tenants:read', resource: 'tenants', action: 'read', scope: PermissionScope.ALL, description: 'Read tenant data across all tenants', category: 'Tenant Management' },
    { name: 'tenants:write', resource: 'tenants', action: 'write', scope: PermissionScope.ALL, description: 'Write tenant data across all tenants', category: 'Tenant Management' },
    { name: 'tenants:activate', resource: 'tenants', action: 'activate', scope: PermissionScope.ALL, description: 'Activate tenants', category: 'Tenant Management' },
    { name: 'tenants:deactivate', resource: 'tenants', action: 'deactivate', scope: PermissionScope.ALL, description: 'Deactivate tenants', category: 'Tenant Management' },
    { name: 'tenants:delete', resource: 'tenants', action: 'delete', scope: PermissionScope.ALL, description: 'Delete tenants across all tenants', category: 'Tenant Management' },

    // Role permissions
    { name: 'roles:read', resource: 'roles', action: 'read', scope: PermissionScope.ALL, description: 'Read role data across all tenants', category: 'Role Management' },
    { name: 'roles:write', resource: 'roles', action: 'write', scope: PermissionScope.ALL, description: 'Write role data across all tenants', category: 'Role Management' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', scope: PermissionScope.ALL, description: 'Delete roles across all tenants', category: 'Role Management' },

    // Permission permissions
    { name: 'permissions:read', resource: 'permissions', action: 'read', scope: PermissionScope.ALL, description: 'Read permission data across all tenants', category: 'Permission Management' },
    { name: 'permissions:write', resource: 'permissions', action: 'write', scope: PermissionScope.ALL, description: 'Write permission data across all tenants', category: 'Permission Management' },
    { name: 'permissions:delete', resource: 'permissions', action: 'delete', scope: PermissionScope.ALL, description: 'Delete permissions across all tenants', category: 'Permission Management' },

    // Assignment permissions
    { name: 'assignments:read', resource: 'assignments', action: 'read', scope: PermissionScope.ALL, description: 'Read user-role assignments', category: 'Role Management' },
    { name: 'assignments:write', resource: 'assignments', action: 'write', scope: PermissionScope.ALL, description: 'Write user-role assignments', category: 'Role Management' },

    // System permissions
    { name: 'system:read', resource: 'system', action: 'read', scope: PermissionScope.ALL, description: 'Read system configuration', category: 'System Management' },
    { name: 'system:write', resource: 'system', action: 'write', scope: PermissionScope.ALL, description: 'Write system configuration', category: 'System Management' },

    // Audit permissions
    { name: 'audit:read', resource: 'audit', action: 'read', scope: PermissionScope.ALL, description: 'Read audit logs', category: 'System Management' }
  ]

  const permissions: Record<string, any> = {}

  for (const permData of requiredPermissions) {
    const permission = await prisma.permission.upsert({
      where: { name: permData.name },
      update: permData,
      create: {
        ...permData,
        isSystemPermission: true
      }
    })

    permissions[permData.name] = permission
  }

  console.log(`✅ Processed ${Object.keys(permissions).length} permissions`)
  return permissions
}

async function createMenu(menuData: any, allPermissions: Record<string, any>) {
  try {
    const { permissions: menuPermissions, isParent, ...menuFields } = menuData

    const menu = await prisma.menu.create({
      data: {
        ...menuFields,
        isActive: true,
        isPublic: false,
        metadata: {
          icon: menuData.icon,
          badge: null,
          expanded: false,
          isParent: isParent || false
        }
      }
    })

    // Add permissions to menu
    if (menuPermissions && menuPermissions.length > 0) {
      for (const permName of menuPermissions) {
        if (allPermissions[permName]) {
          await prisma.menuPermission.create({
            data: {
              menuId: menu.id,
              permissionId: allPermissions[permName].id,
              grantedBy: menuData.createdBy
            }
          })
        }
      }
    }

    return menu
  } catch (error) {
    console.error(`❌ Error creating menu ${menuData.name}:`, error)
    return null
  }
}

function printMenuTree(menus: any[], depth: number = 0) {
  const indent = '  '.repeat(depth)

  for (const menu of menus) {
    const hasChildren = menu.children && menu.children.length > 0
    const permissionCount = menu.permissions?.length || 0

    console.log(`${indent}📁 ${menu.label} (${menu.path}) [${permissionCount} permissions]`)

    if (hasChildren) {
      printMenuTree(menu.children, depth + 1)
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedMenus()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export default seedMenus