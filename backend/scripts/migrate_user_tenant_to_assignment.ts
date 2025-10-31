import { PrismaClient } from '@prisma/client';
import { RoleLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserTenantToAssignment() {
  console.log('🔄 Starting migration from UserTenant to UserAssignment...');

  try {
    // Step 1: Get all existing UserTenant records
    const userTenants = await prisma.userTenant.findMany({
      include: {
        user: true,
        tenant: true,
        role: true
      }
    });

    console.log(`📊 Found ${userTenants.length} UserTenant records to migrate`);

    // Step 2: Create UserAssignment records
    for (const userTenant of userTenants) {
      // Determine priority based on role level
      const priorityMap: Record<string, number> = {
        'SUPER_ADMIN': 10,
        'ADMIN': 8,
        'MANAGER': 6,
        'USER': 4,
        'GUEST': 2
      };

      const priority = priorityMap[userTenant.role.level] || 4;

      // Create UserAssignment record
      await prisma.userAssignment.create({
        data: {
          userId: userTenant.userId,
          tenantId: userTenant.tenantId,
          organizationId: null, // Set null for now, can be updated later
          roleId: userTenant.roleId,
          status: userTenant.status as any, // Convert EntityStatus to AssignmentStatus
          isPrimary: userTenant.isPrimary,
          priority,
          assignedBy: userTenant.assignedBy,
          assignedAt: userTenant.assignedAt,
          expiresAt: userTenant.expiresAt,
          suspensionReason: userTenant.suspensionReason,
          suspensionUntil: userTenant.suspensionUntil,
          suspendedBy: userTenant.suspendedBy,
          lastAccessedAt: userTenant.lastAccessedAt,
          accessCount: userTenant.accessCount,
          notes: `Migrated from UserTenant (${userTenant.id})`
        }
      });

      console.log(`✅ Migrated UserTenant ${userTenant.id} for user: ${userTenant.user.email}`);
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function rollbackMigration() {
  console.log('🔄 Rolling back migration...');

  try {
    // Delete all UserAssignment records that were created from UserTenant
    const deletedCount = await prisma.userAssignment.deleteMany({
      where: {
        notes: {
          contains: 'Migrated from UserTenant'
        }
      }
    });

    console.log(`✅ Rolled back ${deletedCount.count} UserAssignment records`);

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');

  try {
    const userAssignmentCount = await prisma.userAssignment.count({
      where: {
        notes: {
          contains: 'Migrated from UserTenant'
        }
      }
    });

    const userTenantCount = await prisma.userTenant.count();

    console.log(`📊 UserAssignment records: ${userAssignmentCount}`);
    console.log(`📊 Remaining UserTenant records: ${userTenantCount}`);

    if (userAssignmentCount > 0 && userTenantCount === 0) {
      console.log('✅ Migration verified successfully!');
    } else {
      console.log('⚠️  Migration verification failed!');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run the migration
async function main() {
  const action = process.argv[2];

  switch (action) {
    case 'migrate':
      await migrateUserTenantToAssignment();
      break;
    case 'rollback':
      await rollbackMigration();
      break;
    case 'verify':
      await verifyMigration();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run migrate-user-tenant migrate  # Run migration');
      console.log('  npm run migrate-user-tenant rollback  # Rollback migration');
      console.log('  npm run migrate-user-tenant verify   # Verify migration');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });