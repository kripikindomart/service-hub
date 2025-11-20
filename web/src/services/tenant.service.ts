import api from '@/lib/api'

export interface Tenant {
  id: string
  name: string
  slug: string
  type: 'SYSTEM' | 'BUSINESS' | 'TRIAL' | 'DEMO'
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CUSTOM'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
  maxUsers: number
  storageLimitMb: number
  primaryColor: string
  logoUrl?: string
  domain?: string
  createdAt: string
  updatedAt: string
}

export interface TenantsResponse {
  success: boolean
  data: Tenant[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface GetTenantsParams {
  search?: string
  type?: Tenant['type']
  tier?: Tenant['tier']
  status?: Tenant['status']
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class TenantService {
  private baseUrl = '/tenants'

  /**
   * Get all tenants (for super admin)
   */
  async getTenants(params?: GetTenantsParams): Promise<Tenant[]> {
    try {
      const response = await api.get<any>(`${this.baseUrl}`, {
        params: {
          ...params,
          // Default filters for super admin
          status: 'ACTIVE',  // Only show active tenants
          limit: params?.limit || 50  // Reasonable default
        }
      })

      if (response.data?.success) {
        const tenantsData = response.data.data

        // Handle both formats: data array or data.items
        if (Array.isArray(tenantsData)) {
          return tenantsData
        } else if (tenantsData?.items && Array.isArray(tenantsData.items)) {
          return tenantsData.items
        }
      }

      return []
    } catch (error) {
      console.error('Error fetching tenants:', error)
      return []
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    try {
      const response = await api.get<{ success: boolean; data: Tenant }>(`${this.baseUrl}/${id}`)

      if (response.data?.success) {
        return response.data.data
      }

      return null
    } catch (error) {
      console.error('Error fetching tenant:', error)
      return null
    }
  }

  /**
   * Create new tenant
   */
  async createTenant(tenantData: Partial<Tenant>): Promise<Tenant | null> {
    try {
      const response = await api.post<{ success: boolean; data: Tenant }>(`${this.baseUrl}`, tenantData)

      if (response.data?.success) {
        return response.data.data
      }

      return null
    } catch (error) {
      console.error('Error creating tenant:', error)
      return null
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, tenantData: Partial<Tenant>): Promise<Tenant | null> {
    try {
      const response = await api.put<{ success: boolean; data: Tenant }>(`${this.baseUrl}/${id}`, tenantData)

      if (response.data?.success) {
        return response.data.data
      }

      return null
    } catch (error) {
      console.error('Error updating tenant:', error)
      return null
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(): Promise<{
    totalTenants: number
    activeTenants: number
    inactiveTenants: number
    totalUsers: number
  } | null> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`${this.baseUrl}/stats`)

      if (response.data?.success) {
        return response.data.data
      }

      return null
    } catch (error) {
      console.error('Error fetching tenant stats:', error)
      return null
    }
  }
}

export const tenantService = new TenantService()
export default tenantService