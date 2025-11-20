import { apiClient } from '@/lib/api-client'
import { superAdminTenantService } from './super-admin-tenant.service'
import { tenantIsolation } from '@/lib/tenant-isolation'

export interface TenantRoleContext {
  tenantId: string
  tenantName: string
  tenantSlug: string
  userId: string
  userRole: {
    id: string
    name: string
    level: string
    permissions: any[]
  }
  isSuperAdminOriginal: boolean
  isCurrentlyImpersonating: boolean
  effectivePermissions: {
    canAccessManager: boolean
    canAccessTenants: boolean
    canAccessUsers: boolean
    canAccessRoles: boolean
    canAccessSettings: boolean
    isSuperAdmin: boolean
    isCoreSuperAdmin: boolean
  }
}

export class TenantRoleInheritanceService {
  private static instance: TenantRoleInheritanceService
  private currentRoleContext: TenantRoleContext | null = null

  private constructor() {}

  static getInstance(): TenantRoleInheritanceService {
    if (!TenantRoleInheritanceService.instance) {
      TenantRoleInheritanceService.instance = new TenantRoleInheritanceService()
    }
    return TenantRoleInheritanceService.instance
  }

  /**
   * Switch tenant with proper role inheritance
   */
  async switchTenantWithRoleInheritance(tenantId: string): Promise<TenantRoleContext> {
    try {
      // First, check if user is a super admin
      const isSuperAdmin = await superAdminTenantService.isCurrentUserSuperAdmin()

      if (isSuperAdmin) {
        // For super admin, get current context to preserve original super admin info
        const currentContext = this.getCurrentRoleContext()

        // Check if switching back to core tenant
        const isCoreTenant = await this.isCoreTenant(tenantId)

        if (isCoreTenant) {
          // Returning to core tenant - restore original super admin privileges
          const coreTenantRoleContext: TenantRoleContext = {
            tenantId: tenantId,
            tenantName: 'System Core',
            tenantSlug: 'system-core',
            userId: this.getCurrentUserId(),
            userRole: {
              id: 'super-admin',
              name: 'Super Admin',
              level: 'SUPER_ADMIN',
              permissions: []
            },
            isSuperAdminOriginal: true,
            isCurrentlyImpersonating: false, // No longer impersonating
            effectivePermissions: {
              canAccessManager: true,
              canAccessTenants: true,
              canAccessUsers: true,
              canAccessRoles: true,
              canAccessSettings: true,
              isSuperAdmin: true,
              isCoreSuperAdmin: true
            }
          }

          // Store role context
          this.currentRoleContext = coreTenantRoleContext

          // Update tenant isolation for core tenant
          tenantIsolation.setCurrentTenant({
            id: tenantId,
            name: 'System Core',
            slug: 'system-core',
            type: 'CORE',
            primaryColor: '#000000',
            settings: {}
          })

          // Store role context in localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('tenantRoleContext', JSON.stringify(coreTenantRoleContext))
          }

          return coreTenantRoleContext
        } else {
          // Super admin switching to another tenant - use super admin endpoint
          const switchedTenant = await superAdminTenantService.switchAsSuperAdmin(tenantId)

          // Get the user's role in the target tenant
          const userRoleInTenant = await this.getUserRoleInTenant(tenantId)

          // Create role context
          const roleContext: TenantRoleContext = {
            tenantId: switchedTenant.id,
            tenantName: switchedTenant.name,
            tenantSlug: switchedTenant.slug,
            userId: this.getCurrentUserId(),
            userRole: userRoleInTenant,
            isSuperAdminOriginal: true,
            isCurrentlyImpersonating: true,
            effectivePermissions: this.calculateEffectivePermissions(userRoleInTenant, true)
          }

          // Store role context
          this.currentRoleContext = roleContext

          // Update tenant isolation
          tenantIsolation.setCurrentTenant({
            id: switchedTenant.id,
            name: switchedTenant.name,
            slug: switchedTenant.slug,
            type: switchedTenant.type,
            primaryColor: switchedTenant.primaryColor,
            settings: switchedTenant.settings
          })

          // Store role context in localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('tenantRoleContext', JSON.stringify(roleContext))
          }

          return roleContext
        }
      } else {
        // Regular user switching - just update tenant context
        const currentTenant = tenantIsolation.getCurrentTenant()
        if (!currentTenant) {
          throw new Error('No current tenant found')
        }

        // Get user's role in the target tenant
        const userRoleInTenant = await this.getUserRoleInTenant(tenantId)

        const roleContext: TenantRoleContext = {
          tenantId: tenantId,
          tenantName: currentTenant.name,
          tenantSlug: currentTenant.slug,
          userId: this.getCurrentUserId(),
          userRole: userRoleInTenant,
          isSuperAdminOriginal: false,
          isCurrentlyImpersonating: false,
          effectivePermissions: this.calculateEffectivePermissions(userRoleInTenant, false)
        }

        this.currentRoleContext = roleContext

        if (typeof window !== 'undefined') {
          localStorage.setItem('tenantRoleContext', JSON.stringify(roleContext))
        }

        return roleContext
      }
    } catch (error) {
      console.error('Error switching tenant with role inheritance:', error)
      throw error
    }
  }

  /**
   * Check if tenant is the core system tenant
   */
  private async isCoreTenant(tenantId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/tenants/${tenantId}`)
      const tenant = response.data?.data
      return tenant?.type === 'CORE' || tenant?.slug === 'system-core' || tenant?.id === 'core'
    } catch (error) {
      console.error('Error checking if tenant is core:', error)
      return false
    }
  }

  /**
   * Get user's role in a specific tenant
   */
  private async getUserRoleInTenant(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/user-role`)

      if (response.data?.success) {
        return response.data.data
      }

      // Fallback to basic user role if no specific assignment found
      return {
        id: 'default-user',
        name: 'User',
        level: 'USER',
        permissions: []
      }
    } catch (error) {
      console.error('Error getting user role in tenant:', error)
      // Return default user role as fallback
      return {
        id: 'default-user',
        name: 'User',
        level: 'USER',
        permissions: []
      }
    }
  }

  /**
   * Calculate effective permissions based on user role and super admin status
   */
  private calculateEffectivePermissions(userRole: any, isOriginalSuperAdmin: boolean): any {
    const permissions = {
      canAccessManager: false,
      canAccessTenants: false,
      canAccessUsers: false,
      canAccessRoles: false,
      canAccessSettings: false,
      isSuperAdmin: false,
      isCoreSuperAdmin: false
    }

    // Check role level
    switch (userRole.level) {
      case 'SUPER_ADMIN':
        permissions.isSuperAdmin = true
        permissions.isCoreSuperAdmin = true
        permissions.canAccessManager = true
        permissions.canAccessTenants = true
        permissions.canAccessUsers = true
        permissions.canAccessRoles = true
        permissions.canAccessSettings = true
        break
      case 'ADMIN':
        permissions.canAccessManager = true
        permissions.canAccessUsers = true
        permissions.canAccessRoles = true
        permissions.canAccessSettings = true
        break
      case 'MANAGER':
        permissions.canAccessManager = true
        permissions.canAccessUsers = true
        break
      case 'USER':
        // Basic user permissions
        break
    }

    // Check specific permissions
    if (userRole.permissions && Array.isArray(userRole.permissions)) {
      userRole.permissions.forEach((permission: any) => {
        switch (permission) {
          case 'access_manager':
            permissions.canAccessManager = true
            break
          case 'manage_tenants':
            permissions.canAccessTenants = true
            break
          case 'manage_users':
            permissions.canAccessUsers = true
            break
          case 'manage_roles':
            permissions.canAccessRoles = true
            break
          case 'manage_settings':
            permissions.canAccessSettings = true
            break
        }
      })
    }

    return permissions
  }

  /**
   * Get current role context
   */
  getCurrentRoleContext(): TenantRoleContext | null {
    if (this.currentRoleContext) {
      return this.currentRoleContext
    }

    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tenantRoleContext')
      if (stored) {
        try {
          const context = JSON.parse(stored)
          this.currentRoleContext = context
          return context
        } catch (error) {
          console.error('Error parsing stored role context:', error)
          localStorage.removeItem('tenantRoleContext')
        }
      }
    }

    return null
  }

  /**
   * Check if current user can access a specific route based on their role in current tenant
   */
  canAccessRoute(routePath: string): boolean {
    const roleContext = this.getCurrentRoleContext()
    if (!roleContext) {
      return false
    }

    const permissions = roleContext.effectivePermissions

    // Define route access rules
    const routeAccessRules: { [key: string]: () => boolean } = {
      '/manager/tenants': () => permissions.canAccessTenants,
      '/manager/users': () => permissions.canAccessUsers,
      '/manager/roles': () => permissions.canAccessRoles,
      '/manager/settings': () => permissions.canAccessSettings,
      '/dashboard': () => permissions.canAccessManager,
      '/admin': () => permissions.isSuperAdmin,
    }

    // Check exact match first
    if (routeAccessRules[routePath]) {
      return routeAccessRules[routePath]()
    }

    // Check partial matches for nested routes
    for (const [route, checkAccess] of Object.entries(routeAccessRules)) {
      if (routePath.startsWith(route + '/')) {
        return checkAccess()
      }
    }

    // Default allow for public routes
    return true
  }

  /**
   * Get current user ID from auth
   */
  private getCurrentUserId(): string {
    // This would typically come from your auth context
    const authUser = this.getAuthUser()
    return authUser?.id || ''
  }

  /**
   * Get auth user (placeholder - implement based on your auth system)
   */
  private getAuthUser(): any {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('authUser')
      if (userStr) {
        try {
          return JSON.parse(userStr)
        } catch (error) {
          console.error('Error parsing auth user:', error)
        }
      }
    }
    return null
  }

  /**
   * Clear role context (logout)
   */
  clearRoleContext(): void {
    this.currentRoleContext = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tenantRoleContext')
    }
  }

  /**
   * Update role context when permissions change
   */
  async updateRoleContext(): Promise<void> {
    const currentTenant = tenantIsolation.getCurrentTenant()
    if (currentTenant) {
      await this.switchTenantWithRoleInheritance(currentTenant.id)
    }
  }
}

export const tenantRoleInheritanceService = TenantRoleInheritanceService.getInstance()
export default tenantRoleInheritanceService