import { getAuthUser } from './auth'

export interface TenantContext {
  id: string
  name: string
  slug: string
  type: string
  primaryColor?: string
  settings?: any
}

export class TenantIsolation {
  private static instance: TenantIsolation
  private currentTenant: TenantContext | null = null

  private constructor() {}

  static getInstance(): TenantIsolation {
    if (!TenantIsolation.instance) {
      TenantIsolation.instance = new TenantIsolation()
    }
    return TenantIsolation.instance
  }

  /**
   * Set current tenant context
   */
  setCurrentTenant(tenant: TenantContext | null): void {
    this.currentTenant = tenant

    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return
    }

    if (tenant) {
      localStorage.setItem('currentTenant', JSON.stringify(tenant))
      console.log('Tenant isolation: Set current tenant to', tenant.slug)
    } else {
      localStorage.removeItem('currentTenant')
      console.log('Tenant isolation: Cleared current tenant')
    }
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant(): TenantContext | null {
    if (this.currentTenant) {
      return this.currentTenant
    }

    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return null
    }

    // Try to get from localStorage
    const stored = localStorage.getItem('currentTenant')
    if (stored) {
      try {
        const tenant = JSON.parse(stored)
        this.currentTenant = tenant
        return tenant
      } catch (error) {
        console.error('Error parsing stored tenant:', error)
        localStorage.removeItem('currentTenant')
      }
    }

    return null
  }

  /**
   * Get current tenant ID for API calls
   */
  getCurrentTenantId(): string | null {
    const tenant = this.getCurrentTenant()
    return tenant?.id || null
  }

  /**
   * Get current tenant slug for routing
   */
  getCurrentTenantSlug(): string | null {
    const tenant = this.getCurrentTenant()
    return tenant?.slug || null
  }

  /**
   * Check if user can access specific tenant
   */
  canAccessTenant(tenantId: string): boolean {
    const currentTenant = this.getCurrentTenant()
    if (!currentTenant) return false

    // Super admin can access any tenant
    const user = getAuthUser()
    if (user?.roleLevel === 'SUPER_ADMIN') {
      return true
    }

    // Regular user can only access current tenant
    return currentTenant.id === tenantId
  }

  /**
   * Validate tenant access for API responses
   */
  validateTenantAccess(data: any, tenantField: string = 'tenantId'): boolean {
    const currentTenant = this.getCurrentTenant()
    if (!currentTenant) return false

    // Super admin can access any data
    const user = getAuthUser()
    if (user?.roleLevel === 'SUPER_ADMIN') {
      return true
    }

    // Check if data belongs to current tenant
    return data[tenantField] === currentTenant.id
  }

  /**
   * Filter array data by current tenant
   */
  filterByTenant<T extends Record<string, any>>(
    data: T[],
    tenantField: string = 'tenantId'
  ): T[] {
    const currentTenant = this.getCurrentTenant()
    if (!currentTenant) return []

    const user = getAuthUser()
    if (user?.roleLevel === 'SUPER_ADMIN') {
      return data // Super admin can see all
    }

    return data.filter(item => item[tenantField] === currentTenant.id)
  }

  /**
   * Add tenant context to API requests
   */
  addTenantToRequest(request: any): any {
    const tenantId = this.getCurrentTenantId()
    if (tenantId) {
      request.headers = {
        ...request.headers,
        'X-Tenant-ID': tenantId
      }
    }
    return request
  }

  /**
   * Clear tenant context (logout)
   */
  clearTenant(): void {
    this.currentTenant = null
    localStorage.removeItem('currentTenant')
    console.log('Tenant isolation: Cleared tenant context')
  }

  /**
   * Check if tenant is active and accessible
   */
  isTenantAccessible(): boolean {
    const tenant = this.getCurrentTenant()
    if (!tenant) return false

    // Add additional checks if needed
    return true
  }
}

// Export singleton instance
export const tenantIsolation = TenantIsolation.getInstance()

// React hook for tenant context
export function useTenant() {
  const tenant = tenantIsolation.getCurrentTenant()
  const tenantId = tenantIsolation.getCurrentTenantId()
  const slug = tenantIsolation.getCurrentTenantSlug()

  return {
    tenant,
    tenantId,
    slug,
    setCurrentTenant: tenantIsolation.setCurrentTenant.bind(tenantIsolation),
    canAccessTenant: tenantIsolation.canAccessTenant.bind(tenantIsolation),
    isAccessible: tenantIsolation.isTenantAccessible()
  }
}