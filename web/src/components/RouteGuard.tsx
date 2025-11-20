'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTenant } from '@/lib/tenant-isolation'
import { menuService } from '@/services/menu.service'

interface RouteGuardProps {
  children: React.ReactNode
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { tenant, slug } = useTenant()
  const [isLoading, setIsLoading] = useState(true)
  const [accessibleMenus, setAccessibleMenus] = useState<any[]>([])

  useEffect(() => {
    const checkRouteAccess = async () => {
      if (!tenant) {
        // No tenant, redirect to login
        router.push('/login')
        return
      }

      setIsLoading(true)

      try {
        // Get tenant-specific menus
        const menus = await menuService.getSidebarMenus(tenant.id)
        setAccessibleMenus(menus)

        // Check if current path is accessible for current tenant
        const isAccessible = isPathAccessible(pathname, menus, slug)

        console.log('Route Guard Check:', {
          pathname,
          tenantSlug: slug,
          tenantId: tenant.id,
          isAccessible,
          menus: menus.map(m => m.path)
        })

        if (!isAccessible) {
          // Find default accessible route (usually dashboard)
          const defaultRoute = findDefaultRoute(menus, slug)
          console.log('Redirecting to default route:', defaultRoute)
          router.push(defaultRoute)
        }
      } catch (error) {
        console.error('Error checking route access:', error)
        // Fallback to tenant dashboard (use slug from current tenant or fallback)
        const currentTenant = JSON.parse(localStorage.getItem('currentTenant') || '{}')
        const tenantSlug = slug || currentTenant?.slug || 'dashboard'
        router.push(`/${tenantSlug}/dashboard`)
      } finally {
        setIsLoading(false)
      }
    }

    checkRouteAccess()

    // Listen for tenant switch events
    const handleTenantSwitch = (event: CustomEvent) => {
      console.log('RouteGuard: Received tenant switch event:', event.detail)
      checkRouteAccess()
    }

    window.addEventListener('tenantSwitched', handleTenantSwitch as EventListener)
    window.addEventListener('tenantChanged', handleTenantSwitch as EventListener)

    return () => {
      window.removeEventListener('tenantSwitched', handleTenantSwitch as EventListener)
      window.removeEventListener('tenantChanged', handleTenantSwitch as EventListener)
    }
  }, [pathname, tenant, slug, router])

  const isPathAccessible = (currentPath: string, menus: any[], tenantSlug: string | null): boolean => {
    // Convert to tenant-specific paths if needed
    const expectedPaths = menus.map(menu => {
      let path = menu.path
      // Replace dynamic paths with tenant slug
      if (path && path.includes('/[tenant]')) {
        path = path.replace('/[tenant]', `/${tenantSlug}`)
      }
      return path
    }).filter(Boolean)

    // Check if current path is in accessible paths
    return expectedPaths.some(path =>
      currentPath === path ||
      currentPath.startsWith(path + '/') ||
      path.startsWith(currentPath + '/')
    )
  }

  const findDefaultRoute = (menus: any[], tenantSlug: string | null): string => {
    // Use tenant-specific dashboard
    if (tenantSlug) {
      return `/${tenantSlug}/dashboard`
    }

    // Fallback: get from current tenant in localStorage
    const currentTenant = JSON.parse(localStorage.getItem('currentTenant') || '{}')
    if (currentTenant?.slug) {
      return `/${currentTenant.slug}/dashboard`
    }

    // Last fallback
    return '/dashboard'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking tenant access...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}