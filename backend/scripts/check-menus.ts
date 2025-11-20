import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMenuData() {
  console.log('🔍 Checking menu data in database...\n')

  // 1. Cek semua tenants
  const tenants = await prisma.tenant.findMany()
  console.log('📋 Available Tenants:')
  tenants.forEach(t => {
    console.log(`- ID: ${t.id}`)
    console.log(`  Name: ${t.name}`)
    console.log(`  Slug: ${t.slug}`)
    console.log('')
  })

  // 2. Cek menu untuk tenant 'core'
  const coreTenant = tenants.find(t => t.slug === 'core')
  if (coreTenant) {
    console.log(`🎯 Checking menus for tenant: ${coreTenant.name} (${coreTenant.id})`)

    const coreMenus = await prisma.menu.findMany({
      where: {
        tenantId: coreTenant.id
      },
      orderBy: [
        { location: 'asc' },
        { order: 'asc' }
      ]
    })

    console.log(`\n📊 Found ${coreMenus.length} menus for tenant 'core':`)

    // Group by location
    const menusByLocation = coreMenus.reduce((acc, menu) => {
      if (!acc[menu.location]) {
        acc[menu.location] = []
      }
      acc[menu.location].push(menu)
      return acc
    }, {} as Record<string, any[]>)

    Object.entries(menusByLocation).forEach(([location, menus]) => {
      console.log(`\n  📂 ${location} (${menus.length} items):`)
      menus.forEach(menu => {
        console.log(`    - ${menu.label} (${menu.name})`)
        console.log(`      Path: ${menu.path || 'N/A'}`)
        console.log(`      Order: ${menu.order}`)
        console.log(`      Active: ${menu.isActive}`)
        if (menu.parentId) {
          console.log(`      Parent: ${menu.parentId}`)
        }
      })
    })
  } else {
    console.log('❌ Tenant with slug "core" not found!')
  }

  // 3. Cek menu untuk tenant techcorp
  const techcorpTenant = tenants.find(t => t.slug === 'techcorp')
  if (techcorpTenant) {
    console.log(`\n🎯 Checking menus for tenant: ${techcorpTenant.name} (${techcorpTenant.id})`)

    const techcorpMenus = await prisma.menu.findMany({
      where: {
        tenantId: techcorpTenant.id,
        location: 'SIDEBAR'
      },
      orderBy: [
        { order: 'asc' }
      ]
    })

    console.log(`\n📊 Found ${techcorpMenus.length} SIDEBAR menus for tenant 'techcorp':`)
    techcorpMenus.forEach(menu => {
      console.log(`    - ${menu.label} (${menu.name})`)
      console.log(`      Path: ${menu.path || 'N/A'}`)
      console.log(`      Order: ${menu.order}`)
      console.log(`      Active: ${menu.isActive}`)
    })
  }

  // 4. Summary
  const totalMenus = await prisma.menu.count()
  console.log(`\n📈 Summary:`)
  console.log(`- Total tenants: ${tenants.length}`)
  console.log(`- Total menus: ${totalMenus}`)

  await prisma.$disconnect()
}

checkMenuData().catch(console.error)