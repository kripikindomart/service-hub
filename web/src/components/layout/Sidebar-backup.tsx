'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChevronRightIcon,
  CogIcon,
  UserIcon,
  WrenchIcon,
  DocumentTextIcon,
  LinkIcon as LinkIconComponent,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAuthUser, clearAuthData } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { menuService } from '@/services/menu.service'
import { MenuItem } from '@/types'
import { Badge } from '@/components/ui/badge'

// Mock tenant data
const mockTenants = [
  { id: '1', name: 'System Core', slug: 'core', type: 'CORE', isActive: true },
  { id: '2', name: 'Company A', slug: 'company-a', type: 'BUSINESS', isActive: true },
  { id: '3', name: 'Company B', slug: 'company-b', type: 'BUSINESS', isActive: false },
  { id: '4', name: 'Personal Account', slug: 'personal', type: 'PERSONAL', isActive: false },
]

export default function Sidebar({ mobileOpen, onMobileClose, collapsed = false }: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed?: boolean;
}) {
  const [user, setUser] = useState<any>(null)
  const [currentTenant, setCurrentTenant] = useState(mockTenants[0])
  const [tenants, setTenants] = useState(mockTenants)
  const [sidebarMenus, setSidebarMenus] = useState<MenuItem[]>([])
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const authUser = getAuthUser()
    if (!authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)

    // For super admin, show all tenants
    // For regular users, show only assigned tenants
    if (authUser.userTenants) {
      const userTenants = authUser.userTenants.map((ut: any) => ut.tenant)
      setTenants(userTenants.length > 0 ? userTenants : mockTenants)
      if (userTenants.length > 0) {
        setCurrentTenant(userTenants[0])
      }
    }
  }, [router])

  // Load sidebar menus from API
  useEffect(() => {
    const loadSidebarMenus = async () => {
      try {
        setLoading(true)
        const menus = await menuService.getSidebarMenus(currentTenant?.id)
        setSidebarMenus(menus)

        // Auto-expand menus that contain current path
        const expandedSet = new Set<string>()
        const findExpandedMenus = (menuItems: MenuItem[]) => {
          menuItems.forEach(menu => {
            if (menu.children && menu.children.length > 0) {
              const hasActiveChild = menu.children.some(child =>
                pathname === child.path || pathname.startsWith(child.path + '/')
              )
              if (hasActiveChild) {
                expandedSet.add(menu.id)
              }
              findExpandedMenus(menu.children)
            }
          })
        }
        findExpandedMenus(menus)
        setExpandedMenus(expandedSet)
      } catch (error) {
        console.error('Error loading sidebar menus:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && currentTenant) {
      loadSidebarMenus()
    }
  }, [user, currentTenant, pathname])

  const handleTenantSwitch = (tenant: any) => {
    setCurrentTenant(tenant)
    // Here you would make an API call to switch tenant context
    console.log('Switching to tenant:', tenant.slug)
    // Optionally refresh page or update context
  }

  // Toggle menu expansion
  const toggleMenuExpansion = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(menuId)) {
        newSet.delete(menuId)
      } else {
        newSet.add(menuId)
      }
      return newSet
    })
  }

  // Icon mapping function
  const getMenuIcon = (iconName?: string, fallback?: any) => {
    if (!iconName && fallback) return fallback

    const iconMap: Record<string, any> = {
      'Home': HomeIcon,
      'Dashboard': HomeIcon,
      'home': HomeIcon,
      'dashboard': HomeIcon,
      'Users': UserGroupIcon,
      'UserManagement': UserGroupIcon,
      'users': UserGroupIcon,
      'user_management': UserGroupIcon,
      'Roles': ShieldCheckIcon,
      'Permissions': ShieldCheckIcon,
      'AccessControl': ShieldCheckIcon,
      'rbac': ShieldCheckIcon,
      'roles': ShieldCheckIcon,
      'permissions': ShieldCheckIcon,
      'Tenants': BuildingOfficeIcon,
      'TenantManagement': BuildingOfficeIcon,
      'tenant_management': BuildingOfficeIcon,
      'tenants': BuildingOfficeIcon,
      'Settings': CogIcon,
      'GeneralSettings': WrenchIcon,
      'MenuManagement': CogIcon,
      'menu_management': CogIcon,
      'general_settings': WrenchIcon,
      'Profile': UserIcon,
      'profile': UserIcon,
      'Documents': DocumentTextIcon,
      'External': LinkIconComponent,
      'external_docs': LinkIconComponent,
    }

    return iconMap[iconName || ''] || fallback || HomeIcon
  }

  const handleLogout = () => {
    clearAuthData()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Render menu item recursively
  const renderMenuItem = (menu: MenuItem, level: number = 0) => {
    const isActive = pathname === menu.path || pathname.startsWith(menu.path + '/')
    const hasChildren = menu.children && menu.children.length > 0
    const isExpanded = expandedMenus.has(menu.id)
    const IconComponent = getMenuIcon(menu.icon, menu.name)

    return (
      <div key={menu.id}>
        <Link
          href={menu.path || '#'}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault()
              toggleMenuExpansion(menu.id)
            } else {
              onMobileClose()
            }
          }}
          className={`
            group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
            ${collapsed ? 'justify-center' : 'justify-start'}
            ${isActive
              ? 'vibrant-gradient text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
            }
            ${level > 0 ? `ml-${level * 4}` : ''}
          `}
        >
          <IconComponent
            className={`
              ${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0
              ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}
            `}
          />
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span className="flex items-center">
                {menu.label}
                {menu.metadata?.badge && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {menu.metadata.badge}
                  </Badge>
                )}
              </span>
              <div className="flex items-center space-x-1">
                {hasChildren && (
                  <ChevronRightIcon
                    className={`
                      h-4 w-4 transition-transform duration-200
                      ${isExpanded ? 'rotate-90' : ''}
                      ${isActive ? 'text-white' : 'text-gray-400'}
                    `}
                  />
                )}
                {isActive && !hasChildren && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </div>
          )}
          {collapsed && hasChildren && (
            <ChevronRightIcon
              className={`
                h-4 w-4 transition-transform duration-200
                ${isExpanded ? 'rotate-90' : ''}
                ${isActive ? 'text-white' : 'text-gray-400'}
              `}
            />
          )}
        </Link>

        {/* Render children if expanded */}
        {!collapsed && hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {menu.children
              .sort((a, b) => a.order - b.order)
              .map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const getTenantColor = (type: string) => {
    switch (type) {
      case 'CORE': return 'vibrant-gradient'
      case 'BUSINESS': return 'purple-gradient'
      case 'PERSONAL': return 'success-gradient'
      default: return 'bg-gray-500'
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200/80 backdrop-blur-sm shadow-xl
        transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo and brand */}
          <div className={`flex items-center h-16 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm ${
            collapsed ? 'px-4 justify-center' : 'px-6'
          }`}>
            <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
              <div className="w-8 h-8 vibrant-gradient rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-lg font-bold text-gradient">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Multi-Tenant Platform</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {loading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded-lg mb-2"></div>
                  </div>
                ))}
              </div>
            ) : sidebarMenus.length > 0 ? (
              // Dynamic menu from API
              <div className="space-y-2">
                {sidebarMenus
                  .sort((a, b) => a.order - b.order)
                  .map(menu => renderMenuItem(menu))}
              </div>
            ) : (
              // Fallback to static navigation if no menus loaded
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Default Navigation
                </div>
                {[
                  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
                  { name: 'Users', href: '/manager/users', icon: UserGroupIcon },
                  { name: 'Tenants', href: '/manager/tenants', icon: BuildingOfficeIcon },
                ].map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onMobileClose}
                      className={`
                        group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                        ${collapsed ? 'justify-center' : 'justify-start'}
                        ${isActive
                          ? 'vibrant-gradient text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          ${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0
                          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                      />
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between">
                          <span>{item.name}</span>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          {/* Tenant Switcher */}
          <div className={`p-4 border-t border-gray-200/60 bg-gray-50/30 ${
            collapsed ? 'px-2' : ''
          }`}>
            {!collapsed ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200/60 shadow-sm"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className={`w-8 h-8 rounded-lg ${getTenantColor(currentTenant.type)} flex items-center justify-center`}>
                          <BuildingOfficeIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {currentTenant.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {currentTenant.type} • {currentTenant.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel className="font-semibold">
                      Switch Tenant
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {tenants.map((tenant) => (
                      <DropdownMenuItem
                        key={tenant.id}
                        onClick={() => handleTenantSwitch(tenant)}
                        className="cursor-pointer p-3"
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <div className={`w-8 h-8 rounded-lg ${getTenantColor(tenant.type)} flex items-center justify-center`}>
                            <BuildingOfficeIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {tenant.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tenant.type} • {tenant.isActive ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                          {currentTenant.id === tenant.id && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-blue-600 hover:text-blue-700">
                      <BuildingOfficeIcon className="mr-2 h-4 w-4" />
                      <span>Manage Tenants</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User profile & logout */}
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200/60">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.name} />
                      <AvatarFallback className="text-xs font-medium vibrant-gradient text-white">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              // Collapsed state - only show icons
              <div className="space-y-3">
                <div className={`w-8 h-8 rounded-lg ${getTenantColor(currentTenant.type)} flex items-center justify-center mx-auto cursor-pointer`}
                     onClick={() => handleTenantSwitch(currentTenant)}>
                  <BuildingOfficeIcon className="w-4 h-4 text-white" />
                </div>
                <Avatar className="h-8 w-8 mx-auto cursor-pointer">
                  <AvatarImage src="" alt={user?.name} />
                  <AvatarFallback className="text-xs font-medium vibrant-gradient text-white">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}