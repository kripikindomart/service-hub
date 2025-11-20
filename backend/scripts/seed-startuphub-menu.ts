import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedStartupHubMenu() {
  console.log('🌱 Seeding StartupHub menu and preferences...')

  try {
    const startuphubTenant = await prisma.tenant.findUnique({
      where: { slug: 'startuphub' }
    })

    if (!startuphubTenant) {
      throw new Error('StartupHub tenant not found')
    }

    // Hapus menu yang ada untuk StartupHub
    await prisma.menu.deleteMany({
      where: { tenantId: startuphubTenant.id }
    })

    // Buat role khusus StartupHub jika belum ada
    let startupHubRoles = await prisma.role.findMany({
      where: { tenantId: startuphubTenant.id }
    })

    if (startupHubRoles.length === 0) {
      const adminRole = await prisma.role.create({
        data: {
          name: 'STARTUP_ADMIN',
          displayName: 'Startup Administrator',
          type: 'TENANT',
          level: 'ADMIN',
          tenantId: startuphubTenant.id,
        }
      })

      const managerRole = await prisma.role.create({
        data: {
          name: 'STARTUP_MANAGER',
          displayName: 'Startup Manager',
          type: 'TENANT',
          level: 'MANAGER',
          tenantId: startuphubTenant.id,
        }
      })

      const userRole = await prisma.role.create({
        data: {
          name: 'STARTUP_USER',
          displayName: 'Startup User',
          type: 'TENANT',
          level: 'USER',
          tenantId: startuphubTenant.id,
        }
      })

      startupHubRoles = [adminRole, managerRole, userRole]
    }

    // Menu Dashboard khusus StartupHub
    const dashboardMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_dashboard',
        label: 'Startup Dashboard',
        icon: 'RocketLaunchIcon',
        path: '/startuphub/dashboard',
        component: 'startuphub/DashboardPage',
        tenantId: startuphubTenant.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 1,
        description: 'StartupHub main dashboard',
        metadata: {
          theme: 'startup-blue',
          widgets: ['stats', 'charts', 'recent-activities']
        }
      }
    })

    // Menu Projects
    const projectsMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_projects',
        label: 'Projects',
        icon: 'FolderIcon',
        path: '/startuphub/projects',
        component: 'startuphub/ProjectsPage',
        tenantId: startuphubTenant.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 2,
        description: 'Manage startup projects'
      }
    })

    // Sub-menu untuk Projects
    await prisma.menu.create({
      data: {
        name: 'project_list',
        label: 'All Projects',
        icon: 'ListBulletIcon',
        path: '/startuphub/projects',
        component: 'startuphub/ProjectListPage',
        tenantId: startuphubTenant.id,
        parentId: projectsMenu.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 1,
      }
    })

    await prisma.menu.create({
      data: {
        name: 'create_project',
        label: 'Create Project',
        icon: 'PlusIcon',
        path: '/startuphub/projects/create',
        component: 'startuphub/CreateProjectPage',
        tenantId: startuphubTenant.id,
        parentId: projectsMenu.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 2,
      }
    })

    // Menu Startups
    const startupsMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_startups',
        label: 'Startups',
        icon: 'LightBulbIcon',
        path: '/startuphub/startups',
        component: 'startuphub/StartupsPage',
        tenantId: startuphubTenant.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 3,
        description: 'Manage startup companies'
      }
    })

    // Menu Investors
    const investorsMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_investors',
        label: 'Investors',
        icon: 'CurrencyDollarIcon',
        path: '/startuphub/investors',
        component: 'startuphub/InvestorsPage',
        tenantId: startuphubTenant.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 4,
        description: 'Manage investor relationships'
      }
    })

    // Menu Analytics
    const analyticsMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_analytics',
        label: 'Analytics',
        icon: 'ChartBarIcon',
        path: '/startuphub/analytics',
        component: 'startuphub/AnalyticsPage',
        tenantId: startuphubTenant.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 5,
        description: 'StartupHub analytics and insights'
      }
    })

    // Menu Resources
    const resourcesMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_resources',
        label: 'Resources',
        icon: 'BookOpenIcon',
        path: '/startuphub/resources',
        component: 'startuphub/ResourcesPage',
        tenantId: startuphubTenant.id,
        category: 'MAIN',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 6,
        description: 'Startup resources and guides'
      }
    })

    // Menu Settings khusus StartupHub
    const settingsMenu = await prisma.menu.create({
      data: {
        name: 'startuphub_settings',
        label: 'Settings',
        icon: 'CogIcon',
        path: '/startuphub/settings',
        component: 'startuphub/SettingsPage',
        tenantId: startuphubTenant.id,
        category: 'SYSTEM',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 100,
        description: 'StartupHub settings and configuration'
      }
    })

    // Sub-menu Settings
    await prisma.menu.create({
      data: {
        name: 'startuphub_general_settings',
        label: 'General',
        icon: 'Cog6ToothIcon',
        path: '/startuphub/settings/general',
        component: 'startuphub/GeneralSettingsPage',
        tenantId: startuphubTenant.id,
        parentId: settingsMenu.id,
        category: 'SYSTEM',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 1,
      }
    })

    await prisma.menu.create({
      data: {
        name: 'startuphub_appearance',
        label: 'Appearance',
        icon: 'PaintBrushIcon',
        path: '/startuphub/settings/appearance',
        component: 'startuphub/AppearanceSettingsPage',
        tenantId: startuphubTenant.id,
        parentId: settingsMenu.id,
        category: 'SYSTEM',
        location: 'SIDEBAR',
        isActive: true,
        isPublic: false,
        order: 2,
        metadata: {
          defaultTheme: 'startup-blue',
          availableThemes: ['startup-blue', 'startup-green', 'startup-purple', 'startup-orange']
        }
      }
    })

    // Update preferences khusus untuk tenant
    await prisma.tenant.update({
      where: { id: startuphubTenant.id },
      data: {
        primaryColor: '#10B981', // Green color for startup
        logoUrl: null,
        settings: {
          theme: 'startup-blue',
          branding: 'StartupHub Inc.',
          dashboardLayout: 'startup-optimized',
          defaultWidgets: ['project-stats', 'funding-progress', 'team-overview'],
          customFeatures: ['project-management', 'investor-tracking', 'startup-metrics']
        }
      }
    })

    console.log('✅ StartupHub menu seeded successfully!')
    console.log(`   Created ${12} menu items for StartupHub`)
    console.log(`   Theme: StartupHub Green (#10B981)`)
    console.log(`   Available roles: ${startupHubRoles.length} roles`)

  } catch (error) {
    console.error('❌ Error seeding StartupHub menu:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedStartupHubMenu()
  .catch(console.error)