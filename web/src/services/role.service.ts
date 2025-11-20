import api from '@/lib/api'
import { Role } from '@/types'

export interface RoleResponse {
  success: boolean
  message: string
  data: Role
}

export interface RolesResponse {
  success: boolean
  message: string
  data: {
    items: Role[]
    total: number
    page: number
    limit: number
  }
}

export interface GetRolesParams {
  tenantId?: string
  type?: 'SYSTEM' | 'TENANT' | 'CUSTOM'
  isActive?: boolean
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class RoleService {
  private baseUrl = '/roles'

  /**
   * Get all roles
   */
  async getRoles(params?: GetRolesParams): Promise<Role[]> {
    try {
      const response = await api.get<any>(`${this.baseUrl}`, {
        params
      })

      console.log('🔍 Raw API response:', response.data)

      if (response.data?.success) {
        const rolesData = response.data.data
        console.log('📦 Roles data extracted:', rolesData)

        // Handle both formats: data.items or data directly
        if (Array.isArray(rolesData)) {
          console.log('✅ Roles is array, count:', rolesData.length)
          return rolesData
        } else if (rolesData?.items && Array.isArray(rolesData.items)) {
          console.log('✅ Roles.items is array, count:', rolesData.items.length)
          return rolesData.items
        } else {
          console.log('❌ Invalid roles data format:', rolesData)
          return []
        }
      }
      console.log('❌ API response not successful')
      return []
    } catch (error) {
      console.error('❌ Error fetching roles:', error)
      return []
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<Role | null> {
    try {
      const response = await api.get<RoleResponse>(`${this.baseUrl}/${id}`)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error fetching role:', error)
      return null
    }
  }

  /**
   * Create new role
   */
  async createRole(roleData: Partial<Role>): Promise<Role | null> {
    try {
      const response = await api.post<RoleResponse>(`${this.baseUrl}`, roleData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error creating role:', error)
      return null
    }
  }

  /**
   * Update role
   */
  async updateRole(id: string, roleData: Partial<Role>): Promise<Role | null> {
    try {
      const response = await api.put<RoleResponse>(`${this.baseUrl}/${id}`, roleData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error updating role:', error)
      return null
    }
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${id}`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error deleting role:', error)
      return false
    }
  }

  /**
   * Get system roles (for system admin)
   */
  async getSystemRoles(): Promise<Role[]> {
    try {
      const response = await api.get<RolesResponse>(`${this.baseUrl}/system`)

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching system roles:', error)
      return []
    }
  }

  /**
   * Get tenant roles
   */
  async getTenantRoles(tenantId: string): Promise<Role[]> {
    try {
      const response = await api.get<RolesResponse>(`${this.baseUrl}/tenant/${tenantId}`)

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching tenant roles:', error)
      return []
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string, tenantId: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${roleId}/assign`, {
        userId,
        tenantId
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error assigning role to user:', error)
      return false
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string, tenantId: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${roleId}/assign`, {
        data: { userId, tenantId }
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error removing role from user:', error)
      return false
    }
  }

  /**
   * Get deleted roles (trash)
   */
  async getDeletedRoles(params?: {
    search?: string
    page?: number
    limit?: number
  }): Promise<Role[]> {
    try {
      const response = await api.get<any>(`${this.baseUrl}/trash`, {
        params
      })

      if (response.data?.success) {
        const rolesData = response.data.data
        if (Array.isArray(rolesData)) {
          return rolesData
        } else if (rolesData?.items && Array.isArray(rolesData.items)) {
          return rolesData.items
        }
      }
      return []
    } catch (error) {
      console.error('Error fetching deleted roles:', error)
      return []
    }
  }

  /**
   * Restore deleted role
   */
  async restoreRole(id: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/restore`)
      return response.data?.success || false
    } catch (error) {
      console.error('Error restoring role:', error)
      return false
    }
  }

  /**
   * Hard delete role (permanent deletion)
   */
  async hardDeleteRole(id: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${id}/hard`)
      return response.data?.success || false
    } catch (error) {
      console.error('Error permanently deleting role:', error)
      return false
    }
  }

  /**
   * Duplicate role
   */
  async duplicateRole(id: string, data: { displayName: string; name: string; description?: string }): Promise<Role | null> {
    try {
      const response = await api.post<{ success: boolean; data: Role }>(`${this.baseUrl}/${id}/duplicate`, data)
      return response.data?.data || null
    } catch (error) {
      console.error('Error duplicating role:', error)
      return null
    }
  }

  /**
   * Toggle role active status
   */
  async toggleRoleStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
      const response = await api.patch<{ success: boolean }>(`${this.baseUrl}/${id}/status`, { isActive })
      return response.data?.success || false
    } catch (error) {
      console.error('Error toggling role status:', error)
      return false
    }
  }

  /**
   * Update role UI settings (color, icon, priority)
   */
  async updateRoleUISettings(id: string, settings: {
    color?: string
    icon?: string
    priority?: number
  }): Promise<Role | null> {
    try {
      const response = await api.patch<{ success: boolean; data: Role }>(`${this.baseUrl}/${id}/ui-settings`, settings)
      return response.data?.data || null
    } catch (error) {
      console.error('Error updating role UI settings:', error)
      return null
    }
  }

  /**
   * Get role color palette for UI
   */
  getRoleColorPalette(): Record<string, string> {
    return {
      'SUPER_ADMIN': '#DC2626',  // Red
      'ADMIN': '#EA580C',        // Orange
      'MANAGER': '#16A34A',      // Green
      'USER': '#2563EB',         // Blue
      'GUEST': '#6B7280'         // Gray
    }
  }

  /**
   * Get role icon for UI
   */
  getRoleIcon(level: string): string {
    const icons = {
      'SUPER_ADMIN': 'shield',
      'ADMIN': 'crown',
      'MANAGER': 'briefcase',
      'USER': 'user',
      'GUEST': 'user-check'
    }
    return icons[level as keyof typeof icons] || 'circle'
  }
}

export const roleService = new RoleService()
export default roleService