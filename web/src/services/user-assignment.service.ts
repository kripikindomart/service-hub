import api from '@/lib/api'
import { UserAssignment } from '@/types'

export interface UserAssignmentResponse {
  success: boolean
  message: string
  data: UserAssignment
}

export interface UserAssignmentsResponse {
  success: boolean
  message: string
  data: {
    items: UserAssignment[]
    total: number
    page: number
    limit: number
  }
}

export interface GetUserAssignmentsParams {
  tenantId?: string
  userId?: string
  roleId?: string
  status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED'
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class UserAssignmentService {
  private baseUrl = '/user-assignments'

  /**
   * Get all user assignments
   */
  async getUserAssignments(params?: GetUserAssignmentsParams): Promise<UserAssignment[]> {
    try {
      const response = await api.get<UserAssignmentsResponse>(`${this.baseUrl}`, {
        params
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching user assignments:', error)
      return []
    }
  }

  /**
   * Get user assignment by ID
   */
  async getUserAssignmentById(id: string): Promise<UserAssignment | null> {
    try {
      const response = await api.get<UserAssignmentResponse>(`${this.baseUrl}/${id}`)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error fetching user assignment:', error)
      return null
    }
  }

  /**
   * Create new user assignment
   */
  async createUserAssignment(assignmentData: Partial<UserAssignment>): Promise<UserAssignment | null> {
    try {
      const response = await api.post<UserAssignmentResponse>(`${this.baseUrl}`, assignmentData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error creating user assignment:', error)
      return null
    }
  }

  /**
   * Update user assignment
   */
  async updateUserAssignment(id: string, assignmentData: Partial<UserAssignment>): Promise<UserAssignment | null> {
    try {
      const response = await api.put<UserAssignmentResponse>(`${this.baseUrl}/${id}`, assignmentData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error updating user assignment:', error)
      return null
    }
  }

  /**
   * Delete user assignment
   */
  async deleteUserAssignment(id: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${id}`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error deleting user assignment:', error)
      return false
    }
  }

  /**
   * Get user assignments by user ID
   */
  async getUserAssignmentsByUserId(userId: string, tenantId?: string): Promise<UserAssignment[]> {
    try {
      const response = await api.get<UserAssignmentsResponse>(`${this.baseUrl}/user/${userId}`, {
        params: { tenantId }
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching user assignments by user:', error)
      return []
    }
  }

  /**
   * Get user assignments by role ID
   */
  async getUserAssignmentsByRoleId(roleId: string, tenantId?: string): Promise<UserAssignment[]> {
    try {
      const response = await api.get<UserAssignmentsResponse>(`${this.baseUrl}/role/${roleId}`, {
        params: { tenantId }
      })

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching user assignments by role:', error)
      return []
    }
  }

  /**
   * Get user assignments by tenant ID
   */
  async getUserAssignmentsByTenantId(tenantId: string): Promise<UserAssignment[]> {
    try {
      const response = await api.get<UserAssignmentsResponse>(`${this.baseUrl}/tenant/${tenantId}`)

      if (response.data?.success) {
        return response.data.data?.items || []
      }
      return []
    } catch (error) {
      console.error('Error fetching user assignments by tenant:', error)
      return []
    }
  }

  /**
   * Activate user assignment
   */
  async activateUserAssignment(id: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/activate`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error activating user assignment:', error)
      return false
    }
  }

  /**
   * Deactivate user assignment
   */
  async deactivateUserAssignment(id: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/deactivate`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error deactivating user assignment:', error)
      return false
    }
  }

  /**
   * Suspend user assignment
   */
  async suspendUserAssignment(id: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/suspend`)

      return response.data?.success || false
    } catch (error) {
      console.error('Error suspending user assignment:', error)
      return false
    }
  }

  /**
   * Bulk assign users to role
   */
  async bulkAssignUsersToRole(userIds: string[], roleId: string, tenantId: string): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/bulk-assign`, {
        userIds,
        roleId,
        tenantId
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error bulk assigning users to role:', error)
      return false
    }
  }

  /**
   * Bulk remove user assignments
   */
  async bulkRemoveUserAssignments(assignmentIds: string[]): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/bulk-remove`, {
        assignmentIds
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error bulk removing user assignments:', error)
      return false
    }
  }
}

export const userAssignmentService = new UserAssignmentService()
export default userAssignmentService