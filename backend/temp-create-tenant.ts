
import { PrismaClient, EntityStatus, TenantType, SubscriptionTier } from '@prisma/client'

const prisma = new PrismaClient()

async function createDemoTenant() {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Organization',
      slug: 'demo',
      type: TenantType.BUSINESS,
      tier: SubscriptionTier.STARTER,
      status: EntityStatus.ACTIVE,
      maxUsers: 50,
      maxServices: 10,
      storageLimitMb: 2048,
      databaseName: 'demo_tenant_db',
      primaryColor: '#3B82F6',
      logoUrl: null,
      faviconUrl: null,
      settings: {},
      featureFlags: {}
    }
  })
  
  console.log('Created tenant:', tenant.name, 'ID:', tenant.id)
  await prisma.$disconnect()
}

createDemoTenant().catch(console.error)

