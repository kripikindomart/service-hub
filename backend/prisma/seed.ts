import { PrismaClient, EntityStatus, TenantStatus, TenantType, SubscriptionTier, PermissionScope, AssignmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Create Tenants with different types and tiers
  const tenants = [
    // Core System Tenant
    {
      name: 'System Core',
      slug: 'core',
      type: TenantType.CORE,
      tier: SubscriptionTier.ENTERPRISE,
      status: TenantStatus.ACTIVE,
      databaseName: 'tenant_core_system',
      primaryColor: '#000000',
      maxUsers: 1000,
      maxServices: 1000,
      storageLimitMb: 102400,
      settings: {
        allowUserRegistration: true,
        requireEmailVerification: true,
        enableTwoFactorAuth: false,
        sessionTimeout: 24,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
      },
      featureFlags: {
        betaFeatures: true,
        advancedAnalytics: true,
        customIntegrations: true,
      },
    },
    // Business Tenants
    {
      name: 'TechCorp Solutions',
      slug: 'techcorp',
      type: TenantType.BUSINESS,
      tier: SubscriptionTier.PROFESSIONAL,
      status: TenantStatus.ACTIVE,
      databaseName: 'tenant_techcorp',
      primaryColor: '#3B82F6',
      maxUsers: 100,
      maxServices: 50,
      storageLimitMb: 10240,
      settings: {
        allowUserRegistration: false,
        requireEmailVerification: true,
        enableTwoFactorAuth: true,
        sessionTimeout: 8,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
      },
      featureFlags: {
        betaFeatures: false,
        advancedAnalytics: true,
        customIntegrations: false,
      },
    },
    {
      name: 'StartupHub Inc',
      slug: 'startuphub',
      type: TenantType.BUSINESS,
      tier: SubscriptionTier.STARTER,
      status: TenantStatus.ACTIVE,
      databaseName: 'tenant_startuphub',
      primaryColor: '#10B981',
      maxUsers: 25,
      maxServices: 10,
      storageLimitMb: 2048,
      settings: {
        allowUserRegistration: true,
        requireEmailVerification: true,
        enableTwoFactorAuth: false,
        sessionTimeout: 12,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
      },
      featureFlags: {
        betaFeatures: false,
        advancedAnalytics: false,
        customIntegrations: false,
      },
    },
    {
      name: 'Digital Agency Pro',
      slug: 'digitalagency',
      type: TenantType.BUSINESS,
      tier: SubscriptionTier.ENTERPRISE,
      status: TenantStatus.ACTIVE,
      databaseName: 'tenant_digitalagency',
      primaryColor: '#8B5CF6',
      maxUsers: 500,
      maxServices: 200,
      storageLimitMb: 51200,
      settings: {
        allowUserRegistration: false,
        requireEmailVerification: true,
        enableTwoFactorAuth: true,
        sessionTimeout: 4,
        passwordPolicy: {
          minLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
      },
      featureFlags: {
        betaFeatures: true,
        advancedAnalytics: true,
        customIntegrations: true,
      },
    },
    // Trial Tenant
    {
      name: 'Test Organization',
      slug: 'test-org',
      type: TenantType.TRIAL,
      tier: SubscriptionTier.STARTER,
      status: TenantStatus.SETUP,
      databaseName: 'tenant_testorg',
      primaryColor: '#F59E0B',
      maxUsers: 5,
      maxServices: 3,
      storageLimitMb: 512,
      settings: {
        allowUserRegistration: false,
        requireEmailVerification: true,
        enableTwoFactorAuth: false,
        sessionTimeout: 24,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
      },
      featureFlags: {
        betaFeatures: false,
        advancedAnalytics: false,
        customIntegrations: false,
      },
    },
    // Inactive Tenant
    {
      name: 'Legacy Company',
      slug: 'legacy-company',
      type: TenantType.BUSINESS,
      tier: SubscriptionTier.PROFESSIONAL,
      status: TenantStatus.DEACTIVATED,
      databaseName: 'tenant_legacy',
      primaryColor: '#6B7280',
      maxUsers: 50,
      maxServices: 20,
      storageLimitMb: 4096,
      settings: {
        allowUserRegistration: false,
        requireEmailVerification: true,
        enableTwoFactorAuth: false,
        sessionTimeout: 24,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
      },
      featureFlags: {
        betaFeatures: false,
        advancedAnalytics: false,
        customIntegrations: false,
      },
    },
  ];

  const createdTenants = [];
  for (const tenantData of tenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantData.slug },
      update: tenantData,
      create: tenantData,
    });
    createdTenants.push(tenant);
    console.log(`✅ Tenant created: ${tenant.name} (${tenant.type})`);
  }

  // 2. Create System Roles for Core Tenant
  const coreTenant = createdTenants.find(t => t.slug === 'core')!;

  const systemRoles = [
    {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Full system access across all tenants',
      type: 'SYSTEM' as const,
      level: 'SUPER_ADMIN' as const,
      isSystemRole: true,
      isDefaultRole: false,
    },
    {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Administrative access within tenant',
      type: 'SYSTEM' as const,
      level: 'ADMIN' as const,
      isSystemRole: true,
      isDefaultRole: false,
    },
    {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Management access with limited permissions',
      type: 'SYSTEM' as const,
      level: 'MANAGER' as const,
      isSystemRole: true,
      isDefaultRole: false,
    },
  ];

  const createdSystemRoles = [];
  for (const roleData of systemRoles) {
    // Check if role already exists
    const existingRole = await prisma.role.findFirst({
      where: {
        name: roleData.name,
        tenantId: coreTenant.id,
      },
    });

    const role = existingRole || await prisma.role.create({
      data: {
        ...roleData,
        tenantId: coreTenant.id,
      },
    });
    createdSystemRoles.push(role);
  }

  console.log('✅ System roles created for core tenant');

  // 3. Create Tenant-specific Roles for each tenant
  for (const tenant of createdTenants) {
    if (tenant.type === TenantType.CORE) continue; // Skip core tenant, already has system roles

    const tenantRoles = [
      {
        name: 'TENANT_ADMIN',
        displayName: 'Tenant Administrator',
        description: 'Full access within this tenant',
        type: 'TENANT' as const,
        level: 'ADMIN' as const,
        isSystemRole: false,
        isDefaultRole: false,
        maxUsers: 3,
      },
      {
        name: 'MANAGER',
        displayName: 'Manager',
        description: 'Management access within tenant',
        type: 'TENANT' as const,
        level: 'MANAGER' as const,
        isSystemRole: false,
        isDefaultRole: false,
        maxUsers: 10,
      },
      {
        name: 'USER',
        displayName: 'User',
        description: 'Standard user access',
        type: 'TENANT' as const,
        level: 'USER' as const,
        isSystemRole: false,
        isDefaultRole: true,
        maxUsers: null,
      },
    ];

    for (const roleData of tenantRoles) {
      const existingRole = await prisma.role.findFirst({
        where: {
          name: roleData.name,
          tenantId: tenant.id,
        },
      });

      if (!existingRole) {
        await prisma.role.create({
          data: {
            ...roleData,
            tenantId: tenant.id,
          },
        });
      }
    }

    console.log(`✅ Tenant roles created for: ${tenant.name}`);
  }

  // 4. Create Sample Users
  const users = [
    // Super Admin for Core Tenant
    {
      email: 'superadmin@system.com',
      name: 'Super Administrator',
      password: 'SuperAdmin123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'core',
      currentTenantSlug: 'core',
      role: 'SUPER_ADMIN',
    },
    // Admins for different tenants
    {
      email: 'admin@techcorp.com',
      name: 'TechCorp Admin',
      password: 'AdminTechCorp123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'techcorp',
      currentTenantSlug: 'techcorp',
      role: 'TENANT_ADMIN',
    },
    {
      email: 'admin@startuphub.com',
      name: 'StartupHub Admin',
      password: 'AdminStartup123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'startuphub',
      currentTenantSlug: 'startuphub',
      role: 'TENANT_ADMIN',
    },
    {
      email: 'admin@digitalagency.com',
      name: 'Digital Agency Admin',
      password: 'AdminDigital123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'digitalagency',
      currentTenantSlug: 'digitalagency',
      role: 'TENANT_ADMIN',
    },
    // Managers for different tenants
    {
      email: 'manager@techcorp.com',
      name: 'TechCorp Manager',
      password: 'ManagerTech123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'techcorp',
      currentTenantSlug: 'techcorp',
      role: 'MANAGER',
    },
    {
      email: 'manager@startuphub.com',
      name: 'StartupHub Manager',
      password: 'ManagerStartup123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'startuphub',
      currentTenantSlug: 'startuphub',
      role: 'MANAGER',
    },
    // Regular Users for different tenants
    {
      email: 'john.doe@techcorp.com',
      name: 'John Doe',
      password: 'UserTech123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'techcorp',
      currentTenantSlug: 'techcorp',
      role: 'USER',
    },
    {
      email: 'jane.smith@techcorp.com',
      name: 'Jane Smith',
      password: 'UserTech123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'techcorp',
      currentTenantSlug: 'techcorp',
      role: 'USER',
    },
    {
      email: 'alice@startuphub.com',
      name: 'Alice Johnson',
      password: 'UserStartup123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'startuphub',
      currentTenantSlug: 'startuphub',
      role: 'USER',
    },
    {
      email: 'bob@digitalagency.com',
      name: 'Bob Wilson',
      password: 'UserDigital123!',
      status: TenantStatus.ACTIVE,
      emailVerified: true,
      homeTenantSlug: 'digitalagency',
      currentTenantSlug: 'digitalagency',
      role: 'USER',
    },
    // Inactive and Pending users
    {
      email: 'inactive.user@techcorp.com',
      name: 'Inactive User',
      password: 'UserTech123!',
      status: EntityStatus.INACTIVE,
      emailVerified: true,
      homeTenantSlug: 'techcorp',
      currentTenantSlug: 'techcorp',
      role: 'USER',
    },
    {
      email: 'pending.user@startuphub.com',
      name: 'Pending User',
      password: 'UserStartup123!',
      status: EntityStatus.PENDING,
      emailVerified: false,
      homeTenantSlug: 'startuphub',
      currentTenantSlug: 'startuphub',
      role: 'USER',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const homeTenant = createdTenants.find(t => t.slug === userData.homeTenantSlug)!;
    const currentTenant = createdTenants.find(t => t.slug === userData.currentTenantSlug)!;

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash: hashedPassword,
        name: userData.name,
        status: userData.status,
        emailVerified: userData.emailVerified,
        homeTenantId: homeTenant.id,
        currentTenantId: currentTenant.id,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        timezone: 'UTC',
        language: 'en',
        department: 'IT',
        title: userData.role === 'SUPER_ADMIN' ? 'System Administrator' :
                userData.role === 'TENANT_ADMIN' ? 'Tenant Administrator' :
                userData.role === 'MANAGER' ? 'Manager' : 'Employee',
        employeeId: `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        bio: `Sample user for ${userData.homeTenantSlug} tenant`,
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
        },
      },
    });

    createdUsers.push({ user, userData });
    console.log(`✅ User created: ${user.email} (${userData.role})`);
  }

  // 5. Assign Users to Roles and Tenants
  for (const { user, userData } of createdUsers) {
    const tenant = createdTenants.find(t => t.slug === userData.homeTenantSlug)!;
    const role = await prisma.role.findFirst({
      where: {
        name: userData.role,
        tenantId: userData.role === 'SUPER_ADMIN' ? coreTenant.id : tenant.id,
      },
    });

    if (role) {
      // Check if assignment already exists
      const existingAssignment = await prisma.userAssignment.findFirst({
        where: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: role.id,
        },
      });

      if (!existingAssignment) {
        await prisma.userAssignment.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            roleId: role.id,
            status: userData.status === EntityStatus.ACTIVE ? AssignmentStatus.ACTIVE :
                    userData.status === EntityStatus.INACTIVE ? AssignmentStatus.SUSPENDED :
                    AssignmentStatus.PENDING,
            isPrimary: true,
            assignedBy: createdUsers[0]?.user?.id || "1", // Super Admin assigns all
          },
        });
      }

      console.log(`✅ User assigned to role: ${user.email} -> ${role.displayName}`);
    }
  }

  // 6. Create Permissions
  const permissions = [
    // Super Permissions
    { name: 'permission:all', resource: 'all', action: 'all', scope: PermissionScope.ALL, description: 'Full access to all resources and actions across all tenants', category: 'Super Admin' },

    // User Management Permissions
    { name: 'users:read', resource: 'users', action: 'read', scope: PermissionScope.ALL, description: 'Read user data across all tenants', category: 'User Management' },
    { name: 'users:write', resource: 'users', action: 'write', scope: PermissionScope.ALL, description: 'Write user data across all tenants', category: 'User Management' },
    { name: 'users:delete', resource: 'users', action: 'delete', scope: PermissionScope.ALL, description: 'Delete users across all tenants', category: 'User Management' },
    { name: 'users:activate', resource: 'users', action: 'activate', scope: PermissionScope.ALL, description: 'Activate users across all tenants', category: 'User Management' },
    { name: 'users:deactivate', resource: 'users', action: 'deactivate', scope: PermissionScope.ALL, description: 'Deactivate users across all tenants', category: 'User Management' },

    // Tenant Management Permissions
    { name: 'tenants:read', resource: 'tenants', action: 'read', scope: PermissionScope.ALL, description: 'Read tenant data across all tenants', category: 'Tenant Management' },
    { name: 'tenants:write', resource: 'tenants', action: 'write', scope: PermissionScope.ALL, description: 'Write tenant data across all tenants', category: 'Tenant Management' },
    { name: 'tenants:delete', resource: 'tenants', action: 'delete', scope: PermissionScope.ALL, description: 'Delete tenants across all tenants', category: 'Tenant Management' },
    { name: 'tenants:activate', resource: 'tenants', action: 'activate', scope: PermissionScope.ALL, description: 'Activate tenants', category: 'Tenant Management' },
    { name: 'tenants:deactivate', resource: 'tenants', action: 'deactivate', scope: PermissionScope.ALL, description: 'Deactivate tenants', category: 'Tenant Management' },
    { name: 'tenants:archive', resource: 'tenants', action: 'archive', scope: PermissionScope.ALL, description: 'Archive tenants', category: 'Tenant Management' },

    // Role Management Permissions
    { name: 'roles:read', resource: 'roles', action: 'read', scope: PermissionScope.ALL, description: 'Read role data across all tenants', category: 'Role Management' },
    { name: 'roles:write', resource: 'roles', action: 'write', scope: PermissionScope.ALL, description: 'Write role data across all tenants', category: 'Role Management' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', scope: PermissionScope.ALL, description: 'Delete roles across all tenants', category: 'Role Management' },

    // System Management Permissions
    { name: 'system:read', resource: 'system', action: 'read', scope: PermissionScope.ALL, description: 'Read system configuration', category: 'System Management' },
    { name: 'system:write', resource: 'system', action: 'write', scope: PermissionScope.ALL, description: 'Write system configuration', category: 'System Management' },
    { name: 'audit:read', resource: 'audit', action: 'read', scope: PermissionScope.ALL, description: 'Read audit logs', category: 'System Management' },

    // Tenant-specific permissions
    { name: 'tenant:users:read', resource: 'users', action: 'read', scope: PermissionScope.TENANT, description: 'Read users within tenant', category: 'Tenant User Management' },
    { name: 'tenant:users:write', resource: 'users', action: 'write', scope: PermissionScope.TENANT, description: 'Write users within tenant', category: 'Tenant User Management' },
    { name: 'tenant:roles:read', resource: 'roles', action: 'read', scope: PermissionScope.TENANT, description: 'Read roles within tenant', category: 'Tenant Role Management' },
    { name: 'tenant:services:read', resource: 'services', action: 'read', scope: PermissionScope.TENANT, description: 'Read services within tenant', category: 'Tenant Services' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: {
        ...permission,
        isSystemPermission: permission.scope === PermissionScope.ALL,
      },
    });
  }

  console.log('✅ Permissions created');

  // 7. Assign Permissions to Roles
  const allPermissions = await prisma.permission.findMany();
  const superAdminRole = createdSystemRoles.find(r => r.name === 'SUPER_ADMIN')!;

  if (superAdminRole) {
    // Give all permissions to Super Admin
    for (const permission of allPermissions) {
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
            grantedBy: createdUsers[0]?.user?.id || "1",
          },
        });
      }
    }
  }

  console.log('✅ All permissions assigned to Super Admin');

  console.log('\n🎉 Comprehensive database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');

  console.log('\n🔑 Super Admin Access:');
  console.log('   Email: superadmin@system.com');
  console.log('   Password: SuperAdmin123!');

  console.log('\n🏢 Tenant Admins:');
  console.log('   TechCorp: admin@techcorp.com / AdminTechCorp123!');
  console.log('   StartupHub: admin@startuphub.com / AdminStartup123!');
  console.log('   Digital Agency: admin@digitalagency.com / AdminDigital123!');

  console.log('\n👥 Managers:');
  console.log('   TechCorp Manager: manager@techcorp.com / ManagerTech123!');
  console.log('   StartupHub Manager: manager@startuphub.com / ManagerStartup123!');

  console.log('\n👤 Regular Users:');
  console.log('   TechCorp Users: john.doe@techcorp.com / jane.smith@techcorp.com (UserTech123!)');
  console.log('   StartupHub User: alice@startuphub.com (UserStartup123!)');
  console.log('   Digital Agency User: bob@digitalagency.com (UserDigital123!)');

  console.log('\n🏛️ Tenants Created:');
  for (const tenant of createdTenants) {
    const statusIcon = tenant.status === TenantStatus.ACTIVE ? '✅' :
                     tenant.status === TenantStatus.SETUP ? '⏳' : '❌';
    console.log(`   ${statusIcon} ${tenant.name} (${tenant.type} - ${tenant.tier})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });