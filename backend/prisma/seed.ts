import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Tenant Core (System Tenant)
  const coreTenant = await prisma.tenant.upsert({
    where: { slug: 'core' },
    update: {},
    create: {
      name: 'System Core',
      slug: 'core',
      type: 'CORE',
      tier: 'ENTERPRISE',
      status: 'ACTIVE',
      databaseName: 'tenant_core_system',
      primaryColor: '#000000',
      maxUsers: 1000,
      maxServices: 1000,
      storageLimitMb: 102400,
    },
  });

  console.log('✅ Core tenant created:', coreTenant.name);

  // 2. Create System Roles
  const superAdminRole = await prisma.role.upsert({
    where: {
      name_tenantId: {
        name: 'SUPER_ADMIN',
        tenantId: coreTenant.id,
      }
    },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Full system access across all tenants',
      type: 'SYSTEM',
      level: 'SUPER_ADMIN',
      tenantId: coreTenant.id,
      isSystemRole: true,
      isDefaultRole: false,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: {
      name_tenantId: {
        name: 'ADMIN',
        tenantId: coreTenant.id,
      }
    },
    update: {},
    create: {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Administrative access within tenant',
      type: 'SYSTEM',
      level: 'ADMIN',
      tenantId: coreTenant.id,
      isSystemRole: true,
      isDefaultRole: false,
    },
  });

  console.log('✅ System roles created');

  // 3. Create Super Admin User
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@system.com' },
    update: {},
    create: {
      email: 'superadmin@system.com',
      passwordHash: superAdminPassword,
      name: 'Super Administrator',
      status: 'ACTIVE',
      emailVerified: true,
      homeTenantId: coreTenant.id,
      currentTenantId: coreTenant.id,
    },
  });

  console.log('✅ Super admin user created:', superAdmin.email);

  // 4. Assign Super Admin to Core Tenant
  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: {
        userId: superAdmin.id,
        tenantId: coreTenant.id,
      }
    },
    update: {},
    create: {
      userId: superAdmin.id,
      tenantId: coreTenant.id,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
      isPrimary: true,
      assignedBy: superAdmin.id,
    },
  });

  console.log('✅ Super admin assigned to core tenant');

  // 5. Create Basic Permissions
  const permissions = [
    // User Management
    { name: 'users:read', resource: 'users', action: 'read', scope: 'ALL' as const, description: 'Read user data across all tenants', category: 'User Management' },
    { name: 'users:write', resource: 'users', action: 'write', scope: 'ALL' as const, description: 'Write user data across all tenants', category: 'User Management' },
    { name: 'users:delete', resource: 'users', action: 'delete', scope: 'ALL' as const, description: 'Delete users across all tenants', category: 'User Management' },

    // Tenant Management
    { name: 'tenants:read', resource: 'tenants', action: 'read', scope: 'ALL' as const, description: 'Read tenant data across all tenants', category: 'Tenant Management' },
    { name: 'tenants:write', resource: 'tenants', action: 'write', scope: 'ALL' as const, description: 'Write tenant data across all tenants', category: 'Tenant Management' },
    { name: 'tenants:delete', resource: 'tenants', action: 'delete', scope: 'ALL' as const, description: 'Delete tenants across all tenants', category: 'Tenant Management' },

    // Role Management
    { name: 'roles:read', resource: 'roles', action: 'read', scope: 'ALL' as const, description: 'Read role data across all tenants', category: 'Role Management' },
    { name: 'roles:write', resource: 'roles', action: 'write', scope: 'ALL' as const, description: 'Write role data across all tenants', category: 'Role Management' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', scope: 'ALL' as const, description: 'Delete roles across all tenants', category: 'Role Management' },

    // System Management
    { name: 'system:read', resource: 'system', action: 'read', scope: 'ALL' as const, description: 'Read system configuration', category: 'System Management' },
    { name: 'system:write', resource: 'system', action: 'write', scope: 'ALL' as const, description: 'Write system configuration', category: 'System Management' },
    { name: 'audit:read', resource: 'audit', action: 'read', scope: 'ALL' as const, description: 'Read audit logs', category: 'System Management' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: {
        ...permission,
        isSystemPermission: true,
      },
    });
  }

  console.log('✅ Basic permissions created');

  // 6. Assign all permissions to Super Admin role
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        }
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
        grantedBy: superAdmin.id,
      },
    });
  }

  console.log('✅ All permissions assigned to Super Admin role');

  // 7. Create Tenant-specific Permissions
  const tenantPermissions = [
    { name: 'users:read', resource: 'users', action: 'read', scope: 'TENANT' as const, description: 'Read users within tenant', category: 'User Management' },
    { name: 'users:write', resource: 'users', action: 'write', scope: 'TENANT' as const, description: 'Write users within tenant', category: 'User Management' },
    { name: 'tenants:read', resource: 'tenants', action: 'read', scope: 'TENANT' as const, description: 'Read tenant information', category: 'Tenant Management' },
    { name: 'roles:read', resource: 'roles', action: 'read', scope: 'TENANT' as const, description: 'Read roles within tenant', category: 'Role Management' },
  ];

  for (const permission of tenantPermissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: {
        ...permission,
        isSystemPermission: false,
      },
    });
  }

  console.log('✅ Tenant-specific permissions created');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('🔑 Super Admin: superadmin@system.com / SuperAdmin123!');
  console.log('\n🏢 Tenants:');
  console.log('🏛️  Core Tenant: core (System Management)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });