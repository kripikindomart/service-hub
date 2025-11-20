'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  CogIcon,
  DocumentTextIcon,
  HeartIcon,
  CodeBracketIcon,
  BeakerIcon,
  BookOpenIcon,
  ArrowPathIcon,
  KeyIcon,
  CheckCircleIcon,
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
import { menuService } from '@/services/menu.service'
import { superAdminTenantService } from '@/services/super-admin-tenant.service'
import { tenantRoleInheritanceService } from '@/services/tenant-role-inheritance.service'
import { tenantIsolation } from '@/lib/tenant-isolation'
import { MenuItem } from '@/types'

export default function Sidebar({ mobileOpen, onMobileClose, collapsed = false }: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed?: boolean;
}) {
  const [user, setUser] = useState<any>(null)
  const [currentTenant, setCurrentTenant] = useState<any>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [allTenants, setAllTenants] = useState<any[]>([])
  const [sidebarMenus, setSidebarMenus] = useState<MenuItem[]>([])
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [showSuperAdminMode, setShowSuperAdminMode] = useState(false)
  const [switchingTenant, setSwitchingTenant] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const authUser = getAuthUser()
    if (!authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)

    // Check if user is super admin and get role level
    const checkSuperAdminStatus = async () => {
      try {
        const permissions = await superAdminTenantService.getCurrentUserPermissions()
        const superAdminStatus = permissions.isSuperAdmin || permissions.isCoreSuperAdmin
        setIsSuperAdmin(superAdminStatus)
        console.log('Super admin status check:', { permissions, superAdminStatus })
      } catch (error) {
        console.error('Error checking super admin status:', error)
        setIsSuperAdmin(false)
      }
    }

    checkSuperAdminStatus()

    // Get current tenant from localStorage
    const tenantStr = localStorage.getItem('currentTenant')
    if (tenantStr) {
      const tenantData = JSON.parse(tenantStr)
      setCurrentTenant(tenantData)
      setTenants([tenantData]) // Set as array for compatibility
    }
  }, [])

  // Listen for tenant changes
  useEffect(() => {
    const handleTenantChange = async () => {
      const tenantStr = localStorage.getItem('currentTenant')
      if (tenantStr) {
        const tenantData = JSON.parse(tenantStr)
        setCurrentTenant(tenantData)
        setTenants([tenantData])

        // Re-check super admin status after tenant change
        try {
          const permissions = await superAdminTenantService.getCurrentUserPermissions()
          const superAdminStatus = permissions.isSuperAdmin || permissions.isCoreSuperAdmin
          setIsSuperAdmin(superAdminStatus)

          // Keep super admin mode active if user is super admin
          if (superAdminStatus) {
            setShowSuperAdminMode(true)
          }

          console.log('Super admin status rechecked after tenant change:', { permissions, superAdminStatus })
        } catch (error) {
          console.error('Error rechecking super admin status:', error)
          setIsSuperAdmin(false)
          setShowSuperAdminMode(false)
        }
      }
    }

    window.addEventListener('tenantChanged', handleTenantChange)
    window.addEventListener('storage', handleTenantChange)

    return () => {
      window.removeEventListener('tenantChanged', handleTenantChange)
      window.removeEventListener('storage', handleTenantChange)
    }
  }, [])

  // Load sidebar menus from API
  useEffect(() => {
    const loadSidebarMenus = async () => {
      if (!currentTenant?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('Loading menus for tenant:', currentTenant.id)
        const menus = await menuService.getSidebarMenus(currentTenant.id)
        setSidebarMenus(menus)
        console.log('Loaded menus:', menus.length)

        // Auto-expand menus that contain current path
        const expandedSet = new Set<string>()
        const findExpandedMenus = (menuItems: MenuItem[]) => {
          menuItems.forEach(menu => {
            // Always expand parent menus marked as isParent in metadata
            if (menu.metadata?.isParent) {
              expandedSet.add(menu.id)
            }

            if (menu.children && menu.children.length > 0) {
              const hasActiveChild = menu.children.some(child =>
                pathname === child.path || (child.path && pathname.startsWith(child.path + '/'))
              )
              if (hasActiveChild) {
                expandedSet.add(menu.id)
              }
              // Also check if the current menu is active (for parent menus)
              if (menu.path && (pathname === menu.path || pathname.startsWith(menu.path + '/'))) {
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

    if (currentTenant) {
      loadSidebarMenus()
    }
  }, [currentTenant, pathname])

  const handleTenantSwitch = async (tenant: any) => {
    try {
      setSwitchingTenant(true)

      if (isSuperAdmin && showSuperAdminMode && !tenant.isCurrentlyAssigned) {
        // Super admin switching to unassigned tenant - use role inheritance
        console.log('Super admin switching to tenant with role inheritance:', tenant.name)

        const roleContext = await tenantRoleInheritanceService.switchTenantWithRoleInheritance(tenant.id)

        // Update current tenant
        setCurrentTenant({
          id: roleContext.tenantId,
          name: roleContext.tenantName,
          slug: roleContext.tenantSlug,
          ...tenant
        })

        // Trigger tenant changed event with role context
        window.dispatchEvent(new CustomEvent('tenantChanged', {
          detail: {
            tenant: {
              id: roleContext.tenantId,
              name: roleContext.tenantName,
              slug: roleContext.tenantSlug,
              ...tenant
            },
            isSuperAdminSwitch: true,
            roleContext: roleContext
          }
        }))

        // Show success notification with role info
        console.log(`Switched to tenant: ${roleContext.tenantName} as ${roleContext.userRole.name}`)

        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              type: 'success',
              message: `Switched to ${roleContext.tenantName} as ${roleContext.userRole.name}`
            }
          }))
        }

        // Load tenant-specific experience
        try {
          const tenantExperience = await menuService.loadTenantSpecificExperience(roleContext.tenantId)
          console.log('Loaded tenant experience:', tenantExperience)

          // Trigger refresh for other components
          window.dispatchEvent(new CustomEvent('tenantExperienceLoaded', {
            detail: { tenant: roleContext, experience: tenantExperience }
          }))

          // Trigger route guard check for tenant switching
          window.dispatchEvent(new CustomEvent('tenantSwitched', {
            detail: {
              tenant: roleContext,
              menus: tenantExperience.menus,
              roleContext: roleContext
            }
          }))
        } catch (error) {
          console.error('Error loading tenant experience:', error)
          // Fallback to reload menus
          loadSidebarMenus()
        }

        // Redirect to tenant-specific dashboard after switching
        const targetSlug = roleContext.tenantSlug || tenant.slug
        router.push(`/${targetSlug}/dashboard`)
      } else {
        // Regular tenant switching or switching to assigned tenant
        console.log('Regular tenant switching to:', tenant.name)

        // Still use role inheritance to get proper role context
        try {
          const roleContext = await tenantRoleInheritanceService.switchTenantWithRoleInheritance(tenant.id)

          setCurrentTenant({
            id: roleContext.tenantId,
            name: roleContext.tenantName,
            slug: roleContext.tenantSlug,
            ...tenant
          })

          window.dispatchEvent(new CustomEvent('tenantChanged', {
            detail: {
              tenant: {
                id: roleContext.tenantId,
                name: roleContext.tenantName,
                slug: roleContext.tenantSlug,
                ...tenant
              },
              isSuperAdminSwitch: false,
              roleContext: roleContext
            }
          }))

          console.log(`Switched to tenant: ${roleContext.tenantName} as ${roleContext.userRole.name}`)

          // Redirect to tenant dashboard using router
          router.push(`/${roleContext.tenantSlug}/dashboard`)
        } catch (error) {
          console.error('Error getting role context, falling back to regular switch:', error)

          // Fallback to regular tenant switching
          setCurrentTenant(tenant)
          localStorage.setItem('currentTenant', JSON.stringify(tenant))
          window.dispatchEvent(new CustomEvent('tenantChanged', {
            detail: { tenant: tenant, isSuperAdminSwitch: false }
          }))
          console.log('Switching to tenant:', tenant.slug)

          // Redirect to tenant dashboard using router
          router.push(`/${tenant.slug}/dashboard`)
        }
      }
    } catch (error) {
      console.error('Error switching tenant:', error)

      // Show error notification
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            type: 'error',
            message: 'Failed to switch tenant'
          }
        }))
      }
    } finally {
      setSwitchingTenant(false)
    }
  }

  const handleSuperAdminSwitch = async () => {
    try {
      setSwitchingTenant(true)
      const allTenantsData = await superAdminTenantService.getAllTenantsForSuperAdmin({
        limit: 100
      })
      setAllTenants(allTenantsData.items)
      setShowSuperAdminMode(!showSuperAdminMode)
    } catch (error) {
      console.error('Error loading all tenants:', error)
    } finally {
      setSwitchingTenant(false)
    }
  }

  const toggleMenu = (menuId: string) => {
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

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'HomeIcon': return <HomeIcon className="h-5 w-5" />
      case 'UserGroupIcon': return <UserGroupIcon className="h-5 w-5" />
      case 'ShieldCheckIcon': return <ShieldCheckIcon className="h-5 w-5" />
      case 'BuildingOfficeIcon': return <BuildingOfficeIcon className="h-5 w-5" />
      case 'CogIcon': return <CogIcon className="h-5 w-5" />
      case 'DocumentTextIcon': return <DocumentTextIcon className="h-5 w-5" />
      case 'HeartIcon': return <HeartIcon className="h-5 w-5" />
      case 'CodeBracketIcon': return <CodeBracketIcon className="h-5 w-5" />
      case 'BeakerIcon': return <BeakerIcon className="h-5 w-5" />
      case 'BookOpenIcon': return <BookOpenIcon className="h-5 w-5" />
      default: return <span className="h-5 w-5">📄</span>
    }
  }

  const renderMenuItem = (menu: MenuItem, depth = 0) => {
    const isExpanded = expandedMenus.has(menu.id)
    const hasChildren = menu.children && menu.children.length > 0
    const isActive = pathname === menu.path || (menu.path && pathname.startsWith(menu.path + '/'))
    const isParentMenu = menu.metadata?.isParent || hasChildren

    // Don't render parent items that have no path and no children
    if (!menu.path && !hasChildren) {
      return null
    }

    const hasActiveChild = hasChildren && menu.children?.some(child =>
      pathname === child.path || (child.path && pathname.startsWith(child.path + '/'))
    )

    return (
      <div key={menu.id} className="w-full">
        {/* Parent menu item */}
        <div
          className={`flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 cursor-pointer ${
            isActive || hasActiveChild
              ? 'vibrant-gradient text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
          } ${collapsed ? 'justify-center' : ''} ${
            depth > 0 ? 'ml-2' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleMenu(menu.id)
            } else if (menu.path) {
              onMobileClose()
              router.push(menu.path)
            }
          }}
        >
          <span className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}>
            {getIconComponent(menu.icon || 'DocumentTextIcon')}
          </span>
          {!collapsed && (
            <>
              <span className={`flex-1 ${depth > 0 ? 'text-sm' : 'font-medium'}`}>
                {menu.label}
              </span>
              {hasChildren && (
                <span className={`ml-2 transition-transform duration-200 ${
                  isExpanded ? 'rotate-0' : 'rotate-90'
                }`}>
                  <ChevronRightIcon className="h-4 w-4" />
                </span>
              )}
            </>
          )}
        </div>

        {/* Child menus - Dropdown */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
            {menu.children?.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
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

  const getTenantColor = (tenant: any) => {
    // Use tenant-specific primary color if available
    if (tenant?.primaryColor) {
      return 'style={{ backgroundColor: tenant.primaryColor }}'
    }

    // Fallback to type-based colors
    switch (tenant?.type) {
      case 'CORE': return 'vibrant-gradient'
      case 'BUSINESS': return 'purple-gradient'
      case 'PERSONAL': return 'success-gradient'
      default: return 'bg-gray-500'
    }
  }

  const getTenantColorStyle = (tenant: any) => {
    // Use tenant-specific primary color if available
    if (tenant?.primaryColor) {
      return { backgroundColor: tenant.primaryColor }
    }

    // Return empty style for type-based classes
    return {}
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
              <div className="px-3 py-2 text-sm text-gray-500">Loading menus...</div>
            ) : sidebarMenus.length > 0 ? (
              sidebarMenus.map(menu => renderMenuItem(menu))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No menus available</div>
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
                        <div className={`w-8 h-8 rounded-lg ${currentTenant && !currentTenant.primaryColor ? getTenantColor(currentTenant) : 'bg-gray-500'} flex items-center justify-center`} style={currentTenant ? getTenantColorStyle(currentTenant) : {}}>
                          <BuildingOfficeIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {currentTenant?.name || 'Select Tenant'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {currentTenant?.type || 'CORE'} • {currentTenant?.isActive !== false ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
                    <DropdownMenuLabel className="font-semibold flex items-center justify-between">
                      <span>Switch Tenant</span>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSuperAdminSwitch}
                          disabled={switchingTenant}
                          className="h-6 px-2 text-xs"
                        >
                          {switchingTenant ? (
                            "Loading..."
                          ) : showSuperAdminMode ? (
                            <span className="flex items-center">
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              Super Mode
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <KeyIcon className="w-3 h-3 mr-1" />
                              Super Mode
                            </span>
                          )}
                        </Button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {showSuperAdminMode && isSuperAdmin && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md mx-2 mb-2">
                          <KeyIcon className="w-3 h-3 inline mr-1" />
                          Super Admin Mode - All Tenants Access
                        </div>
                      </>
                    )}

                    {(showSuperAdminMode && isSuperAdmin ? allTenants : tenants).map((tenant) => {
                      const isAssigned = tenant.isCurrentlyAssigned !== false
                      const needsSuperAdminSwitch = isSuperAdmin && showSuperAdminMode && !isAssigned

                      return (
                        <DropdownMenuItem
                          key={tenant.id}
                          onClick={() => handleTenantSwitch(tenant)}
                          disabled={switchingTenant}
                          className={`cursor-pointer p-3 ${
                            needsSuperAdminSwitch ? 'bg-purple-50 hover:bg-purple-100' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3 w-full">
                            <div className={`w-8 h-8 rounded-lg ${getTenantColor(tenant.type)} flex items-center justify-center`}>
                              <BuildingOfficeIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {tenant.name}
                                {needsSuperAdminSwitch && (
                                  <span className="ml-1 text-purple-600">
                                    <ArrowPathIcon className="w-3 h-3 inline" />
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {tenant.type} • {tenant.status}
                                {needsSuperAdminSwitch && (
                                  <span className="text-purple-600 ml-1">• Super Switch</span>
                                )}
                              </p>
                            </div>
                            {currentTenant?.id === tenant.id && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      )
                    })}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-blue-600 hover:text-blue-700"
                      onClick={() => router.push('/manager/tenants')}
                    >
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
                <div className={`w-8 h-8 rounded-lg ${currentTenant ? getTenantColor(currentTenant.type) : 'bg-gray-500'} flex items-center justify-center mx-auto cursor-pointer`}
                     onClick={() => currentTenant && handleTenantSwitch(currentTenant)}>
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