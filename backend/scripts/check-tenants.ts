import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTenants() {
  const tenants = await prisma.tenant.findMany()
  console.log('Tenants:', tenants.length)
  tenants.forEach(t => console.log(`- ${t.name} (${t.slug})`))
}

checkTenants().catch(console.error).finally(() => {
  prisma.$disconnect()
})