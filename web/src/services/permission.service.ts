import api from '@/lib/api'
import { Permission } from '@/lib/rbac-utils'

export interface PermissionResponse {
  success: boolean
  message: string
  data: Permission
}

export interface PermissionsResponse {
  success: boolean
  message: string
  data: {
    items: Permission[]
    total: number
    page: number
    limit: number
  }
}

export interface GetPermissionsParams {
  tenantId?: string
  resource?: string
  action?: string
  scope?: 'OWN' | 'TENANT' | 'ALL'
  isSystemPermission?: boolean
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class PermissionService {
  private baseUrl = '/permissions'

  /**
   * Get all permissions
   */
  async getPermissions(params?: GetPermissionsParams): Promise<Permission[]> {
    try {
      const response = await api.get<PermissionsResponse>(`${this.baseUrl}`, {
        params
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching permissions:', error)
      return []
    }
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string): Promise<Permission | null> {
    try {
      const response = await api.get<PermissionResponse>(`${this.baseUrl}/${id}`)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error fetching permission:', error)
      return null
    }
  }

  /**
   * Create new permission
   */
  async createPermission(permissionData: Partial<Permission>): Promise<Permission | null> {
    try {
      const response = await api.post<PermissionResponse>(`${this.baseUrl}`, permissionData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error creating permission:', error)
      return null
    }
  }

  /**
   * Update permission
   */
  async updatePermission(id: string, permissionData: Partial<Permission>): Promise<Permission | null> {
    try {
      const response = await api.put<PermissionResponse>(`${this.baseUrl}/${id}`, permissionData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error updating permission:', error)
      return null
    }
  }

  /**
   * Delete permission
   */
  async deletePermission(id: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${id}`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error deleting permission:', error)
      return false
    }
  }

  /**
   * Get system permissions
   */
  async getSystemPermissions(): Promise<Permission[]> {
    try {
      const response = await api.get<PermissionsResponse>(`${this.baseUrl}/system`)

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching system permissions:', error)
      return []
    }
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    try {
      const response = await api.get<PermissionsResponse>(`${this.baseUrl}/category/${category}`)

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching permissions by category:', error)
      return []
    }
  }

  /**
   * Get permission categories
   */
  async getPermissionCategories(): Promise<Array<{ value: string; label: string }>> {
    try {
      const response = await api.get<{ success: boolean; data: Array<{ value: string; label: string }> }>(`${this.baseUrl}/categories`)

      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching permission categories:', error)
      return []
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${permissionId}/assign`, {
        roleId
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error assigning permission to role:', error)
      return false
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${permissionId}/assign`, {
        data: { roleId }
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error removing permission from role:', error)
      return false
    }
  }
}

export const permissionService = new PermissionService()
export default permissionService