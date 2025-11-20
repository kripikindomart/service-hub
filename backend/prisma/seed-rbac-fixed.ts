import { PrismaClient, EntityStatus, RoleType, RoleLevel, PermissionScope, AssignmentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting RBAC seed...')

  // ========================================
  // 1. Create Permissions
  // ========================================
  console.log('📋 Creating permissions...')

  const permissions = await Promise.all([
    // Global Permissions (using ALL scope for system-wide)
    ...['read', 'write', 'admin', 'delete'].map(action =>
      prisma.permission.create({
        data: {
          name: `global:${action}`,
          resource: 'global',
          action,
          scope: PermissionScope.ALL,
          description: `Global ${action} access`,
          isSystemPermission: true
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
          scope: PermissionScope.TENANT,
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
          scope: PermissionScope.ALL,
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
          scope: PermissionScope.TENANT,
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
          scope: PermissionScope.TENANT,
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
          scope: PermissionScope.TENANT,
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
          scope: PermissionScope.TENANT,
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
          scope: PermissionScope.ALL,
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
      type: RoleType.SYSTEM,
      level: RoleLevel.SUPER_ADMIN,
      isSystemRole: true,
      isActive: true
    }
  })

  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Super admin with multi-tenant management capabilities',
      type: RoleType.SYSTEM,
      level: RoleLevel.SUPER_ADMIN,
      isSystemRole: true,
      isActive: true
    }
  })

  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Tenant administrator with full tenant access',
      type: RoleType.TENANT,
      level: RoleLevel.ADMIN,
      isSystemRole: true,
      isActive: true
    }
  })

  const managerRole = await prisma.role.create({
    data: {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Manager with limited administrative access',
      type: RoleType.TENANT,
      level: RoleLevel.MANAGER,
      isSystemRole: false,
      isActive: true
    }
  })

  const userRole = await prisma.role.create({
    data: {
      name: 'USER',
      displayName: 'User',
      description: 'Standard user with basic access',
      type: RoleType.TENANT,
      level: RoleLevel.USER,
      isSystemRole: false,
      isActive: true
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

  // Super Admin gets most permissions except some system-level
  const superAdminPermissions = permissions.filter(p =>
    !p.name.startsWith('system:admin') && !p.name.startsWith('system:delete')
  )
  await prisma.rolePermission.createMany({
    data: superAdminPermissions.map(permission => ({
      roleId: superAdminRole.id,
      permissionId: permission.id
    }))
  })

  // Admin gets tenant-level permissions
  const adminPermissions = permissions.filter(p =>
    p.scope === PermissionScope.TENANT ||
    (p.scope === PermissionScope.ALL && p.resource === 'dashboard')
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
      type: 'BUSINESS',
      status: EntityStatus.ACTIVE,
      domain: 'demo.example.com',
      maxUsers: 50,
      maxServices: 10,
      storageLimitMb: 1024,
      databaseName: 'demo_company_db',
      primaryColor: '#3b82f6',
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
          storage: 1024
        }
      },
      featureFlags: {
        serviceHub: true,
        customBranding: true,
        advancedAnalytics: false
      }
    }
  })

  const testTenant = await prisma.tenant.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      type: 'BUSINESS',
      status: EntityStatus.ACTIVE,
      domain: 'test.example.com',
      maxUsers: 20,
      maxServices: 5,
      storageLimitMb: 512,
      databaseName: 'test_org_db',
      primaryColor: '#8b5cf6',
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
      featureFlags: {
        serviceHub: true,
        customBranding: false,
        advancedAnalytics: true
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
      name: 'Super Admin',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: hashedPassword,
      tokenVersion: 1,
      title: 'System Administrator',
      department: 'IT'
    }
  })

  // Demo Tenant Users
  const demoAdmin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      name: 'Demo Admin',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: adminPassword,
      currentTenantId: demoTenant.id,
      homeTenantId: demoTenant.id,
      tokenVersion: 1,
      title: 'Administrator',
      department: 'Administration'
    }
  })

  const demoManager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      name: 'Demo Manager',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: managerPassword,
      currentTenantId: demoTenant.id,
      homeTenantId: demoTenant.id,
      tokenVersion: 1,
      title: 'Manager',
      department: 'Operations'
    }
  })

  const demoUser1 = await prisma.user.create({
    data: {
      email: 'user1@demo.com',
      name: 'Demo User One',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: userPassword,
      currentTenantId: demoTenant.id,
      homeTenantId: demoTenant.id,
      tokenVersion: 1,
      title: 'User',
      department: 'General'
    }
  })

  const demoUser2 = await prisma.user.create({
    data: {
      email: 'user2@demo.com',
      name: 'Demo User Two',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: userPassword,
      currentTenantId: demoTenant.id,
      homeTenantId: demoTenant.id,
      tokenVersion: 1,
      title: 'User',
      department: 'Support'
    }
  })

  // Test Tenant Users
  const testAdmin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Test Admin',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: adminPassword,
      currentTenantId: testTenant.id,
      homeTenantId: testTenant.id,
      tokenVersion: 1,
      title: 'Administrator',
      department: 'IT'
    }
  })

  const testUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      name: 'Test User',
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      passwordHash: userPassword,
      currentTenantId: testTenant.id,
      homeTenantId: testTenant.id,
      tokenVersion: 1,
      title: 'User',
      department: 'General'
    }
  })

  console.log('✅ Users created')

  // ========================================
  // 6. Create User Assignments
  // ========================================
  console.log('🔗 Creating user assignments...')

  // System Admin - Create organization first for global assignment
  const systemOrg = await prisma.organization.create({
    data: {
      tenantId: demoTenant.id, // Use demo tenant as base
      name: 'System Organization',
      type: 'COMPANY',
      hierarchyLevel: 0,
      isActive: true
    }
  })

  // System Admin assignment
  await prisma.userAssignment.create({
    data: {
      userId: systemAdmin.id,
      tenantId: demoTenant.id,
      organizationId: systemOrg.id,
      roleId: systemAdminRole.id,
      status: AssignmentStatus.ACTIVE,
      isPrimary: true,
      assignedBy: systemAdmin.id
    }
  })

  // Demo Tenant - Create organization
  const demoOrg = await prisma.organization.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Demo Organization',
      type: 'COMPANY',
      hierarchyLevel: 0,
      isActive: true
    }
  })

  // Demo Tenant Assignments
  await prisma.userAssignment.createMany({
    data: [
      {
        userId: demoAdmin.id,
        tenantId: demoTenant.id,
        organizationId: demoOrg.id,
        roleId: adminRole.id,
        status: AssignmentStatus.ACTIVE,
        isPrimary: true,
        assignedBy: systemAdmin.id
      },
      {
        userId: demoManager.id,
        tenantId: demoTenant.id,
        organizationId: demoOrg.id,
        roleId: managerRole.id,
        status: AssignmentStatus.ACTIVE,
        isPrimary: false,
        assignedBy: demoAdmin.id
      },
      {
        userId: demoUser1.id,
        tenantId: demoTenant.id,
        organizationId: demoOrg.id,
        roleId: userRole.id,
        status: AssignmentStatus.ACTIVE,
        isPrimary: false,
        assignedBy: demoAdmin.id
      },
      {
        userId: demoUser2.id,
        tenantId: demoTenant.id,
        organizationId: demoOrg.id,
        roleId: userRole.id,
        status: AssignmentStatus.ACTIVE,
        isPrimary: false,
        assignedBy: demoAdmin.id
      }
    ]
  })

  // Test Tenant - Create organization
  const testOrg = await prisma.organization.create({
    data: {
      tenantId: testTenant.id,
      name: 'Test Organization',
      type: 'COMPANY',
      hierarchyLevel: 0,
      isActive: true
    }
  })

  // Test Tenant Assignments
  await prisma.userAssignment.createMany({
    data: [
      {
        userId: testAdmin.id,
        tenantId: testTenant.id,
        organizationId: testOrg.id,
        roleId: adminRole.id,
        status: AssignmentStatus.ACTIVE,
        isPrimary: true,
        assignedBy: systemAdmin.id
      },
      {
        userId: testUser.id,
        tenantId: testTenant.id,
        organizationId: testOrg.id,
        roleId: userRole.id,
        status: AssignmentStatus.ACTIVE,
        isPrimary: false,
        assignedBy: testAdmin.id
      }
    ]
  })

  console.log('✅ User assignments created')

  // ========================================
  // 7. Create Sessions for testing
  // ========================================
  console.log('🔐 Creating user sessions...')

  await prisma.session.createMany({
    data: [
      {
        userId: systemAdmin.id,
        token: 'system-admin-token-' + Math.random().toString(36).substring(7),
        refreshToken: 'system-admin-refresh-' + Math.random().toString(36).substring(7),
        deviceId: 'system-device',
        userAgent: 'Mozilla/5.0 (System Admin)',
        ipAddress: '127.0.0.1',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      {
        userId: demoAdmin.id,
        token: 'demo-admin-token-' + Math.random().toString(36).substring(7),
        refreshToken: 'demo-admin-refresh-' + Math.random().toString(36).substring(7),
        deviceId: 'demo-device',
        userAgent: 'Mozilla/5.0 (Demo Admin)',
        ipAddress: '127.0.0.1',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    ]
  })

  console.log('✅ Sessions created')

  // ========================================
  // Summary
  // ========================================
  console.log('\n🎉 RBAC Seed Complete!')
  console.log('📊 Summary:')
  console.log(`   Permissions: ${permissions.length}`)
  console.log(`   Roles: 5`)
  console.log(`   Tenants: 2`)
  console.log(`   Users: 7`)
  console.log(`   Organizations: 3`)
  console.log(`   User Assignments: 7`)
  console.log(`   Sessions: 2`)
  console.log('\n🔑 Login Credentials:')
  console.log('   System Admin: superadmin@system.com / SuperAdmin123!')
  console.log('   Demo Admin: admin@demo.com / Admin123!')
  console.log('   Demo Manager: manager@demo.com / Manager123!')
  console.log('   Demo User 1: user1@demo.com / User123!')
  console.log('   Demo User 2: user2@demo.com / User123!')
  console.log('   Test Admin: admin@test.com / Admin123!')
  console.log('   Test User: user@test.com / User123!')
  console.log('\n🏢 Tenants:')
  console.log('   Demo Company (demo-company)')
  console.log('   Test Organization (test-org)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })