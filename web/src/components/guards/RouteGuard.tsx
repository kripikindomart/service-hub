'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { tenantRoleInheritanceService } from '@/services/tenant-role-inheritance.service'
import { tenantIsolation } from '@/lib/tenant-isolation'

interface RouteGuardProps {
  children: React.ReactNode
  requiredPermission?: string
  fallbackPath?: string
}

export default function RouteGuard({
  children,
  requiredPermission,
  fallbackPath = '/dashboard'
}: RouteGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // First check if we have a current tenant
        const currentTenant = tenantIsolation.getCurrentTenant()
        if (!currentTenant) {
          console.warn('No current tenant found, redirecting to login')
          router.push('/login')
          return
        }

        // Check if user can access the current route
        const canAccess = tenantRoleInheritanceService.canAccessRoute(pathname)

        // If specific permission is required, check that too
        if (requiredPermission) {
          const roleContext = tenantRoleInheritanceService.getCurrentRoleContext()
          const hasRequiredPermission = checkRequiredPermission(roleContext, requiredPermission)
          setHasAccess(canAccess && hasRequiredPermission)
        } else {
          setHasAccess(canAccess)
        }

        // If access is denied, redirect to fallback path
        if (!canAccess) {
          console.warn(`Access denied to route: ${pathname}, redirecting to: ${fallbackPath}`)
          router.push(fallbackPath)

          // Show toast notification
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('showToast', {
              detail: {
                type: 'error',
                message: 'You do not have permission to access this page'
              }
            }))
          }
        }
      } catch (error) {
        console.error('Error checking route access:', error)
        // On error, deny access and redirect
        router.push('/login')
      } finally {
        setIsChecking(false)
      }
    }

    checkAccess()
  }, [pathname, router, requiredPermission, fallbackPath])

  // Listen for tenant switches to recheck access
  useEffect(() => {
    const handleTenantSwitch = () => {
      setIsChecking(true)
      // Recheck access after tenant switch
      setTimeout(() => {
        window.location.reload() // Force reload to re-evaluate access
      }, 100)
    }

    window.addEventListener('tenantSwitched', handleTenantSwitch)
    window.addEventListener('tenantChanged', handleTenantSwitch)

    return () => {
      window.removeEventListener('tenantSwitched', handleTenantSwitch)
      window.removeEventListener('tenantChanged', handleTenantSwitch)
    }
  }, [])

  // Check specific permission
  const checkRequiredPermission = (roleContext: any, permission: string): boolean => {
    if (!roleContext) return false

    const permissions = roleContext.effectivePermissions

    switch (permission) {
      case 'access_manager':
        return permissions.canAccessManager
      case 'manage_tenants':
        return permissions.canAccessTenants
      case 'manage_users':
        return permissions.canAccessUsers
      case 'manage_roles':
        return permissions.canAccessRoles
      case 'manage_settings':
        return permissions.canAccessSettings
      case 'super_admin':
        return permissions.isSuperAdmin
      case 'core_super_admin':
        return permissions.isCoreSuperAdmin
      default:
        return true
    }
  }

  // Show loading state while checking access
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">Checking permissions...</span>
      </div>
    )
  }

  // Show children only if access is granted
  return hasAccess ? <>{children}</> : null
}

// Hook for route protection
export function useRouteGuard() {
  const router = useRouter()
  const pathname = usePathname()

  const checkAccess = (requiredPermission?: string) => {
    const canAccess = tenantRoleInheritanceService.canAccessRoute(pathname)

    if (requiredPermission) {
      const roleContext = tenantRoleInheritanceService.getCurrentRoleContext()
      // Check specific permission logic here
      return canAccess
    }

    return canAccess
  }

  const redirectToAllowedRoute = () => {
    const roleContext = tenantRoleInheritanceService.getCurrentRoleContext()
    if (!roleContext) {
      router.push('/login')
      return
    }

    const permissions = roleContext.effectivePermissions

    // Redirect based on permissions
    if (permissions.canAccessTenants) {
      router.push('/manager/tenants')
    } else if (permissions.canAccessUsers) {
      router.push('/manager/users')
    } else if (permissions.canAccessManager) {
      router.push('/dashboard')
    } else {
      router.push('/dashboard') // Default fallback
    }
  }

  return {
    checkAccess,
    redirectToAllowedRoute,
    getCurrentPermissions: () => {
      const context = tenantRoleInheritanceService.getCurrentRoleContext()
      return context?.effectivePermissions || {}
    }
  }
}