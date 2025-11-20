import api from '@/lib/api'
import { RolePermission } from '@/lib/rbac-utils'

export interface RolePermissionResponse {
  success: boolean
  message: string
  data: RolePermission
}

export interface RolePermissionsResponse {
  success: boolean
  message: string
  data: {
    items: RolePermission[]
    total: number
    page: number
    limit: number
  }
}

export interface GetRolePermissionsParams {
  roleId?: string
  permissionId?: string
  tenantId?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class RolePermissionService {
  private baseUrl = '/role-permissions'

  /**
   * Get all role permissions
   */
  async getRolePermissions(params?: GetRolePermissionsParams): Promise<RolePermission[]> {
    try {
      const response = await api.get<RolePermissionsResponse>(`${this.baseUrl}`, {
        params
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching role permissions:', error)
      return []
    }
  }

  /**
   * Get role permission by ID
   */
  async getRolePermissionById(id: string): Promise<RolePermission | null> {
    try {
      const response = await api.get<RolePermissionResponse>(`${this.baseUrl}/${id}`)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error fetching role permission:', error)
      return null
    }
  }

  /**
   * Create new role permission assignment
   */
  async createRolePermission(assignmentData: Partial<RolePermission>): Promise<RolePermission | null> {
    try {
      const response = await api.post<RolePermissionResponse>(`${this.baseUrl}`, assignmentData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error creating role permission:', error)
      return null
    }
  }

  /**
   * Delete role permission assignment
   */
  async deleteRolePermission(id: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${id}`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error deleting role permission:', error)
      return false
    }
  }

  /**
   * Get permissions for a role
   */
  async getPermissionsByRole(roleId: string, tenantId?: string): Promise<RolePermission[]> {
    try {
      const response = await api.get<RolePermissionsResponse>(`${this.baseUrl}/role/${roleId}`, {
        params: { tenantId }
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching permissions by role:', error)
      return []
    }
  }

  /**
   * Get roles for a permission
   */
  async getRolesByPermission(permissionId: string, tenantId?: string): Promise<RolePermission[]> {
    try {
      const response = await api.get<RolePermissionsResponse>(`${this.baseUrl}/permission/${permissionId}`, {
        params: { tenantId }
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching roles by permission:', error)
      return []
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: string, permissionId: string, grantedBy?: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/assign`, {
        roleId,
        permissionId,
        grantedBy
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
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/remove`, {
        data: { roleId, permissionId }
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error removing permission from role:', error)
      return false
    }
  }

  /**
   * Check if role has permission
   */
  async checkRolePermission(roleId: string, permissionId: string, tenantId?: string): Promise<boolean> {
    try {
      const response = await api.get<{ success: boolean; data: boolean }>(`${this.baseUrl}/check`, {
        params: { roleId, permissionId, tenantId }
      })

      return response.data?.data || false
    } catch (error) {
      console.error('Error checking role permission:', error)
      return false
    }
  }

  /**
   * Bulk assign permissions to role
   */
  async bulkAssignPermissionsToRole(permissionIds: string[], roleId: string, grantedBy?: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/bulk-assign`, {
        permissionIds,
        roleId,
        grantedBy
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error bulk assigning permissions to role:', error)
      return false
    }
  }

  /**
   * Bulk remove permissions from role
   */
  async bulkRemovePermissionsFromRole(permissionIds: string[], roleId: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/bulk-remove`, {
        permissionIds,
        roleId
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error bulk removing permissions from role:', error)
      return false
    }
  }

  /**
   * Get role permissions with effective permissions (including inherited)
   */
  async getEffectiveRolePermissions(roleId: string, tenantId?: string): Promise<RolePermission[]> {
    try {
      const response = await api.get<RolePermissionsResponse>(`${this.baseUrl}/effective/${roleId}`, {
        params: { tenantId }
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching effective role permissions:', error)
      return []
    }
  }
}

export const rolePermissionService = new RolePermissionService()
export default rolePermissionService