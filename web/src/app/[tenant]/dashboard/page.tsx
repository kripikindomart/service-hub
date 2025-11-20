'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/tenant-isolation'
import { useAuth } from '@/hooks/useAuth'
import { menuService } from '@/services/menu.service'
import { BuildingOfficeIcon, UsersIcon, FolderIcon, ChartBarIcon, HomeIcon, SettingsIcon, BarChart3Icon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function TenantDashboardContent() {
  const { tenant, slug } = useTenant()
  const { user, currentTenant } = useAuth()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [menus, setMenus] = useState<any[]>([])
  const [tenantSettings, setTenantSettings] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const loadTenantData = async () => {
      if (!tenant) return

      try {
        setIsLoading(true)

        // Load tenant-specific menus
        const tenantMenus = await menuService.getSidebarMenus(tenant.id)
        setMenus(tenantMenus)

        // Load tenant settings/preferences
        const settings = await menuService.getTenantSettings(tenant.id)
        setTenantSettings(settings)

        console.log('Tenant Dashboard loaded:', {
          tenantName: tenant.name,
          menus: tenantMenus.length,
          settings
        })
      } catch (error) {
        console.error('Error loading tenant dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTenantData()
  }, [tenant])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {tenant?.name || 'tenant'} dashboard...</p>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">No tenant selected</p>
        </div>
      </div>
    )
  }

  // Get theme colors from tenant settings
  const primaryColor = tenantSettings?.primaryColor || '#3B82F6'
  const theme = tenantSettings?.theme || 'default'

  // Get navigation items
  const getNavigationItems = () => {
    if (menus.length > 0) {
      return menus.map((menu: any) => ({
        name: menu.label,
        href: `/${slug}${menu.path}`,
        icon: menu.icon === 'HomeIcon' ? HomeIcon :
               menu.icon === 'BuildingOfficeIcon' ? BuildingOfficeIcon :
               menu.icon === 'UsersIcon' ? UsersIcon :
               menu.icon === 'ChartBarIcon' ? ChartBarIcon :
               menu.icon === 'SettingsIcon' ? SettingsIcon :
               BuildingOfficeIcon,
        current: pathname === `/${slug}${menu.path}`
      }))
    }

    // Default navigation
    return [
      {
        name: 'Dashboard',
        href: `/${slug}/dashboard`,
        icon: HomeIcon,
        current: pathname === `/${slug}/dashboard`
      },
      {
        name: 'Analytics',
        href: `/${slug}/analytics`,
        icon: ChartBarIcon,
        current: pathname === `/${slug}/analytics`
      },
      {
        name: 'Settings',
        href: `/${slug}/settings`,
        icon: SettingsIcon,
        current: pathname === `/${slug}/settings`
      }
    ]
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo and tenant info */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">{tenant?.name || 'Tenant'}</span>
              <p className="text-xs text-gray-500">{tenant?.type || 'BUSINESS'} Tenant</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                ${item.current
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              <span className="truncate">{item.name}</span>
              {item.current && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentTenant?.name || 'No Tenant'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top navigation bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Page title */}
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                {tenant && (
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg">
                    <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{tenant.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {tenant.name}
          </h2>
          <p className="text-gray-600">
            This is your personalized dashboard for {tenantSettings?.branding || tenant.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white rounded-lg shadow p-6 border-l-4"
            style={{ borderLeftColor: primaryColor }}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full mr-4" style={{ backgroundColor: primaryColor + '20' }}>
                <BuildingOfficeIcon className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tenant</p>
                <p className="text-2xl font-semibold text-gray-900">{tenant.name}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full mr-4 bg-blue-100">
                <FolderIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Menu Items</p>
                <p className="text-2xl font-semibold text-gray-900">{menus.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full mr-4 bg-green-100">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <p className="text-2xl font-semibold text-gray-900">{tenant.type}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full mr-4 bg-purple-100">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-semibold text-gray-900">{(tenant as any).status || 'Active'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Menus */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Available Menus</h3>
          </div>
          <div className="p-6">
            {menus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    style={{ borderColor: primaryColor + '30' }}
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className="p-2 rounded mr-3"
                        style={{ backgroundColor: primaryColor + '20' }}
                      >
                        <BuildingOfficeIcon className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{menu.label}</h4>
                        <p className="text-sm text-gray-500">{menu.path}</p>
                      </div>
                    </div>
                    {menu.description && (
                      <p className="text-sm text-gray-600">{menu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No menus available for this tenant</p>
              </div>
            )}
          </div>
        </div>

        {/* Tenant Settings */}
        {tenantSettings && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Tenant Settings</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Branding</h4>
                  <p className="text-sm text-gray-600">{tenantSettings.branding}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Theme</h4>
                  <p className="text-sm text-gray-600">{tenantSettings.theme}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Dashboard Layout</h4>
                  <p className="text-sm text-gray-600">{tenantSettings.dashboardLayout}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Primary Color</h4>
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 rounded mr-2"
                      style={{ backgroundColor: primaryColor }}
                    ></div>
                    <span className="text-sm text-gray-600">{primaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}

export default function TenantDashboard() {
  return <TenantDashboardContent />
}