import { apiClient } from '@/lib/api-client'

export interface Tenant {
  id: string
  name: string
  slug: string
  type: string
  tier: string
  status: string
  primaryColor?: string
  logoUrl?: string
  userCount: number
  role: string
  level: string
  isCurrentlyAssigned?: boolean
  canSwitch: boolean
  isSuperAdminSwitch?: boolean
  switchedAt?: string
}

export interface SuperAdminTenantSwitchResponse {
  success: boolean
  message: string
  data: Tenant
}

export interface PaginatedTenantsResponse {
  success: boolean
  message: string
  data: {
    items: Tenant[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

class SuperAdminTenantService {
  private baseUrl = '/tenants'

  /**
   * Switch to any tenant as super admin
   */
  async switchAsSuperAdmin(tenantId: string): Promise<Tenant> {
    const response = await apiClient.post<SuperAdminTenantSwitchResponse>(
      `${this.baseUrl}/super-admin/switch`,
      { tenantId }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data
  }

  /**
   * Get all available tenants for super admin switching
   */
  async getAllTenantsForSuperAdmin(params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    status?: string
  }): Promise<PaginatedTenantsResponse['data']> {
    const response = await apiClient.get<PaginatedTenantsResponse>(
      `${this.baseUrl}/super-admin/all-tenants`,
      { params }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    return response.data.data
  }

  /**
   * Check if current user is super admin
   */
  async isCurrentUserSuperAdmin(): Promise<boolean> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/super-admin/check-status`)
      return response.data?.data?.isSuperAdmin || false
    } catch (error) {
      console.error('Error checking super admin status:', error)
      return false
    }
  }

  /**
   * Get current user's role level
   */
  async getCurrentUserRoleLevel(): Promise<string> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/current-role`)
      return response.data?.data?.role?.level || 'USER'
    } catch (error) {
      console.error('Error getting current user role level:', error)
      return 'USER'
    }
  }

  /**
   * Get current user permissions
   */
  async getCurrentUserPermissions(): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/current-role`)
      return response.data?.data?.permissions || {}
    } catch (error) {
      console.error('Error getting current user permissions:', error)
      return {}
    }
  }
}

export const superAdminTenantService = new SuperAdminTenantService()
export default superAdminTenantService