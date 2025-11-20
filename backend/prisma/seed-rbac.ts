import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting RBAC seed...')

  // ========================================
  // 1. Create Permissions
  // ========================================
  console.log('📋 Creating permissions...')

  const permissions = await Promise.all([
    // Global Permissions
    ...['read', 'write', 'admin', 'delete'].map(action =>
      prisma.permission.create({
        data: {
          name: `global:${action}`,
          resource: 'global',
          action,
          scope: 'GLOBAL',
          description: `Global ${action} access`
        }
      })
    ),

    // User Management Permissions
    ...['read', 'write', 'admin', 'delete', 'activate', 'deactivate'].map(action =>
      prisma.permission.create({
        data: {
          name: `user:${action}`,
          resource: 'user',
          action,
          scope: 'TENANT',
          description: `User ${action} access within tenant`
        }
      })
    ),

    // Tenant Management Permissions
    ...['read', 'write', 'admin', 'delete', 'provision', 'configure'].map(action =>
      prisma.permission.create({
        data: {
          name: `tenant:${action}`,
          resource: 'tenant',
          action,
          scope: 'GLOBAL',
          description: `Tenant ${action} access`
        }
      })
    ),

    // Role Management Permissions
    ...['read', 'write', 'admin', 'delete', 'assign'].map(action =>
      prisma.permission.create({
        data: {
          name: `role:${action}`,
          resource: 'role',
          action,
          scope: 'TENANT',
          description: `Role ${action} access within tenant`
        }
      })
    ),

    // Service Hub Permissions
    ...['read', 'write', 'admin', 'delete', 'assign', 'configure'].map(action =>
      prisma.permission.create({
        data: {
          name: `service:${action}`,
          resource: 'service',
          action,
          scope: 'TENANT',
          description: `Service ${action} access within tenant`
        }
      })
    ),

    // Dashboard Permissions
    ...['read', 'configure'].map(action =>
      prisma.permission.create({
        data: {
          name: `dashboard:${action}`,
          resource: 'dashboard',
          action,
          scope: 'TENANT',
          description: `Dashboard ${action} access`
        }
      })
    ),

    // Menu Management Permissions
    ...['read', 'write', 'admin'].map(action =>
      prisma.permission.create({
        data: {
          name: `menu:${action}`,
          resource: 'menu',
          action,
          scope: 'TENANT',
          description: `Menu ${action} access`
        }
      })
    ),

    // System Administration Permissions
    ...['read', 'write', 'admin', 'monitor', 'audit'].map(action =>
      prisma.permission.create({
        data: {
          name: `system:${action}`,
          resource: 'system',
          action,
          scope: 'GLOBAL',
          description: `System ${action} access`
        }
      })
    )
  ])

  console.log(`✅ Created ${permissions.length} permissions`)

  // ========================================
  // 2. Create Roles
  // ========================================
  console.log('👑 Creating roles...')

  const systemAdminRole = await prisma.role.create({
    data: {
      name: 'SYSTEM_ADMIN',
      displayName: 'System Administrator',
      description: 'Full system access with all privileges',
      level: 'SYSTEM',
      isSystem: true,
      status: 'ACTIVE'
    }
  })

  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Super admin with multi-tenant management capabilities',
      level: 'GLOBAL',
      isSystem: true,
      status: 'ACTIVE'
    }
  })

  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Tenant administrator with full tenant access',
      level: 'TENANT',
      isSystem: true,
      status: 'ACTIVE'
    }
  })

  const managerRole = await prisma.role.create({
    data: {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Manager with limited administrative access',
      level: 'TENANT',
      isSystem: false,
      status: 'ACTIVE'
    }
  })

  const userRole = await prisma.role.create({
    data: {
      name: 'USER',
      displayName: 'User',
      description: 'Standard user with basic access',
      level: 'TENANT',
      isSystem: false,
      status: 'ACTIVE'
    }
  })

  // ========================================
  // 3. Assign Permissions to Roles
  // ========================================
  console.log('🔗 Assigning permissions to roles...')

  // System Admin gets all permissions
  await prisma.rolePermission.createMany({
    data: permissions.map(permission => ({
      roleId: systemAdminRole.id,
      permissionId: permission.id
    }))
  })

  // Super Admin gets most permissions except system-level
  const superAdminPermissions = permissions.filter(p =>
    !p.name.startsWith('system:') || p.name.includes('system:read') || p.name.includes('system:monitor')
  )
  await prisma.rolePermission.createMany({
    data: superAdminPermissions.map(permission => ({
      roleId: superAdminRole.id,
      permissionId: permission.id
    }))
  })

  // Admin gets tenant-level permissions
  const adminPermissions = permissions.filter(p =>
    p.scope === 'TENANT' ||
    (p.scope === 'GLOBAL' && p.resource === 'dashboard')
  )
  await prisma.rolePermission.createMany({
    data: adminPermissions.map(permission => ({
      roleId: adminRole.id,
      permissionId: permission.id
    }))
  })

  // Manager gets limited permissions
  const managerPermissions = permissions.filter(p =>
    p.name.includes('read') ||
    p.name.includes('user:activate') ||
    p.name.includes('user:deactivate') ||
    p.name.includes('service:assign') ||
    p.name.includes('dashboard:configure')
  )
  await prisma.rolePermission.createMany({
    data: managerPermissions.map(permission => ({
      roleId: managerRole.id,
      permissionId: permission.id
    }))
  })

  // User gets basic permissions
  const userPermissions = permissions.filter(p =>
    (p.name.includes('read') && !p.name.includes('admin')) ||
    (p.name.includes('dashboard:read'))
  )
  await prisma.rolePermission.createMany({
    data: userPermissions.map(permission => ({
      roleId: userRole.id,
      permissionId: permission.id
    }))
  })

  console.log('✅ Role permissions assigned')

  // ========================================
  // 4. Create Tenants
  // ========================================
  console.log('🏢 Creating tenants...')

  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      slug: 'demo-company',
      displayName: 'Demo Company Inc.',
      description: 'Demo tenant for testing Service Hub functionality',
      status: 'ACTIVE',
      domain: 'demo.example.com',
      settings: {
        theme: {
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          logo: '/logo-demo.png'
        },
        features: {
          serviceHub: true,
          customBranding: true,
          advancedAnalytics: false
        },
        limits: {
          users: 50,
          services: 10,
          storage: 1024 // MB
        }
      },
      subscription: {
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
        limits: {
          users: 50,
          services: 10,
          storage: 1024,
          apiCalls: 10000
        }
      }
    }
  })

  const testTenant = await prisma.tenant.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      displayName: 'Test Organization LLC',
      description: 'Test tenant for development and testing',
      status: 'ACTIVE',
      domain: 'test.example.com',
      settings: {
        theme: {
          primaryColor: '#8b5cf6',
          secondaryColor: '#f59e0b',
          logo: '/logo-test.png'
        },
        features: {
          serviceHub: true,
          customBranding: false,
          advancedAnalytics: true
        },
        limits: {
          users: 20,
          services: 5,
          storage: 512
        }
      },
      subscription: {
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01'),
        limits: {
          users: 20,
          services: 5,
          storage: 512,
          apiCalls: 5000
        }
      }
    }
  })

  console.log('✅ Tenants created')

  // ========================================
  // 5. Create Users
  // ========================================
  console.log('👤 Creating users...')

  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10)
  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const managerPassword = await bcrypt.hash('Manager123!', 10)
  const userPassword = await bcrypt.hash('User123!', 10)

  // System Admin (no tenant)
  const systemAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@system.com',
      firstName: 'Super',
      lastName: 'Admin',
      name: 'Super Admin',
      status: 'ACTIVE',
      emailVerified: true,
      password: hashedPassword,
      isSystem: true,
      tokenVersion: 1
    }
  })

  // Demo Tenant Users
  const demoAdmin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      firstName: 'Demo',
      lastName: 'Admin',
      name: 'Demo Admin',
      status: 'ACTIVE',
      emailVerified: true,
      password: adminPassword,
      currentTenantId: demoTenant.id,
      tokenVersion: 1
    }
  })

  const demoManager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      firstName: 'Demo',
      lastName: 'Manager',
      name: 'Demo Manager',
      status: 'ACTIVE',
      emailVerified: true,
      password: managerPassword,
      currentTenantId: demoTenant.id,
      tokenVersion: 1
    }
  })

  const demoUser1 = await prisma.user.create({
    data: {
      email: 'user1@demo.com',
      firstName: 'Demo',
      lastName: 'User One',
      name: 'Demo User One',
      status: 'ACTIVE',
      emailVerified: true,
      password: userPassword,
      currentTenantId: demoTenant.id,
      tokenVersion: 1
    }
  })

  const demoUser2 = await prisma.user.create({
    data: {
      email: 'user2@demo.com',
      firstName: 'Demo',
      lastName: 'User Two',
      name: 'Demo User Two',
      status: 'ACTIVE',
      emailVerified: true,
      password: userPassword,
      currentTenantId: demoTenant.id,
      tokenVersion: 1
    }
  })

  // Test Tenant Users
  const testAdmin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      firstName: 'Test',
      lastName: 'Admin',
      name: 'Test Admin',
      status: 'ACTIVE',
      emailVerified: true,
      password: adminPassword,
      currentTenantId: testTenant.id,
      tokenVersion: 1
    }
  })

  const testUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      status: 'ACTIVE',
      emailVerified: true,
      password: userPassword,
      currentTenantId: testTenant.id,
      tokenVersion: 1
    }
  })

  console.log('✅ Users created')

  // ========================================
  // 6. Create User Assignments
  // ========================================
  console.log('🔗 Creating user assignments...')

  // System Admin - Global access
  await prisma.userAssignment.create({
    data: {
      userId: systemAdmin.id,
      roleId: systemAdminRole.id,
      tenantId: null, // Global access
      status: 'ACTIVE',
      assignedAt: new Date(),
      assignedBy: systemAdmin.id
    }
  })

  // Demo Tenant Assignments
  await prisma.userAssignment.createMany({
    data: [
      {
        userId: demoAdmin.id,
        roleId: adminRole.id,
        tenantId: demoTenant.id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: systemAdmin.id
      },
      {
        userId: demoManager.id,
        roleId: managerRole.id,
        tenantId: demoTenant.id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: demoAdmin.id
      },
      {
        userId: demoUser1.id,
        roleId: userRole.id,
        tenantId: demoTenant.id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: demoAdmin.id
      },
      {
        userId: demoUser2.id,
        roleId: userRole.id,
        tenantId: demoTenant.id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: demoAdmin.id
      }
    ]
  })

  // Test Tenant Assignments
  await prisma.userAssignment.createMany({
    data: [
      {
        userId: testAdmin.id,
        roleId: adminRole.id,
        tenantId: testTenant.id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: systemAdmin.id
      },
      {
        userId: testUser.id,
        roleId: userRole.id,
        tenantId: testTenant.id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: testAdmin.id
      }
    ]
  })

  console.log('✅ User assignments created')

  // ========================================
  // 7. Create Service Definitions (Service Hub)
  // ========================================
  console.log('⚙️ Creating service definitions...')

  const userManagementService = await prisma.serviceDefinition.create({
    data: {
      name: 'user-management',
      displayName: 'User Management Service',
      description: 'Complete user lifecycle management service',
      version: '1.0.0',
      type: 'INTERNAL',
      category: 'Administration',
      status: 'ACTIVE',
      icon: 'users',
      color: '#3b82f6',
      requiredPermissions: {
        global: [],
        service: ['user:read', 'user:write'],
        module: ['user:admin'],
        tenant: ['tenant:read']
      },
      apiConfig: {
        baseUrl: 'http://localhost:3002/api/v1',
        version: 'v1',
        endpoints: [
          { path: '/users', method: 'GET', description: 'List users' },
          { path: '/users', method: 'POST', description: 'Create user' },
          { path: '/users/:id', method: 'GET', description: 'Get user' },
          { path: '/users/:id', method: 'PUT', description: 'Update user' },
          { path: '/users/:id', method: 'DELETE', description: 'Delete user' },
          { path: '/users/:id/activate', method: 'POST', description: 'Activate user' },
          { path: '/users/:id/deactivate', method: 'POST', description: 'Deactivate user' }
        ],
        authentication: {
          type: 'BEARER',
          config: { required: true }
        },
        rateLimiting: {
          requests: 100,
          window: 60,
          strategy: 'SLIDING'
        }
      },
      databaseConfig: {
        type: 'SHARED',
        isolation: 'TENANT_ISOLATED',
        encryption: true,
        backup: {
          enabled: true,
          frequency: '0 2 * * *',
          retention: 30
        }
      },
      uiConfig: {
        icon: 'users',
        theme: {
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          accentColor: '#f59e0b'
        },
        branding: {
          showLogo: true,
          customCSS: '.user-management { font-family: Inter; }'
        }
      },
      documentation: 'http://docs.example.com/user-management',
      repository: 'http://github.example.com/user-management',
      tags: ['admin', 'users', 'management'],
      dependencies: ['authentication', 'tenant-management'],
      publishedBy: 'System'
    }
  })

  const tenantManagementService = await prisma.serviceDefinition.create({
    data: {
      name: 'tenant-management',
      displayName: 'Tenant Management Service',
      description: 'Multi-tenant management and configuration service',
      version: '1.0.0',
      type: 'INTERNAL',
      category: 'Administration',
      status: 'ACTIVE',
      icon: 'building',
      color: '#8b5cf6',
      requiredPermissions: {
        global: ['tenant:read', 'tenant:write'],
        service: [],
        module: ['tenant:admin'],
        tenant: []
      },
      apiConfig: {
        baseUrl: 'http://localhost:3002/api/v1',
        version: 'v1',
        endpoints: [
          { path: '/tenants', method: 'GET', description: 'List tenants' },
          { path: '/tenants', method: 'POST', description: 'Create tenant' },
          { path: '/tenants/:id', method: 'GET', description: 'Get tenant' },
          { path: '/tenants/:id', method: 'PUT', description: 'Update tenant' },
          { path: '/tenants/:id', method: 'DELETE', description: 'Delete tenant' }
        ],
        authentication: {
          type: 'BEARER',
          config: { required: true }
        }
      },
      databaseConfig: {
        type: 'DEDICATED',
        isolation: 'TENANT_ISOLATED',
        encryption: true
      },
      uiConfig: {
        icon: 'building',
        theme: {
          primaryColor: '#8b5cf6',
          secondaryColor: '#ec4899',
          accentColor: '#06b6d4'
        }
      },
      documentation: 'http://docs.example.com/tenant-management',
      repository: 'http://github.example.com/tenant-management',
      tags: ['admin', 'tenant', 'management'],
      dependencies: [],
      publishedBy: 'System'
    }
  })

  const dashboardService = await prisma.serviceDefinition.create({
    data: {
      name: 'dashboard',
      displayName: 'Dashboard Service',
      description: 'Analytics and dashboard service',
      version: '1.0.0',
      type: 'INTERNAL',
      category: 'Analytics',
      status: 'ACTIVE',
      icon: 'bar-chart',
      color: '#10b981',
      requiredPermissions: {
        global: [],
        service: ['dashboard:read'],
        module: [],
        tenant: ['tenant:read']
      },
      apiConfig: {
        baseUrl: 'http://localhost:3002/api/v1',
        version: 'v1',
        endpoints: [
          { path: '/dashboard/stats', method: 'GET', description: 'Get dashboard statistics' },
          { path: '/dashboard/charts', method: 'GET', description: 'Get chart data' }
        ],
        authentication: {
          type: 'BEARER',
          config: { required: true }
        }
      },
      databaseConfig: {
        type: 'SHARED',
        isolation: 'SHARED_POOL',
        encryption: false
      },
      uiConfig: {
        icon: 'bar-chart',
        theme: {
          primaryColor: '#10b981',
          secondaryColor: '#3b82f6',
          accentColor: '#f59e0b'
        }
      },
      documentation: 'http://docs.example.com/dashboard',
      repository: 'http://github.example.com/dashboard',
      tags: ['analytics', 'dashboard', 'charts'],
      dependencies: ['authentication'],
      publishedBy: 'System'
    }
  })

  console.log('✅ Service definitions created')

  // ========================================
  // 8. Assign Services to Tenants
  // ========================================
  console.log('🔗 Assigning services to tenants...')

  await prisma.tenantService.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        serviceId: userManagementService.id,
        status: 'ACTIVE',
        configuration: {
          features: {
            bulkActions: true,
            advancedSearch: true,
            exportData: true
          },
          limits: {
            maxUsers: 50,
            maxAdmins: 5
          }
        },
        provisionedAt: new Date(),
        lastAccessAt: new Date()
      },
      {
        tenantId: demoTenant.id,
        serviceId: tenantManagementService.id,
        status: 'ACTIVE',
        configuration: {
          features: {
            customBranding: true,
            subdomain: true
          }
        },
        provisionedAt: new Date(),
        lastAccessAt: new Date()
      },
      {
        tenantId: demoTenant.id,
        serviceId: dashboardService.id,
        status: 'ACTIVE',
        configuration: {
          features: {
            realTimeUpdates: true,
            customReports: true
          }
        },
        provisionedAt: new Date(),
        lastAccessAt: new Date()
      },
      {
        tenantId: testTenant.id,
        serviceId: userManagementService.id,
        status: 'ACTIVE',
        configuration: {
          features: {
            bulkActions: false,
            advancedSearch: true,
            exportData: false
          },
          limits: {
            maxUsers: 20,
            maxAdmins: 2
          }
        },
        provisionedAt: new Date(),
        lastAccessAt: new Date()
      },
      {
        tenantId: testTenant.id,
        serviceId: dashboardService.id,
        status: 'ACTIVE',
        configuration: {
          features: {
            realTimeUpdates: false,
            customReports: true
          }
        },
        provisionedAt: new Date(),
        lastAccessAt: new Date()
      }
    ]
  })

  console.log('✅ Services assigned to tenants')

  // ========================================
  // 9. Create Activity Logs
  // ========================================
  console.log('📊 Creating activity logs...')

  await prisma.activityLog.createMany({
    data: [
      {
        userId: systemAdmin.id,
        tenantId: null,
        action: 'SYSTEM_BOOTSTRAP',
        resource: 'system',
        resourceId: 'system',
        details: { message: 'System bootstrapped with RBAC seed data' },
        ipAddress: '127.0.0.1',
        userAgent: 'Prisma Seed Script',
        createdAt: new Date()
      },
      {
        userId: systemAdmin.id,
        tenantId: demoTenant.id,
        action: 'TENANT_CREATED',
        resource: 'tenant',
        resourceId: demoTenant.id,
        details: { tenantName: 'Demo Company' },
        ipAddress: '127.0.0.1',
        userAgent: 'Prisma Seed Script',
        createdAt: new Date()
      },
      {
        userId: systemAdmin.id,
        tenantId: testTenant.id,
        action: 'TENANT_CREATED',
        resource: 'tenant',
        resourceId: testTenant.id,
        details: { tenantName: 'Test Organization' },
        ipAddress: '127.0.0.1',
        userAgent: 'Prisma Seed Script',
        createdAt: new Date()
      }
    ]
  })

  console.log('✅ Activity logs created')

  // ========================================
  // 10. Create Notifications
  // ========================================
  console.log('🔔 Creating notifications...')

  await prisma.notification.createMany({
    data: [
      {
        userId: demoAdmin.id,
        tenantId: demoTenant.id,
        type: 'SYSTEM',
        title: 'Welcome to Service Hub',
        message: 'Your tenant has been configured with all essential services. You can now start managing users and services.',
        data: { action: 'view_dashboard' },
        status: 'UNREAD',
        createdAt: new Date()
      },
      {
        userId: testAdmin.id,
        tenantId: testTenant.id,
        type: 'SYSTEM',
        title: 'Test Environment Ready',
        message: 'Your test tenant has been set up with core services for development and testing.',
        data: { action: 'view_dashboard' },
        status: 'UNREAD',
        createdAt: new Date()
      }
    ]
  })

  console.log('✅ Notifications created')

  // ========================================
  // Summary
  // ========================================
  console.log('\n🎉 RBAC Seed Complete!')
  console.log('📊 Summary:')
  console.log(`   Permissions: ${permissions.length}`)
  console.log(`   Roles: 5`)
  console.log(`   Tenants: 2`)
  console.log(`   Users: 7`)
  console.log(`   Services: 3`)
  console.log(`   User Assignments: 7`)
  console.log(`   Tenant Services: 5`)
  console.log('\n🔑 Login Credentials:')
  console.log('   System Admin: superadmin@system.com / SuperAdmin123!')
  console.log('   Demo Admin: admin@demo.com / Admin123!')
  console.log('   Demo Manager: manager@demo.com / Manager123!')
  console.log('   Demo User 1: user1@demo.com / User123!')
  console.log('   Demo User 2: user2@demo.com / User123!')
  console.log('   Test Admin: admin@test.com / Admin123!')
  console.log('   Test User: user@test.com / User123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })