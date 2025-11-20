'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

interface TenantRouterProps {
  children: React.ReactNode
}

export default function TenantRouter({ children }: TenantRouterProps) {
  const [currentTenant, setCurrentTenant] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const initializeTenant = () => {
      try {
        const authUser = getAuthUser()
        if (!authUser) {
          router.push('/login')
          return
        }

        // Get current tenant from localStorage
        const storedTenant = localStorage.getItem('currentTenant')
        if (storedTenant) {
          const tenant = JSON.parse(storedTenant)
          setCurrentTenant(tenant)
          console.log('Current tenant loaded:', tenant)
        }

        // Listen for tenant changes
        const handleTenantChange = (event: CustomEvent) => {
          const { tenant } = event.detail
          setCurrentTenant(tenant)
          console.log('Tenant changed to:', tenant)

          // Update URL to reflect tenant change if needed
          const currentPath = window.location.pathname
          if (tenant && tenant.slug) {
            // If we're not already on a tenant-specific path, redirect
            if (!currentPath.includes(`/[tenant]`) && !currentPath.includes(tenant.slug)) {
              const newPath = `/${tenant.slug}${currentPath.replace(/^\/[^\/]*/, '') || '/dashboard'}`
              console.log('Redirecting to tenant path:', newPath)
              router.push(newPath)
            }
          }
        }

        window.addEventListener('tenantChanged', handleTenantChange as EventListener)

        return () => {
          window.removeEventListener('tenantChanged', handleTenantChange as EventListener)
        }
      } catch (error) {
        console.error('Error initializing tenant:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeTenant()
  }, [router])

  // Handle tenant-specific routes
  useEffect(() => {
    if (currentTenant && pathname) {
      console.log('Current path:', pathname)
      console.log('Current tenant:', currentTenant.slug)

      // Check if we need to redirect for tenant-specific routing
      if (pathname === '/' || pathname === '/dashboard') {
        // Redirect to tenant-specific dashboard
        router.push(`/${currentTenant.slug}/dashboard`)
      }
    }
  }, [currentTenant, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return <>{children}</>
}