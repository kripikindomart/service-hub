import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function simpleCheck() {
  console.log('🔍 Simple menu data check...\n')

  // 1. Cek semua tenants
  const tenants = await prisma.tenant.findMany()
  console.log('📋 Tenants:')
  tenants.forEach(t => {
    console.log(`- ${t.name} (${t.slug}) - ID: ${t.id}`)
  })

  // 2. Cek menu untuk setiap tenant
  console.log('\n📊 Menus per tenant:')
  for (const tenant of tenants) {
    const menus = await prisma.menu.findMany({
      where: { tenantId: tenant.id },
      orderBy: { location: 'asc' }
    })

    console.log(`\n${tenant.name} (${tenant.slug}): ${menus.length} menus`)

    const sidebarMenus = menus.filter(m => m.location === 'SIDEBAR')
    const headerMenus = menus.filter(m => m.location === 'HEADER')
    const footerMenus = menus.filter(m => m.location === 'FOOTER')

    console.log(`  - SIDEBAR: ${sidebarMenus.length}`)
    console.log(`  - HEADER: ${headerMenus.length}`)
    console.log(`  - FOOTER: ${footerMenus.length}`)

    if (sidebarMenus.length > 0) {
      console.log('  Sidebar items:')
      sidebarMenus.forEach(m => {
        console.log(`    - ${m.label} (${m.name})`)
      })
    }
  }

  await prisma.$disconnect()
}

simpleCheck().catch(console.error)