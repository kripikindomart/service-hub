import { PrismaClient } from '@prisma/client'
import { MenuLocation } from '@prisma/client'

const prisma = new PrismaClient()

async function clearMenus() {
  console.log('🗑️  Deleting existing menu data...')

  try {
    // Delete all menu records
    const result = await prisma.menu.deleteMany({})
    console.log(`✅ Deleted ${result.count} menu records`)

    // Reset auto-increment
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'Menu'`
    console.log('✅ Reset menu ID sequence')

  } catch (error) {
    console.error('❌ Error clearing menus:', error)
    throw error
  }
}

async function main() {
  await clearMenus()
  await prisma.$disconnect()
}

main().catch(console.error)